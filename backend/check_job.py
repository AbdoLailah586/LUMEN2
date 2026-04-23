from app.core.database import SessionLocal
from app.models.job import Job

def main():
    with SessionLocal() as db:
        latest_job = db.query(Job).order_by(Job.created_at.desc()).first()
        if latest_job:
            print(f"Job ID: {latest_job.id}")
            print(f"Status: {latest_job.status}")
            print(f"Error: {latest_job.error_message}")
            print(f"Progress: {latest_job.progress}")
            print(f"Config: {latest_job.config}")
        else:
            print("No jobs found.")

if __name__ == "__main__":
    main()
