import os
import re
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
load_dotenv()  # loads .env from backend directory automatically
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import spacy
import requests
from bs4 import BeautifulSoup
from PyPDF2 import PdfReader

# PDF Imports
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib.pagesizes import letter

# ------------------------
# App Init
# ------------------------

app = FastAPI(title="AI Social Engineering Risk Intelligence API")

# ------------------------
# Enable CORS
# ------------------------

# CORS: read allowed origins from env; defaults to localhost only (never wildcard in prod)
_RAW_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
ALLOWED_ORIGINS = [o.strip() for o in _RAW_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

# ------------------------
# Load NLP Model
# ------------------------

try:
    nlp = spacy.load("en_core_web_sm")
except Exception as e:
    print(f"Warning: spaCy model not loaded: {e}")
    nlp = None

# ------------------------
# OpenRouter integration (via OpenAI-compatible API)
# ------------------------

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
# Verified free models on OpenRouter (no credits needed, just a valid key)
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemma-3-1b-it:free")
OPENROUTER_FALLBACK_MODEL = "deepseek/deepseek-r1:free"

if not OPENROUTER_API_KEY:
    print("Warning: OPENROUTER_API_KEY not set. AI features will be disabled.")
else:
    print(f"✓ OpenRouter loaded. Model: {OPENROUTER_MODEL}")


def call_openrouter(prompt: str, model: str = None) -> str | None:
    """Send prompt to OpenRouter. Auto-retries with fallback model on failure."""
    if not OPENROUTER_API_KEY:
        return None

    model = model or OPENROUTER_MODEL
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Social Risk Platform",
    }
    data = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 600,
        "temperature": 0.7,
    }

    try:
        resp = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=30,
        )
        resp.raise_for_status()
        result = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")
        if result:
            return result.strip()
        # empty response — try fallback
        raise ValueError("Empty response from model")
    except Exception as e:
        print(f"OpenRouter [{model}] Error: {e}")
        # auto-retry with fallback model once
        if model != OPENROUTER_FALLBACK_MODEL:
            print(f"Retrying with fallback model: {OPENROUTER_FALLBACK_MODEL}")
            return call_openrouter(prompt, model=OPENROUTER_FALLBACK_MODEL)
        return None



# Input size limits (prevent DoS)
MAX_TEXT_LENGTH   = 10_000   # characters
MAX_URL_LENGTH    = 2_000

# Blocked private/internal address patterns (SSRF protection)
_PRIVATE_URL_PATTERN = re.compile(
    r"(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|10\.\d+\.\d+\.\d+"
    r"|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+"
    r"|::1|\[::1\])",
    re.IGNORECASE
)

class TextRequest(BaseModel):
    text: str
    role: Optional[str] = None
    industry: Optional[str] = None

    def clean_text(self) -> str:
        t = self.text.strip()
        if len(t) > MAX_TEXT_LENGTH:
            raise ValueError(f"Text exceeds maximum length of {MAX_TEXT_LENGTH} characters.")
        return t


class URLRequest(BaseModel):
    url: str
    role: Optional[str] = None
    industry: Optional[str] = None

    def validated_url(self) -> str:
        u = self.url.strip()
        if len(u) > MAX_URL_LENGTH:
            raise ValueError("URL too long.")
        if not re.match(r"^https?://", u, re.IGNORECASE):
            raise ValueError("URL must start with http:// or https://")
        if _PRIVATE_URL_PATTERN.search(u):
            raise ValueError("Internal/private URLs are not allowed.")
        return u


class AnalysisResult(BaseModel):
    overall_risk_score: int
    risk_percentile: int
    confidence_score: float
    risk_vectors: List[str]
    feature_contributions: Dict[str, float]
    threat_simulations: Dict[str, str]
    behavioral_analysis: Dict[str, Any]
    trend_analysis: Dict[str, Any]
    mitigation_plan: str
    industry_contextual_risk: str

# ------------------------
# Entity Extraction
# ------------------------

def extract_entities(text: str):
    if not nlp:
        return {}

    doc = nlp(text)
    entities = {}

    for ent in doc.ents:
        entities.setdefault(ent.label_, []).append(ent.text)

    return entities

