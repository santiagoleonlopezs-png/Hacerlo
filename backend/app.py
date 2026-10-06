from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="HACERLO Computational Engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://santiagoleonlopezs-png.github.io"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "service": "HACERLO Computational Engine",
        "status": "online"
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "engine": "HACERLO",
        "networkx": "pending",
        "mesa": "pending",
        "pysd": "pending"
    }
