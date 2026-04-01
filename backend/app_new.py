"""
EdgeNexAI Backend — ML Pipeline matching notebook Cells 5, 6, 7
Accepts raw sensor CSV, trains models, generates all dashboard JSON files.
"""

import os
import json
import traceback
import warnings
from datetime import datetime

import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "data")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

NUM_BIRDS = 5000

SENSOR_RANGES = {
    "temperature": (10, 50),
    "humidity": (20, 100),
    "feed_weight": (0, 600),
    "water": (0, 400),
    "nh3": (0, 60),
    "co2": (200, 6000),
    "light": (0, 600),
    "bird_weight": (0.3, 6),
}