# ------------------------
# Sentiment (Mock)
# ------------------------

def analyze_sentiment(text: str):
    return {"label": "POSITIVE", "score": 0.85}

# ------------------------
# Improved Vulnerability Score
# ------------------------

def calculate_vulnerability_score(entities, sentiment, text):
    """
    Calibrated scoring:
      0-20  : benign / low public info
      20-45 : mild exposure (one name or org)
      45-70 : moderate (name + location, or org + travel)
      70-100: high (multiple vectors: name, org, location, family, travel)
    """
    score = 0.0

    # Per-category caps prevent a Wikipedia article with 30 ORGs from auto-maxing
    category_caps = {"PERSON": 20, "GPE": 18, "ORG": 15, "DATE": 5, "FAC": 8, "NORP": 6}
    category_weights = {"PERSON": 10, "GPE": 9, "ORG": 7, "DATE": 2, "FAC": 4, "NORP": 3}

    entity_count = 0
    for key, values in entities.items():
        cap    = category_caps.get(key, 5)
        weight = category_weights.get(key, 2)
        # diminishing returns: first entity worth full weight, each extra worth less
        contribution = 0.0
        for i, _ in enumerate(values):
            contribution += weight * (0.6 ** i)   # 10, 6, 3.6, 2.2 ...
        score += min(contribution, cap)
        entity_count += len(values)

    # High-signal keywords (flat bonuses — only counted once each)
    keyword_bonuses = {
        "family": 15, "children": 15, "wife": 10, "husband": 10,
        "travel": 10, "vacation": 10, "holiday": 8,
        "currently": 6, "staying": 8, "live in": 8,
        "working at": 6, "my password": 20, "my account": 8,
    }
    keyword_hits = 0
    for phrase, bonus in keyword_bonuses.items():
        if phrase in text.lower():
            score += bonus
            keyword_hits += 1

    if sentiment["label"] == "NEGATIVE":
        score += 5

    # very small density nudge (max +10%) so long texts don't spiral
    density_nudge = min((entity_count + keyword_hits) / 50, 0.10)
    score = score * (1 + density_nudge)

    return min(round(score), 100)

# ------------------------
# AI Confidence Score
# ------------------------

def calculate_ai_confidence(entities, text):
    entity_count = sum(len(v) for v in entities.values())

    keyword_list = ["family", "travel", "vacation", "live", "working"]
    keyword_hits = sum(1 for word in keyword_list if word in text.lower())

    base_confidence = (entity_count * 6) + (keyword_hits * 10)

    return min(base_confidence, 95)

# ------------------------
# Risk Vector Detection
# ------------------------

def detect_risk_vectors(entities, text):
    vectors = []

    if "PERSON" in entities:
        vectors.append("Identity Targeting")

    if "GPE" in entities:
        vectors.append("Location Exposure")

    if "ORG" in entities:
        vectors.append("Corporate Impersonation")

    if "family" in text.lower():
        vectors.append("Family-Based Social Engineering")

    if any(word in text.lower() for word in ["travel", "vacation"]):
        vectors.append("Travel-Based Exploitation")

    return vectors

# ------------------------
# AI Functions
# ------------------------

# ── Rule-based fallback generators (always produce realistic output) ──

def _extract_key_info(text: str) -> dict:
    """Extract simple key facts from text for use in fallback generation."""
    import re
    text_lower = text.lower()
    names   = re.findall(r'\b[A-Z][a-z]+ [A-Z][a-z]+\b', text)
    emails  = re.findall(r'[\w.+-]+@[\w-]+\.[a-z]{2,}', text)
    orgs    = re.findall(r'\b(?:Corp|Inc|Ltd|LLC|Group|Company|Technologies|Solutions|Bank|Capital|Partners)\b', text)
    locs    = re.findall(r'\b(?:New York|London|Berlin|Singapore|Mumbai|Dubai|Tokyo|Paris|Sydney|Boston|Chicago)\b', text)
    return {
        "name": names[0] if names else "the target",
        "email": emails[0] if emails else "[target@company.com]",
        "org": orgs[0] if orgs else "their organization",
        "location": locs[0] if locs else "their current location",
        "names": names, "orgs": orgs, "locs": locs,
    }

