
"use strict";

const form = document.getElementById("predictionForm");
const predictBtn = document.getElementById("predictBtn");
const btnText = document.getElementById("btnText");

const resultPlaceholder = document.getElementById("resultPlaceholder");
const result = document.getElementById("result");
const errorBox = document.getElementById("errorBox");

const predictionText = document.getElementById("predictionText");
const probabilityText = document.getElementById("probabilityText");
const riskLabel = document.getElementById("riskLabel");
const probabilityBar = document.getElementById("probabilityBar");
const resultMessage = document.getElementById("resultMessage");

function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
}

function hideError() {
    errorBox.textContent = "";
    errorBox.hidden = true;
}

function setLoading(loading) {
    predictBtn.disabled = loading;
    btnText.textContent = loading
        ? "Analyzing..."
        : "Analyze Customer ↗";
}

// Only send the 7 features required by the ML model
function getCustomerData() {
    const formData = new FormData(form);

    return {
        Contract: formData.get("Contract"),
        tenure: Number(formData.get("tenure")),
        MonthlyCharges: Number(formData.get("MonthlyCharges")),
        InternetService: formData.get("InternetService"),
        PaymentMethod: formData.get("PaymentMethod"),
        PaperlessBilling: formData.get("PaperlessBilling"),
        TechSupport: formData.get("TechSupport")
    };
}

function resetResult() {
    result.hidden = true;
    resultPlaceholder.hidden = false;
    probabilityBar.style.width = "0%";
}

function displayPrediction(data) {
    const probability = Number(data.churn_probability);

    if (
        data.churn_prediction === undefined ||
        !Number.isFinite(probability) ||
        probability < 0 ||
        probability > 1
    ) {
        throw new Error("Invalid prediction response from the server.");
    }

    const isChurn = Number(data.churn_prediction) === 1;
    const percentage = probability * 100;

    resultPlaceholder.hidden = true;
    result.hidden = false;

    predictionText.textContent = isChurn
        ? "Churn Risk Detected"
        : "Customer Likely to Stay";

    predictionText.style.color = isChurn ? "#fb7185" : "#34d399";

    probabilityText.textContent = `${percentage.toFixed(1)}%`;

    riskLabel.textContent = isChurn
        ? "CHURN PREDICTED"
        : "NO CHURN PREDICTED";

    riskLabel.style.color = isChurn ? "#fb7185" : "#34d399";

    riskLabel.style.background = isChurn
        ? "rgba(251, 113, 133, 0.10)"
        : "rgba(52, 211, 153, 0.10)";

    riskLabel.style.borderColor = isChurn
        ? "rgba(251, 113, 133, 0.25)"
        : "rgba(52, 211, 153, 0.25)";

    resultMessage.textContent = isChurn
        ? "The model predicts churn for this customer. Review their contract, service experience and support needs."
        : "The model predicts that this customer will stay. Continue monitoring satisfaction and engagement.";

    if (data.threshold !== undefined) {
        resultMessage.textContent +=
            ` Decision threshold: ${Number(data.threshold).toFixed(2)}.`;
    }

    requestAnimationFrame(() => {
        probabilityBar.style.width = `${percentage}%`;
    });
}

async function predictChurn(customerData) {
    const response = await fetch("/predict", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(customerData)
    });

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error(`Server response error (HTTP ${response.status}).`);
    }

    if (!response.ok) {
        const detail = data.detail;

        const message = Array.isArray(detail)
            ? detail.map(item => item.msg || JSON.stringify(item)).join(", ")
            : detail || "Prediction request failed.";

        throw new Error(String(message));
    }

    return data;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    hideError();

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const customerData = getCustomerData();

    if (
        !Number.isFinite(customerData.tenure) ||
        customerData.tenure < 0 ||
        customerData.tenure > 100
    ) {
        showError("Tenure must be between 0 and 100 months.");
        return;
    }

    if (
        !Number.isFinite(customerData.MonthlyCharges) ||
        customerData.MonthlyCharges < 0
    ) {
        showError("Please enter valid Monthly Charges.");
        return;
    }

    setLoading(true);
    resetResult();

    try {
        console.log("Sending customer data:", customerData);

        const data = await predictChurn(customerData);

        console.log("Prediction response:", data);

        displayPrediction(data);

    } catch (error) {
        console.error("Prediction error:", error);

        showError(
            error.message ||
            "Unable to connect to the prediction API. Check that FastAPI is running."
        );

    } finally {
        setLoading(false);
    }
});

resetResult();
hideError();

console.log("ChurnIQ JavaScript loaded successfully.");
