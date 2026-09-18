from fastapi import FastAPI, UploadFile, File
from backend.risk.feature_engineering import build_feature_table
from backend.risk.predictor import RiskPredictor
import zipfile
import tempfile
import os

from backend.parser import analyze_repository
from backend.graph import build_graph, graph_to_json
from backend.rag.pipeline import CodeAtlasRAG
from pydantic import BaseModel


app = FastAPI(title="CodeAtlas API")

current_graph = None
current_analysis = None
current_rag = None
risk_predictor = RiskPredictor()


@app.get("/")
def root():
    return {"message": "CodeAtlas backend is running"}


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)):
    global current_graph, current_analysis, current_rag

    with tempfile.TemporaryDirectory() as temp_dir:
        zip_path = os.path.join(temp_dir, file.filename)

        with open(zip_path, "wb") as f:
            f.write(await file.read())

        extract_path = os.path.join(temp_dir, "repo")

        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(extract_path)

        parsed_files = analyze_repository(extract_path)
        current_analysis = parsed_files
        current_graph = build_graph(parsed_files)

        current_rag = CodeAtlasRAG(
            current_analysis,
            current_graph
        )

        current_rag.build()

        return {
            "files": len(parsed_files),
            "nodes": len(current_graph.nodes),
            "edges": len(current_graph.edges)
        }


@app.get("/api/graph")
def get_graph():

    if current_graph is None:
        return {
            "error": "No repository analyzed yet"
        }

    return graph_to_json(current_graph)


@app.get("/api/graph/node/{node_id:path}")
def get_node(node_id: str):
    if current_graph is None:
        return {"error": "No repository analyzed yet"}

    if node_id not in current_graph.nodes:
        return {"error": "Node not found"}

    node_data = current_graph.nodes[node_id]

    callers = []
    callees = []
    dependencies = []

    for source, target, data in current_graph.edges(data=True):
        relation = data.get(
            "relation",
            data.get("type", "")
        )

        if target == node_id and relation == "CALLS":
            callers.append(source)

        if source == node_id and relation == "CALLS":
            callees.append(target)

        if source == node_id and relation == "IMPORTS":
            dependencies.append(target)

    return {
        "id": node_id,
        **node_data,
        "callers": callers,
        "callees": callees,
        "dependencies": dependencies
    }


@app.get("/api/risk")
def get_risk():
    if current_graph is None or current_analysis is None:
        return {"error": "No repository analyzed yet"}

    feature_rows = build_feature_table(
        current_analysis,
        current_graph
    )

    predictions = risk_predictor.predict(feature_rows)

    return predictions


class AskRequest(BaseModel):
    question: str


@app.post("/api/ask")
def ask_codebase(request: AskRequest):
    if current_rag is None:
        return {"error": "No repository analyzed yet"}

    return current_rag.ask(request.question)