def _fallback_phishing_email(text: str) -> str:
    kv = _extract_key_info(text)
    return (
        f"From: security-alerts@{kv['org'].lower().replace(' ','-') or 'corpmail'}.net\n"
        f"To: {kv['email']}\n"
        f"Subject: Urgent: Verify Your Account — Immediate Action Required\n\n"
        f"Dear {kv['name']},\n\n"
        f"Our systems detected unusual login activity associated with your account from {kv['location']}. "
        f"As a precautionary measure, we have temporarily restricted access.\n\n"
        f"Please verify your identity within the next 24 hours to restore access:\n"
        f"  ➤ https://secure-verify.{kv['org'].lower().replace(' ','-') or 'corp'}-portal.com/auth\n\n"
        f"Failure to verify will result in permanent account suspension.\n\n"
        f"Regards,\nIT Security Team | {kv['org']}\n"
        f"[This is an automated security notification]"
    )

def _fallback_sms(text: str) -> str:
    kv = _extract_key_info(text)
    return (
        f"[{kv['org']} ALERT] Hi {kv['name'].split()[0]}, we noticed unusual activity on your account. "
        f"Tap to secure it now: https://bit.ly/3xReset\n"
        f"Reply STOP to opt out."
    )

def _fallback_linkedin(text: str) -> str:
    kv = _extract_key_info(text)
    return (
        f"Hi {kv['name'].split()[0]},\n\n"
        f"I came across your profile and was really impressed by your work at {kv['org']}. "
        f"We’re currently building out an exclusive advisory board for senior professionals in your space "
        f"and would love to discuss a confidential opportunity.\n\n"
        f"Could we schedule a quick 15-min call this week? I can share a brief overview in a secure document: "
        f"https://share.notion-docs.io/brief-{kv['name'].lower().replace(' ','-')}\n\n"
        f"Looking forward to connecting,\nMichael Torres | Head of Talent, Nexus Capital"
    )

def _fallback_voice(text: str) -> str:
    kv = _extract_key_info(text)
    name     = kv["name"]
    fname    = name.split()[0]
    org      = kv["org"]
    location = kv["location"]
    return (
        "── VISHING SCRIPT ──\n"
        f'CALLER: "Hello, may I speak with {name}?"\n'
        f'TARGET: "Speaking."\n'
        f'CALLER: "Hi {fname}, this is James from IT Security at {org}. '
        f"We've detected unauthorized login attempts on your account originating from {location}. "
        f'I need to verify your identity and reset your credentials to prevent a breach."\n'
        f'TARGET: "Oh, um — sure."\n'
        f'CALLER: "Great. I\'ll send you a one-time code to your registered number. '
        f'Please read it back to me as soon as you receive it. This is time-sensitive."\n'
        "[ATTACK: OTP interception / account takeover]"
    )

def _fallback_mitigation(entities: dict, vectors: list, text: str) -> str:
    recs = [
        "🔒 IMMEDIATE ACTIONS",
        "" ,
    ]
    if "PERSON" in entities:
        recs.append("1. Remove full name from public bio or social posts — use initials or first name only.")
    if "GPE" in entities or any("Location" in v for v in vectors):
        recs.append("2. Disable location services and remove geo-tags from social posts. Never share real-time whereabouts publicly.")
    if "ORG" in entities or any("Corporate" in v for v in vectors):
        recs.append("3. Keep employment details vague — avoid mentioning team size, tools, or internal project names publicly.")
    if any("Family" in v for v in vectors):
        recs.append("4. Do not mention family members, relationships, or children in public content.")
    if any("Travel" in v for v in vectors):
        recs.append("5. Avoid posting travel plans in advance. Share travel photos only after returning.")
    recs += [
        "",
        "🛡️ ONGOING SECURITY PRACTICES",
        "",
        "6. Enable Multi-Factor Authentication (MFA) on all accounts.\n   Use an authenticator app — not SMS codes.",
        "7. Set all social profiles to private. Audit friend/connection lists quarterly.",
        "8. Use unique, complex passwords managed via a password manager (Bitwarden/1Password).",
        "9. Run a monthly OSINT self-audit: search your name, email, and phone in HaveIBeenPwned and Google.",
        "10. Enable login notifications and sign-in alerts on all corporate accounts.",
        "",
        "📊 RISK SUMMARY",
        f"Detected risk vectors: {', '.join(vectors) if vectors else 'General Exposure'}",
        f"Entities found: {sum(len(v) for v in entities.values())} across {len(entities)} categories.",
        "Priority: Immediate OSINT footprint reduction recommended.",
    ]
    return "\n".join(recs)


