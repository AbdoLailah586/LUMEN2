# 🚀 LUMEN: Complete AutoML Platform

## Project Overview
LUMEN (Learning Unified Machine learning for Enhanced aNalytics) is an enterprise-scale, web-based AutoML platform. It accepts data files in multiple formats and automatically performs complete data cleaning, predictive type-inference, hybrid in-memory/distributed dataset processing, model training, and scalable deployment.

## Features
- **Universal Format Support:** CSV, Excel, JSON, XML, SQLite, Parquet.
- **Smart Data Inference Engine:** Automatic semantic detection dropping hard-coded domain restrictions.
- **Hybrid Distributed Computing:** Uses Pandas for fast in-core operations, seamlessly upgrading to `Dask` distributed dataframes for datasets >500MB without crashing logic.
- **Cloud Native Storage Integration:** Interface logic bridging local rapid prototyping to S3 multi-bucket streaming ingestion.
- **Progressive AutoML & Ensembles:** Multi-Backend Model Trainer featuring XGBoost, LightGBM, scikit-learn logic encapsulated under Optuna hyperparameter tracking.
- **Security & Multi-Tenancy:** Hardened API incorporating strict JSON Web Token (JWT) tracking, Row-level isolation bindings, SlowAPI Redis rate-limiting, and `libmagic` payload intrusion detections.

## System Architecture
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL, Celery, Redis Dask
- **Frontend:** React, Vite, TypeScript, TailwindCSS
- **ML Stack:** Scikit-learn, XGBoost, Optuna, MLflow, SHAP
- **DevOps:** Kubernetes Manifests (HPA scaling), Prometheus & Grafana Monitoring, Multi-Stage secure non-root Docker deployments.

---

## Installation & Setup

### 1. Environment Configuration
Copy the example environment file and update the values:
```bash
cp .env.example .env
```
> [!IMPORTANT]
> If running the backend locally (outside Docker), set `DATABASE_URL=postgresql+asyncpg://lumen_user:lumen_password@localhost:5432/lumen`.
> If running entirely via Docker Compose, use `postgres:5432` as the host.

### 2. Infrastructure (PostgreSQL & Redis)
The easiest way to run the database and redis is via Docker Compose:
```bash
# Start only the database and redis
docker-compose up -d postgres redis
```

### 3. Backend Setup
```bash
cd backend

# 1. Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# 2. Install dependencies
pip install -r requirements.txt

# 3. Apply database migrations
alembic upgrade head

# 4. Run the FastAPI server
uvicorn app.main:app --reload

# 5. Start Celery Worker (required for ML tasks)
# On Windows:
celery -A app.core.celery_app worker --loglevel=info -P solo -Q celery,ml
```

### 4. Frontend Setup
```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev
```

### 5. Production Deployment (Local Docker)
To run the entire system in production mode (including Nginx and Monitoring):
```bash
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

---

## ☁️ Free Cloud Deployment (Demo / Portfolio)

This setup deploys LUMEN for free using **Render** (Backend + Celery) + **Vercel** (Frontend) + **Neon** (PostgreSQL) + **Upstash** (Redis).

### Prerequisites
- GitHub account with this repo pushed
- Accounts on: [render.com](https://render.com), [vercel.com](https://vercel.com), [neon.tech](https://neon.tech), [upstash.com](https://upstash.com)

### Step 1 — PostgreSQL on Neon
1. Sign up at [neon.tech](https://neon.tech) → Create a new project → name it `lumen`.
2. Copy the **Connection String** (format: `postgresql://user:pass@host/lumen?sslmode=require`).
3. Convert it for SQLAlchemy async: replace `postgresql://` → `postgresql+asyncpg://`.

### Step 2 — Redis on Upstash
1. Sign up at [upstash.com](https://upstash.com) → Create a Redis database → choose the free plan.
2. Copy the **Redis URL** (format: `rediss://default:password@host:port`).

### Step 3 — Backend on Render
1. Go to [render.com](https://render.com) → **New → Blueprint** → connect your GitHub repo.
2. Render will detect `render.yaml` and create both `lumen-api` (Web Service) and `lumen-celery-worker` (Background Worker) automatically.
3. In the Render dashboard, set the following **secret environment variables** for both services:
   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `postgresql+asyncpg://...` from Neon |
   | `REDIS_URL` | `rediss://...` from Upstash |
   | `GEMINI_API_KEY` | Your Google AI Studio key (optional) |
4. Note the backend URL: `https://lumen-api.onrender.com` (you'll need it in Step 4).

### Step 4 — Frontend on Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import from GitHub.
2. Set **Root Directory** to `frontend`.
3. Add environment variable:
   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://lumen-api.onrender.com` |
4. Click **Deploy**. Note your Vercel URL: `https://lumen2.vercel.app`.

### Step 5 — Link Frontend URL to Backend CORS
Back in Render, set this env var on `lumen-api`:
| Variable | Value |
|---|---|
| `FRONTEND_URL` | `https://lumen2.vercel.app` |

Render will auto-redeploy and CORS will be configured correctly.

### CI/CD (Auto Deploy on Push)
Add these secrets to **GitHub → Settings → Secrets → Actions**:
| Secret | Where to get it |
|---|---|
| `RENDER_DEPLOY_HOOK_URL` | Render → Service → Settings → Deploy Hook |
| `VERCEL_TOKEN` | vercel.com → Settings → Tokens |
| `VERCEL_ORG_ID` | `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` after `vercel link` |

Every push to `main` will now lint, test, and auto-deploy both services.

> **Note:** Heavy ML features (PyTorch, Transformers, Dask, Ultralytics) are disabled in the demo build
> to keep the Docker image under 600 MB. To re-enable them for production, uncomment the relevant
> lines in `backend/requirements.txt`.

---

## How to Test

### 1. Verification of the Universal Engine
Upload any arbitrary large dataset (e.g., `Iris`, `Housing Prices`, `Wine Quality`). You no longer need to fear Titanic-specific column crashes. The pipeline will:
- Auto-detect numeric and cardinal distributions.
- Drop high-unique values.
- Impute with medians/modes automatically.

### 2. Verify Security 
- Try hitting `/api/upload` from tools like Postman without sending an Authorization token. You should be hit with a `401 Unauthorized`.
- Send an arbitrary `.exe` disguised as `.csv`. It will securely bounce back via Payload validation.

## Access Points
- **Frontend UI**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **Celery Flower Dashboard**: http://localhost:5555
- **Grafana Metrics**: http://localhost:3000