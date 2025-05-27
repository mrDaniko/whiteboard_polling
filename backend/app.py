from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from config import ROOM_ID, FILTERS
import numpy as np
from filter import apply_filter_cpp

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_store = []

@app.post("/draw/{room_id}")
def draw(room_id: str, command: dict):
    if room_id != ROOM_ID:
        raise HTTPException(status_code=404, detail="Room not found")
    _store.append(command)
    return {"status": "ok"}

@app.get("/draw/{room_id}")
def get_draw(room_id: str):
    if room_id != ROOM_ID:
        raise HTTPException(status_code=404, detail="Room not found")
    return _store

@app.post("/filter/{room_id}")
def filter_image(room_id: str, payload: dict):
    if room_id != ROOM_ID:
        raise HTTPException(status_code=404, detail="Room not found")
    data = payload.get("image_data")
    width = payload.get("width")
    height = payload.get("height")
    filter_name = payload.get("filter_name")
    if filter_name not in FILTERS:
        raise HTTPException(status_code=400, detail="Invalid filter")
    image = np.array(data, dtype=np.uint8).reshape(height, width, -1)
    filtered_image = apply_filter_cpp(image, width, height, filter_name)
    return {"image_data": filtered_image.tolist()}