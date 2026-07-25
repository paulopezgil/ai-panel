from fastapi import FastAPI

from app.routers import models


app = FastAPI(title="AI Panel API")

app.include_router(models.router)
