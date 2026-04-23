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

### 5. Production Deployment
To run the entire system in production mode (including Nginx and Monitoring):
```bash
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```


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