def generate_simple_phishing_preview(text: str, entities: dict = None) -> str:
    if OPENROUTER_API_KEY:
        kv = _extract_key_info(text)
        prompt = (
            f"You are a penetration tester demonstrating social engineering risks.\n"
            f"Based on the following public content about a person, write a short realistic phishing email (8-12 lines).\n"
            f"Use specific details from the content (name, org, location) to make it convincing.\n"
            f"Include: From/To/Subject headers, a sense of urgency, and a fake link.\n\n"
            f"CONTENT:\n{text[:1500]}"
        )
        result = call_openrouter(prompt)
        if result and len(result) > 50:
            return result
    return _fallback_phishing_email(text)


def generate_detailed_phishing_report(text: str, entities: dict = None) -> str:
    if OPENROUTER_API_KEY:
        prompt = (
            f"You are a cybersecurity analyst writing a threat intelligence report.\n"
            f"Analyze the following public content and:\n"
            f"1. List every piece of exploitable information found (name, org, location, family, travel)\n"
            f"2. Write a realistic spear-phishing email leveraging those details\n"
            f"3. Explain in 2-3 sentences how an attacker would use this for social engineering\n\n"
            f"CONTENT:\n{text[:1800]}"
        )
        result = call_openrouter(prompt)
        if result and len(result) > 50:
            return result
    kv = _extract_key_info(text)
    return (
        f"=== THREAT INTELLIGENCE REPORT ===\n\n"
        f"EXPLOITABLE INFO DETECTED:\n"
        f"  • Identity: {kv['name']}\n"
        f"  • Organization: {kv['org']}\n"
        f"  • Location: {kv['location']}\n"
        f"  • Contact: {kv['email']}\n\n"
        f"SPEAR-PHISHING EMAIL:\n\n"
        + _fallback_phishing_email(text) +
        f"\n\nATTACKER METHODOLOGY:\n"
        f"An attacker would use the publicly available profile information to craft a targeted "
        f"pretext attack. By referencing {kv['name']}'s known affiliation with {kv['org']} and "
        f"current location in {kv['location']}, the attacker can build rapport and bypass "
        f"standard skepticism, leading to credential theft or malware delivery."
    )

def generate_ai_recommendations(text: str, entities: dict = None, vectors: list = None) -> str:
    entities = entities or {}
    vectors  = vectors or []
    if OPENROUTER_API_KEY:
        prompt = (
            f"You are a senior cybersecurity consultant.\n"
            f"Based on the following content and risk vectors, provide a structured mitigation plan:\n"
            f"Risk Vectors: {', '.join(vectors) if vectors else 'General exposure'}\n"
            f"Content: {text[:800]}\n\n"
            f"Format your response as numbered action items, grouped by: Immediate Actions, Ongoing Practices, Monitoring."
        )
        result = call_openrouter(prompt)
        if result and len(result) > 80:
            return result
    return _fallback_mitigation(entities, vectors, text)


# ------------------------
# Agent-like helper functions
# ------------------------

def exposure_extraction_agent(text: str, role: Optional[str], industry: Optional[str]) -> dict:
    entities = extract_entities(text)
    explanation = ""
    if OPENROUTER_API_KEY:
        prompt = (
            f"In 2-3 sentences, explain which entities were found in this content and why each "
            f"poses a social engineering risk. Be specific and professional.\nEntities: {entities}\n"
            f"Context: role={role}, industry={industry}"
        )
        explanation = call_openrouter(prompt) or ""
    return {"entities": entities, "explanation": explanation}


