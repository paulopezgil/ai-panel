from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.routers import models, server
from app.services.process_manager import process_manager


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    process_manager.cleanup()


app = FastAPI(title="AI Panel API", lifespan=lifespan)

app.include_router(models.router)
app.include_router(server.router)
