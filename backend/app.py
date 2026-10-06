from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from engine import analyze_network

app = FastAPI(title="HACERLO Computational Engine", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://santiagoleonlopezs-png.github.io"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class NetworkRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    mode: str = "layer"
    relation_filter: Optional[str] = None

@app.get("/")
def root():
    return {"service":"HACERLO Computational Engine","status":"online","version":"1.1.0"}

@app.get("/api/health")
def health():
    return {"status":"ok","engine":"HACERLO","networkx":"ready-v1.1","mesa":"pending","pysd":"pending"}

@app.post("/api/network/analyze")
def network_analysis(payload: NetworkRequest):
    return analyze_network(
        nodes=payload.nodes,
        edges=payload.edges,
        mode=payload.mode,
        relation_filter=payload.relation_filter
    )