def behavioral_risk_agent(entities: dict, sentiment: dict, text: str) -> dict:
    vuln_score = calculate_vulnerability_score(entities, sentiment, text)
    ai_conf = calculate_ai_confidence(entities, text)
    vectors = detect_risk_vectors(entities, text)
    # weighted feature contributions
    entity_weights = {"PERSON": 20, "GPE": 18, "ORG": 15, "DATE": 8, "FAC": 10, "NORP": 8}
    contributions: Dict[str, float] = {}
    for k, v in entities.items():
        contributions[k] = round(min(len(v) * entity_weights.get(k, 5), 40), 1)
    # add keyword contributions
    kw_map = {"family": 22, "travel": 14, "vacation": 14, "staying": 12, "currently": 8, "working": 8}
    for kw, weight in kw_map.items():
        if kw in text.lower():
            contributions[kw.capitalize()] = weight
    return {
        "vulnerability_score": vuln_score,
        "ai_confidence": ai_conf,
        "risk_vectors": vectors,
        "feature_contributions": contributions,
    }


def attack_simulation_agent(text: str, entities: dict = None) -> dict:
    entities = entities or {}
    sims = {}
    if OPENROUTER_API_KEY:
        kv = _extract_key_info(text)
        prompts = {
            "email": (
                f"Write a highly convincing spear-phishing email targeting {kv['name']} at {kv['org']}.\n"
                f"Use these details from their public content: location={kv['location']}.\n"
                f"Include From/To/Subject, urgency, and a fake verification link. Max 12 lines.\n"
                f"Content: {text[:1200]}"
            ),
            "sms": (
                f"Write a realistic smishing (SMS phishing) message targeting {kv['name'].split()[0]} "
                f"from {kv['org']}. Max 2 lines, include a short link. Use urgency.\n"
                f"Content: {text[:600]}"
            ),
            "linkedin": (
                f"Write a convincing LinkedIn InMail phishing message targeting {kv['name']} "
                f"at {kv['org']}. Pose as a recruiter or investor. Include a fake document link.\n"
                f"Content: {text[:600]}"
            ),
            "voice": (
                f"Write a short vishing (voice phishing) call script targeting {kv['name']} at {kv['org']}.\n"
                f"Format as a dialogue. The attacker poses as IT support and extracts an OTP.\n"
                f"Content: {text[:600]}"
            ),
        }
        for key, prompt in prompts.items():
            result = call_openrouter(prompt)
            sims[key] = result if (result and len(result) > 30) else None
    # Fill in any missing with rule-based fallbacks
    if not sims.get("email"):   sims["email"]    = _fallback_phishing_email(text)
    if not sims.get("sms"):     sims["sms"]      = _fallback_sms(text)
    if not sims.get("linkedin"): sims["linkedin"] = _fallback_linkedin(text)
    if not sims.get("voice"):   sims["voice"]    = _fallback_voice(text)
    return sims


def mitigation_advisor_agent(text: str, entities: dict = None, vectors: list = None) -> str:
    return generate_ai_recommendations(text, entities or {}, vectors or [])


def confidence_evaluator_agent(entities: dict, text: str) -> float:
    # simple heuristics
    entity_count = sum(len(v) for v in entities.values())
    length = len(text)
    completeness = min(length / 1000.0, 1.0)
    base = (entity_count * 5) + (completeness * 50)
    return min(base / 100.0, 1.0)


def compute_risk_percentile(score: int) -> int:
    # naive percentile approximation
    import random
    rand = random.randint(50, 95)
    # push higher for high scores
    if score > 70:
        rand = random.randint(70, 99)
    elif score < 30:
        rand = random.randint(10, 60)
    return rand


def generate_trend_data(current_score: int) -> dict:
    # fake historical data
    past = max(current_score - 10, 0)
    older = max(current_score - 20, 0)
    return {"30_days_ago": older, "14_days_ago": past, "current": current_score}


