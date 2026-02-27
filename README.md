# 🛡️ AI Social Engineering Risk Intelligence Platform

> **Cyber Risk Intelligence Command Center** — An enterprise-grade platform that analyzes public text and URLs to quantify phishing and social engineering risk, generate live attack simulations, and produce actionable mitigation plans.

![Platform](https://img.shields.io/badge/Status-Active-brightgreen) ![Python](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Python-blue) ![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black)

---

## 🌟 What It Does

Paste any public text (LinkedIn bio, social media post, news article) or a URL and the platform:

1. **Extracts entities** — names, organizations, locations, dates using NLP
2. **Calculates a Risk Score (0–100)** — calibrated across 5 risk vectors
3. **Generates Attack Simulations** — real phishing emails, SMS, LinkedIn InMails, and voice scripts tailored to the extracted data
4. **Produces a Mitigation Plan** — actionable security recommendations based on the specific risk vectors detected
5. **Shows Industry Context** — sector-specific threat intelligence

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend API** | Python, FastAPI, Uvicorn |
| **NLP** | spaCy (`en_core_web_sm`) |
| **AI / LLM** | OpenRouter API (Mistral-7B, LLaMA-3, Gemma via free tier) |
| **Web Scraping** | BeautifulSoup4 + Requests |
| **PDF Generation** | ReportLab |
| **Frontend** | Next.js 16, React, TypeScript |
| **Styling** | TailwindCSS, custom glassmorphism |
| **Charts** | Recharts (Radar, Area, Sparklines) |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- An [OpenRouter](https://openrouter.ai) account (free tier works)

---

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

---

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
.\venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy language model
python -m spacy download en_core_web_sm
```

#### Configure Environment Variables

```bash
# Copy the example env file
copy .env.example .env    # Windows
cp .env.example .env      # macOS/Linux
```

Open `backend/.env` and add your OpenRouter API key:
```
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

> 💡 Get your free key at [openrouter.ai](https://openrouter.ai). The platform works without a key too — it uses rule-based AI fallbacks automatically.

#### Start the Backend
```bash
uvicorn main:app --reload
# API will run at http://127.0.0.1:8000
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# App will run at http://localhost:3000
```

---

## 🎯 Usage — Test Cases

### High-Risk Text (Score: 80–95)
Paste this in the dashboard to see a full attack simulation:
```
Hi everyone! I'm Jennifer Walsh, new VP of Finance at Goldman Sachs in New York!
Currently staying at the Marriott Marquis while apartment hunting. My husband David
and kids are still in Austin, Texas — joining me after the school year ends.
Planning a family vacation to Dubai in August! Reach me at jennifer.walsh1982@gmail.com
```

### Low-Risk Text (Score: 0–10)
```
The weather today is nice. I went for a walk in the park and enjoyed the sunshine.
```

### URL Analysis
Paste any public URL (Wikipedia, LinkedIn public profiles, news articles):
```
https://en.wikipedia.org/wiki/Tim_Cook
```

---

## 📁 Project Structure

```
project_phishing/
├── backend/
│   ├── main.py              # FastAPI app — all agents, endpoints, NLP
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Template for environment variables
│   └── .env                 # Your secrets (git-ignored)
│
└── frontend/
    ├── app/
    │   ├── page.tsx          # Landing page
    │   ├── dashboard/
    │   │   └── page.tsx      # Main command center dashboard
    │   ├── layout.tsx
    │   └── globals.css
    ├── package.json
    └── next.config.ts
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/analyze` | Analyze raw text |
| `POST` | `/analyze-url` | Analyze content from a URL |
| `POST` | `/upload-csv` | Analyze data from a CSV file |
| `POST` | `/upload-pdf` | Analyze text extracted from a PDF |
| `POST` | `/generate-report` | Download a PDF risk report |

---

## ⚠️ Disclaimer

This tool is built for **defensive security awareness**, penetration testing demonstrations, and educational purposes only. All attack simulations are generated to help organizations understand and reduce their social engineering attack surface.

---

## 📄 License

MIT License — free to use, modify, and distribute.
