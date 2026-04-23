from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.model import Model as DbModel
from app.services.export.code_exporter import CodeExporter
from app.services.export.report_generator import ReportGenerator

router = APIRouter()

@router.get("/{model_id}/code")
async def export_python_code(model_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DbModel).filter(DbModel.id == model_id))
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
        
    code = CodeExporter.export_pipeline(model)
    return {"code": code}

@router.get("/{model_id}/report")
async def export_pdf_report(model_id: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import selectinload
    result = await db.execute(select(DbModel).options(selectinload(DbModel.job)).filter(DbModel.id == model_id))
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
        
    report = ReportGenerator.generate(model)
    return {"report": report}