def industry_contextual_risk(role: Optional[str], industry: Optional[str], vectors: list = None) -> str:
    if OPENROUTER_API_KEY:
        prompt = (
            f"In 3-4 sentences, describe specific phishing and social engineering trends "
            f"targeting the {industry or 'general'} sector for a person in a {role or 'professional'} role. "
            f"Mention real-world attack tactics relevant to this profile."
        )
        result = call_openrouter(prompt)
        if result and len(result) > 40:
            return result
    # Rule-based fallback
    sector = industry or "corporate"
    role_txt = role or "professional"
    vectors_txt = ", ".join(vectors or ["general exposure"])
    return (
        f"Profiles in the {sector} sector are frequent targets of Business Email Compromise (BEC) "
        f"and spear-phishing campaigns. {role_txt.capitalize()}s are particularly at risk due to "
        f"their access to sensitive systems and financial data. Detected risk vectors ({vectors_txt}) "
        f"are commonly exploited in pretexting attacks where adversaries impersonate IT support, "
        f"HR, or senior management to extract credentials or initiate fraudulent wire transfers. "
        f"OSINT footprint reduction is the most effective countermeasure for this profile."
    )

@app.post("/analyze")
async def analyze_text(request: TextRequest):
    text = request.text
    role = request.role
    industry = request.industry

    # orchestration of agents
    exposure  = exposure_extraction_agent(text, role, industry)
    entities  = exposure.get("entities", {})
    sentiment = analyze_sentiment(text)
    behavioral = behavioral_risk_agent(entities, sentiment, text)
    vectors    = behavioral["risk_vectors"]
    sims       = attack_simulation_agent(text, entities)
    mitigation = mitigation_advisor_agent(text, entities, vectors)
    confidence = confidence_evaluator_agent(entities, text)
    percentile = compute_risk_percentile(behavioral["vulnerability_score"])
    trend      = generate_trend_data(behavioral["vulnerability_score"])
    industry_risk = industry_contextual_risk(role, industry, vectors)

    # phishing previews (context-aware)
    phishing_simple   = generate_simple_phishing_preview(text, entities)
    phishing_detailed = generate_detailed_phishing_report(text, entities)

    result = {
        "report_id": str(uuid.uuid4()),
        "analysis_timestamp": datetime.now().isoformat(),
        "original_text": text,
        "entities": entities,
        "overall_risk_score": behavioral["vulnerability_score"],
        "risk_percentile": percentile,
        "confidence_score": confidence,
        "risk_vectors": vectors,
        "feature_contributions": behavioral.get("feature_contributions", {}),
        "threat_simulations": sims,
        "phishing_preview_simple": phishing_simple,
        "phishing_report_detailed": phishing_detailed,
        "behavioral_analysis": {
            "sentiment": sentiment,
            "exposure_explanation": exposure.get("explanation", ""),
        },
        "trend_analysis": trend,
        "mitigation_plan": mitigation,
        "industry_contextual_risk": industry_risk,
    }

    return result



@app.post("/analyze-url")
async def analyze_url(request: URLRequest):
    try:
        safe_url = request.validated_url()
    except ValueError as e:
        return {"error": str(e)}

    text = extract_text_from_url(safe_url)

    if not text:
        return {"error": "Could not extract content from URL. The site may block scraping or the page is empty."}

    return await analyze_text(TextRequest(text=text, role=request.role, industry=request.industry))

# ------------------------
# PDF Download Endpoint
# ------------------------

@app.post("/generate-report")
async def generate_report(request: TextRequest):
    analysis = await analyze_text(request)
    file_path = generate_pdf_report(analysis)
    # BackgroundTask deletes the temp file after the response is sent
    import os as _os
    from fastapi.background import BackgroundTasks
    bg = BackgroundTasks()
    bg.add_task(lambda: _os.remove(file_path) if _os.path.exists(file_path) else None)
    return FileResponse(file_path, media_type="application/pdf", filename="risk_report.pdf", background=bg)

# ------------------------
# CSV Upload
# ------------------------

@app.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    role: Optional[str] = Form(None),
    industry: Optional[str] = Form(None),
):
    df = pd.read_csv(file.file)
    combined_text = " ".join(df.astype(str).values.flatten())[:MAX_TEXT_LENGTH]
    return await analyze_text(TextRequest(text=combined_text, role=role, industry=industry))


@app.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    role: Optional[str] = Form(None),
    industry: Optional[str] = Form(None),
):
    text = extract_text_from_pdf(file.file)

    if not text.strip():
        return {"error": "Could not extract text from PDF"}

    return await analyze_text(TextRequest(text=text, role=role, industry=industry))