
document.addEventListener("DOMContentLoaded", () => {

    const churnForm = document.getElementById("churnForm");
    const predictBtn = document.getElementById("predictBtn");

    const emptyState = document.getElementById("emptyState");
    const loadingState = document.getElementById("loadingState");
    const resultContent = document.getElementById("resultContent");
    const errorState = document.getElementById("errorState");

    const predictionText = document.getElementById("predictionText");
    const predictionBadge = document.getElementById("predictionBadge");
    const resultDescription = document.getElementById("resultDescription");

    const probabilityValue = document.getElementById("probabilityValue");
    const probabilityBar = document.getElementById("probabilityBar");

    const errorMessage = document.getElementById("errorMessage");


    // Check required HTML elements
    if (!churnForm || !predictBtn) {
        console.error("ChurnIQ: Required HTML elements not found.");
        return;
    }


    // Show different result states
    function showState(state) {

        [
            emptyState,
            loadingState,
            resultContent,
            errorState
        ].forEach(element => {

            if (element) {
                element.classList.add("hidden");
            }

        });

        const states = {
            empty: emptyState,
            loading: loadingState,
            result: resultContent,
            error: errorState
        };

        if (states[state]) {
            states[state].classList.remove("hidden");
        }

    }


    // Collect customer information
    function getCustomerData() {

        return {

            Contract:
                document.getElementById("Contract").value,

            tenure:
                Number(document.getElementById("tenure").value),

            MonthlyCharges:
                Number(document.getElementById("MonthlyCharges").value),

            InternetService:
                document.getElementById("InternetService").value,

            PaymentMethod:
                document.getElementById("PaymentMethod").value,

            PaperlessBilling:
                document.getElementById("PaperlessBilling").value,

            TechSupport:
                document.getElementById("TechSupport").value

        };

    }


    // Display prediction result
    function displayResult(data) {

        const prediction = data.churn_prediction;

        const probability = Number(data.churn_probability);

        if (
            prediction === undefined ||
            !Number.isFinite(probability)
        ) {

            throw new Error(
                "Invalid prediction response received from API."
            );

        }


        // Convert decimal probability into percentage
        const probabilityPercent =
            probability <= 1
                ? probability * 100
                : probability;


        if (
            probabilityPercent < 0 ||
            probabilityPercent > 100
        ) {

            throw new Error(
                "Invalid churn probability received from API."
            );

        }


        // Identify prediction
        const predictionValue =
            String(prediction).toLowerCase();

        const isChurn =
            predictionValue === "1" ||
            predictionValue === "true" ||
            predictionValue === "yes" ||
            predictionValue === "churn";


        // Update result styles
        predictionText.classList.toggle(
            "churn-text",
            isChurn
        );

        predictionBadge.classList.toggle(
            "churn",
            isChurn
        );

        probabilityBar.classList.toggle(
            "churn-fill",
            isChurn
        );


        // Churn prediction
        if (isChurn) {

            predictionText.textContent =
                "High Churn Risk";

            predictionBadge.textContent =
                "CHURN PREDICTED";

            resultDescription.textContent =
                "The model indicates an increased likelihood that this customer may leave the service. Consider reviewing suitable retention actions.";

        }

        // No churn prediction
        else {

            predictionText.textContent =
                "Customer Retained";

            predictionBadge.textContent =
                "NO CHURN PREDICTED";

            resultDescription.textContent =
                "The model indicates that this customer is more likely to continue using the service.";

        }


        // Update probability
        probabilityValue.textContent =
            probabilityPercent.toFixed(1) + "%";


        // Animate probability bar
        probabilityBar.style.width = "0%";

        requestAnimationFrame(() => {

            probabilityBar.style.width =
                probabilityPercent + "%";

        });


        showState("result");

    }


    // Handle form submission
    churnForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        if (!churnForm.reportValidity()) {
            return;
        }


        const customerData = getCustomerData();


        // Loading button
        predictBtn.disabled = true;

        predictBtn.innerHTML = `
            <span class="button-spinner"></span>
            <span>Analysing...</span>
        `;


        showState("loading");


        try {

            // Send request to FastAPI
            const response = await fetch("/predict", {

                method: "POST",

                headers: {

                    "Content-Type": "application/json",
                    "Accept": "application/json"

                },

                body: JSON.stringify(customerData)

            });


            // Handle API errors
            if (!response.ok) {

                let message =
                    `Prediction request failed (${response.status}).`;

                try {

                    const errorData = await response.json();

                    if (errorData.detail) {

                        message =
                            typeof errorData.detail === "string"
                                ? errorData.detail
                                : JSON.stringify(errorData.detail);

                    }

                } catch (_) {

                    // Keep default error message

                }

                throw new Error(message);

            }


            // Get prediction response
            const data = await response.json();


            // Display prediction
            displayResult(data);


            console.log(
                "ChurnIQ Prediction:",
                data
            );


        }

        catch (error) {

            console.error(
                "Prediction Error:",
                error
            );

            errorMessage.textContent =
                error.message ||
                "Unable to connect to the prediction server.";

            showState("error");

        }

        finally {

            // Restore button
            predictBtn.disabled = false;

            predictBtn.innerHTML = `
                <i data-lucide="sparkles"></i>
                <span>Analyse Customer</span>
                <i data-lucide="arrow-right"></i>
            `;

            if (window.lucide) {
                lucide.createIcons();
            }

        }

    });


    // Reset form and result
    churnForm.addEventListener("reset", () => {

        setTimeout(() => {

            probabilityBar.style.width = "0%";

            probabilityValue.textContent = "0%";

            predictionText.classList.remove("churn-text");

            predictionBadge.classList.remove("churn");

            probabilityBar.classList.remove("churn-fill");

            showState("empty");

        }, 0);

    });


    // Initialize icons
    if (window.lucide) {
        lucide.createIcons();
    }


    console.log(
        "ChurnIQ Modern Dashboard Loaded Successfully!"
    );

});