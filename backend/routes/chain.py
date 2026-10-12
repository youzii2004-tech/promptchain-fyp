from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import networkx as nx

from services.dag_executor import execute_dag

router = APIRouter()

class ChainRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]

@router.post("/api/chain/run")
async def run_chain(request: ChainRequest):
    try:
        results = await execute_dag(request.nodes, request.edges)
        return {"results": results}
    except nx.NetworkXUnfeasible:
        raise HTTPException(status_code=400, detail="Graph has cycles")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
