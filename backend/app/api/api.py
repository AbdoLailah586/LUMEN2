from fastapi import APIRouter, Depends
from app.api.endpoints import users, datasets, jobs, models, upload, cleaning, training, export, auth, ws, predict, payments, rl_endpoints, gnn_endpoints
from app.api.deps import get_current_user

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["Datasets"], dependencies=[Depends(get_current_user)])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"], dependencies=[Depends(get_current_user)])
api_router.include_router(models.router, prefix="/models", tags=["Models"], dependencies=[Depends(get_current_user)])
api_router.include_router(upload.router, prefix="/upload", tags=["Upload"], dependencies=[Depends(get_current_user)])
api_router.include_router(cleaning.router, prefix="/cleaning", tags=["Cleaning"], dependencies=[Depends(get_current_user)])
api_router.include_router(training.router, prefix="/training", tags=["Training"], dependencies=[Depends(get_current_user)])
api_router.include_router(export.router, prefix="/export", tags=["Export"], dependencies=[Depends(get_current_user)])
api_router.include_router(ws.router, prefix="/ws", tags=["WebSockets"])
api_router.include_router(predict.router, prefix="/predict", tags=["Inference"])
api_router.include_router(rl_endpoints.router, tags=["RL Agent"], dependencies=[Depends(get_current_user)])
api_router.include_router(gnn_endpoints.router, tags=["GNN Agent"], dependencies=[Depends(get_current_user)])
