
from pathlib import Path

import joblib
import pandas as pd

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


# --------------------------------
# 1. Project paths
# --------------------------------

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
MODEL_PATH = BASE_DIR / "churn_pipeline.pkl"


# --------------------------------
# 2. Load trained ML model
# --------------------------------

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Model file not found: {MODEL_PATH}"
    )

loaded_artifact = joblib.load(MODEL_PATH)

# Support both raw pipeline and dictionary artifact
if isinstance(loaded_artifact, dict):
    model = loaded_artifact["model"]
    FEATURES = loaded_artifact.get(
        "features",
        [
            "Contract",
            "tenure",
            "MonthlyCharges",
            "InternetService",
            "PaymentMethod",
            "PaperlessBilling",
            "TechSupport",
        ],
    )
else:
    model = loaded_artifact
    FEATURES = [
        "Contract",
        "tenure",
        "MonthlyCharges",
        "InternetService",
        "PaymentMethod",
        "PaperlessBilling",
        "TechSupport",
    ]

THRESHOLD = 0.30


# --------------------------------
# 3. Create FastAPI application
# --------------------------------

app = FastAPI(
    title="Customer Churn Prediction API",
    description="Predict customer churn using a trained ML pipeline.",
    version="1.0.0",
)


# --------------------------------
# 4. Serve CSS and JavaScript
# --------------------------------

if not STATIC_DIR.exists():
    raise FileNotFoundError(
        f"Static folder not found: {STATIC_DIR}"
    )

app.mount(
    "/static",
    StaticFiles(directory=str(STATIC_DIR)),
    name="static",
)


# --------------------------------
# 5. Input data validation
# --------------------------------

class CustomerData(BaseModel):
    Contract: str
    tenure: int = Field(ge=0)
    MonthlyCharges: float = Field(ge=0)
    InternetService: str
    PaymentMethod: str
    PaperlessBilling: str
    TechSupport: str


# --------------------------------
# 6. Home page
# --------------------------------

@app.get("/")
def home():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/ui")
def home_ui():
    return FileResponse(STATIC_DIR / "index.html")


# --------------------------------
# 7. API information
# --------------------------------

@app.get("/about")
def about():
    return {
        "project": "Customer Churn Prediction",
        "model": "Gradient Boosting Pipeline",
        "threshold": THRESHOLD,
        "status": "running",
    }


# --------------------------------
# 8. Predict customer churn
# --------------------------------

@app.post("/predict")
def predict_churn(customer: CustomerData):

    try:
        # Convert input into dictionary
        input_values = customer.model_dump()

        # Arrange features in training order
        input_data = pd.DataFrame(
            [[input_values[feature] for feature in FEATURES]],
            columns=FEATURES,
        )

        # Predict probabilities
        probabilities = model.predict_proba(input_data)[0]

        # Find churn class probability
        classes = list(model.classes_)

        if 1 not in classes:
            raise ValueError("Churn class 1 not found in model.")

        churn_index = classes.index(1)
        churn_probability = float(
            probabilities[churn_index]
        )

        # Apply threshold
        prediction = int(
            churn_probability >= THRESHOLD
        )

        return {
            "churn_prediction": prediction,
            "churn_probability": round(
                churn_probability, 4
            ),
            "threshold": THRESHOLD,
            "message": (
                "Customer is likely to churn"
                if prediction == 1
                else "Customer is unlikely to churn"
            ),
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(error)}",
        )


# --------------------------------
# 9. Health check
# --------------------------------

@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }

