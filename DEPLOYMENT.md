# 🚀 ScriptTagger Complete Deployment Plan

This guide outlines the step-by-step deployment workflow for launching **ScriptTagger** (FastAPI backend + Vite React frontend) to production.

---

## 🎯 Architecture Overview

- **Frontend:** React + TailwindCSS (compiled into `frontend/dist`).
- **Backend:** FastAPI + PyTorch CPU + spaCy + Transformers + OpenAI Integration.
- **Unified Container:** The single multi-stage `Dockerfile` builds the frontend assets and serves both the API and static UI from port `7860` (or `8000`).

---

## Option 1: Free Cloud Deployment (Render / Hugging Face Spaces / Railway) — *RECOMMENDED*

Because the project includes a production-ready `Dockerfile`, this is the easiest deployment option.

### Method A: Render.com (Web Service)

1. **Connect Repository:**
   - Log in to [Render.com](https://render.com).
   - Click **New +** -> **Web Service**.
   - Connect your GitHub repository: `Shirish2103/AI_Metadata_Extractor`.

2. **Configure Settings:**
   - **Name:** `scripttagger`
   - **Environment:** `Docker`
   - **Region:** Choose nearest (e.g., Singapore / Oregon).
   - **Branch:** `main`
   - **Dockerfile Path:** `./Dockerfile`

3. **Set Environment Variables:**
   Add the following in Render's **Environment** tab:
   - `PYTHONUNBUFFERED`: `1`
   - `OPENAI_API_KEY`: *(Optional - your OpenAI API key for live GPT summaries)*
   - `PORT`: `7860`

4. **Deploy:**
   - Click **Create Web Service**. Render will automatically build the multi-stage Docker image and provide a live HTTPS URL (e.g., `https://scripttagger.onrender.com`).

---

### Method B: Hugging Face Spaces (Free Docker Hosting)

1. Create a new Space on [Hugging Face Spaces](https://huggingface.co/spaces).
2. Select **SDK:** `Docker`.
3. Push your repository code to Hugging Face or sync with GitHub Actions.
4. Set Secret `OPENAI_API_KEY` in Space Settings.
5. HF Spaces automatically builds `Dockerfile` and exposes port `7860`.

---

## Option 2: VPS / Cloud Instance Deployment (AWS EC2 / DigitalOcean / Hetzner)

If hosting on your own Linux virtual machine:

### 1. Initial Server Setup
```bash
# Update server and install Docker
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 git

# Enable Docker without sudo
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clone Repository & Launch
```bash
# Clone the repository
git clone https://github.com/Shirish2103/AI_Metadata_Extractor.git
cd AI_Metadata_Extractor

# Set environment variables (Optional OpenAI Key)
echo "OPENAI_API_KEY=your_key_here" > .env

# Build and run with Docker Compose
docker compose up -d --build
```

### 3. Verify Container Status
```bash
docker compose ps
docker compose logs -f
```
Your application will be live at `http://<YOUR_SERVER_IP>:8000`.

---

## Option 3: Split Deployment (Vercel Frontend + Render API)

If you prefer host separation:

### Backend (Render / Railway)
- Deploy FastAPI as Docker Web Service on Render/Railway.
- Note the public backend URL: `https://api-scripttagger.onrender.com`.

### Frontend (Vercel)
1. Import repository in [Vercel](https://vercel.com).
2. Set **Root Directory:** `frontend`
3. Set **Framework Preset:** `Vite`
4. Set **Build Command:** `npm run build`
5. Set **Output Directory:** `dist`
6. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://api-scripttagger.onrender.com`
7. Click **Deploy**.

---

## ✅ Post-Deployment Verification Checklist

| Test Item | Verification Step | Expected Outcome |
| :--- | :--- | :--- |
| **API Health** | Access `/api/health` | Returns `{ "status": "ok" }` |
| **Frontend UI** | Open live domain in browser | Header logo, search filter, and dropdown load cleanly |
| **Movie Dropdown** | Type query in search bar | Dynamic count matches & dropdown filters |
| **Analysis Pipeline** | Click *Analyze* on selected script | Stats cards, entity badges, and sentiment load |
| **AI Synopsis** | Toggle *LLM Synopsis* ON & Analyze | Complete 2-3 sentence AI Synopsis card renders |
