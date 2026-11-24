

from pathlib import Path

import joblib
import pandas as pd

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field


# ==========================================
# 1. PROJECT PATHS
# ==========================================

BASE_DIR = Path(__file__).resolve().parent

STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"

MODEL_PATH = BASE_DIR / "churn_pipeline.pkl"


# ==========================================
# 2. CHECK PROJECT FILES
# ==========================================

if not STATIC_DIR.exists():
    raise FileNotFoundError(
        f"Static folder not found: {STATIC_DIR}"
    )

if not TEMPLATES_DIR.exists():
    raise FileNotFoundError(
        f"Templates folder not found: {TEMPLATES_DIR}"
    )

if not (TEMPLATES_DIR / "index.html").exists():
    raise FileNotFoundError(
        f"index.html not found: {TEMPLATES_DIR}"
    )

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Model file not found: {MODEL_PATH}"
    )


# ==========================================
# 3. LOAD TRAINED ML MODEL
# ==========================================

try:

    loaded_artifact = joblib.load(MODEL_PATH)

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

    if not hasattr(model, "predict_proba"):
        raise ValueError(
            "Loaded model does not support predict_proba()."
        )

    print("ChurnIQ ML Model Loaded Successfully!")

except Exception as error:

    raise RuntimeError(
        f"Model loading failed: {error}"
    ) from error


# Prediction threshold
THRESHOLD = 0.30


# ==========================================
# 4. CREATE FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="ChurnIQ - Customer Churn Prediction",
    description="AI-powered Customer Churn Prediction Platform",
    version="1.0.0",
)


# ==========================================
# 5. STATIC FILES AND HTML TEMPLATES
# ==========================================

app.mount(
    "/static",
    StaticFiles(directory=str(STATIC_DIR)),
    name="static",
)

templates = Jinja2Templates(
    directory=str(TEMPLATES_DIR)
)


# ==========================================
# 6. CUSTOMER INPUT VALIDATION
# ==========================================

class CustomerData(BaseModel):

    Contract: str

    tenure: int = Field(ge=0)

    MonthlyCharges: float = Field(ge=0)

    InternetService: str

    PaymentMethod: str

    PaperlessBilling: str

    TechSupport: str


# ==========================================
# 7. DASHBOARD HOME PAGE
# ==========================================

@app.get("/")
async def home(request: Request):

    try:

        return templates.TemplateResponse(
            request=request,
            name="index.html",
            context={
                "request": request
            },
        )

    except Exception as error:

        print("Dashboard Error:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Dashboard loading failed: {str(error)}",
        )


# Optional UI route
@app.get("/ui")
async def dashboard(request: Request):

    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "request": request
        },
    )


# ==========================================
# 8. ABOUT API
# ==========================================

@app.get("/about")
def about():

    return {
        "project": "ChurnIQ",
        "model": "Gradient Boosting Pipeline",
        "threshold": THRESHOLD,
        "features": FEATURES,
        "status": "running",
    }


# ==========================================
# 9. CUSTOMER CHURN PREDICTION
# ==========================================

@app.post("/predict")
def predict_churn(customer: CustomerData):

    try:

        # Convert customer input into dictionary
        input_values = customer.model_dump()

        # Arrange features in training order
        input_data = pd.DataFrame(
            [
                [
                    input_values[feature]
                    for feature in FEATURES
                ]
            ],
            columns=FEATURES,
        )

        # Predict probabilities
        probabilities = model.predict_proba(input_data)[0]

        # Find churn class
        classes = list(model.classes_)

        if 1 not in classes:

            raise ValueError(
                "Churn class 1 not found in model."
            )

        churn_index = classes.index(1)

        churn_probability = float(
            probabilities[churn_index]
        )

        # Apply threshold
        prediction = int(
            churn_probability >= THRESHOLD
        )

        # Return prediction result
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

        print("Prediction Error:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(error)}",
        )


# ==========================================
# 10. HEALTH CHECK
# ==========================================

@app.get("/health")
def health_check():

    return {

        "status": "healthy",

        "project": "ChurnIQ",

        "model_loaded": model is not None,

    }


# ==========================================
# 11. RUN INFORMATION
# ==========================================

@app.get("/")

async def dashboard_info(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"request": request},
    )
