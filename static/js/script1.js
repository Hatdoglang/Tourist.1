import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDbNXaBjr2FVNN3nC4W8CUa9DlQwR2D87s",
    authDomain: "csas-158fc.firebaseapp.com",
    databaseURL: "https://csas-158fc-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "csas-158fc",
    storageBucket: "csas-158fc.firebasestorage.app",
    messagingSenderId: "763041820862",
    appId: "1:763041820862:web:c11981b07960e91ece6eef",
    measurementId: "G-26BMZST2LE"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let sentimentChartInstance = null;
let feedbackChartInstance = null;

// Utility Function to Extract Comments and Sentiment from CSV Data
function extractCSVData(resortData) {
    const csvData = resortData?.csvData || {};
    const comments = [];
    const trueSentiment = [];
    const predictedSentiment = [];

    // Extracting comments and sentiments from the CSV data
    for (const key in csvData) {
        const data = csvData[key];
        if (data.Comments) {
            comments.push(data.Comments);
            trueSentiment.push(data["True Sentiment"]);
            predictedSentiment.push(data["Predicted Sentiment"]);
        }
    }

    return { comments, trueSentiment, predictedSentiment };
}

// Sentiment Analysis for Pie Chart based on Predicted Sentiment
function analyzeSentiment(predictedSentiment) {
    const positiveCount = predictedSentiment.filter(sentiment => sentiment === "Positive").length;
    const negativeCount = predictedSentiment.filter(sentiment => sentiment === "Negative").length;
    const neutralCount = predictedSentiment.filter(sentiment => sentiment === "Neutral").length;

    const total = positiveCount + negativeCount + neutralCount;

    return {
        labels: ["Positive", "Negative", "Neutral"],
        datasets: [{
            label: "Sentiments",
            data: total ? [
                ((positiveCount / total) * 100).toFixed(1),
                ((negativeCount / total) * 100).toFixed(1),
                ((neutralCount / total) * 100).toFixed(1)
            ] : [0, 0, 0], // Handles the case where no data is available
            backgroundColor: ["#4caf50", "#f44336", "#ffeb3b"] // Green, Red, Yellow for each sentiment
        }]
    };
}

// Aspect Sentiment Analysis for Grouped Bar Chart based on Comments and Sentiment Type
function analyzeSentimentForBarChart(comments, predictedSentiment, selectedSentiment) {
    const aspects = ["cleanliness", "food", "service"];
    const sentimentCounts = {
        positive: { cleanliness: 0, food: 0, service: 0 },
        negative: { cleanliness: 0, food: 0, service: 0 },
        neutral: { cleanliness: 0, food: 0, service: 0 }
    };

    // Loop through each aspect and analyze sentiment for related comments
    comments.forEach((comment, index) => {
        const lowerComment = comment.toLowerCase();
        const sentiment = predictedSentiment[index]; // Corresponding sentiment for this comment

        aspects.forEach(aspect => {
            if (lowerComment.includes(aspect)) {
                // Only count the selected sentiment
                if (selectedSentiment === "All" || sentiment === selectedSentiment) {
                    if (sentiment === "Positive") {
                        sentimentCounts.positive[aspect]++;
                    } else if (sentiment === "Negative") {
                        sentimentCounts.negative[aspect]++;
                    } else {
                        sentimentCounts.neutral[aspect]++;
                    }
                }
            }
        });
    });

    return {
        labels: aspects.map(a => a.charAt(0).toUpperCase() + a.slice(1)),
        datasets: [
            {
                label: "Positive",
                data: aspects.map(aspect => sentimentCounts.positive[aspect]),
                backgroundColor: "#4caf50"
            },
            {
                label: "Negative",
                data: aspects.map(aspect => sentimentCounts.negative[aspect]),
                backgroundColor: "#f44336"
            },
            {
                label: "Neutral",
                data: aspects.map(aspect => sentimentCounts.neutral[aspect]),
                backgroundColor: "#ffeb3b"
            }
        ]
    };
}

// Update Charts
function updateChart(instance, chartId, data, chartType) {
    if (instance) instance.destroy(); // Destroy existing chart to avoid duplication
    const ctx = document.getElementById(chartId).getContext("2d");
    return new Chart(ctx, {
        type: chartType,
        data: data,
        options: {
            responsive: true,
            plugins: {
                legend: { position: "top" },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.raw}`;
                        }
                    }
                }
            },
            scales: chartType === "bar" ? {
                x: { title: { display: true, text: "Aspect" } },
                y: { title: { display: true, text: "Count" } }
            } : {}
        }
    });
}

// On DOM Content Loaded
document.addEventListener("DOMContentLoaded", async () => {
    const dropdown = document.getElementById("resortDropdown");
    const reviewsRef = ref(db, "reviews");

    try {
        const snapshot = await get(reviewsRef);
        if (snapshot.exists()) {
            const resorts = snapshot.val();
            for (const key in resorts) {
                const resortName = resorts[key]?.details?.name || "Unnamed Resort";
                const option = document.createElement("option");
                option.value = key;
                option.textContent = resortName;
                dropdown.appendChild(option);
            }
        } else {
            console.error("No data available.");
        }
    } catch (error) {
        console.error("Error fetching reviews:", error);
    }

    // Resort Dropdown Change Event
    dropdown.addEventListener("change", async () => {
        const selectedKey = dropdown.value;
        if (!selectedKey) return;
    
        const resortRef = ref(db, `reviews/${selectedKey}`);
        try {
            const snapshot = await get(resortRef);
            if (snapshot.exists()) {
                const resortData = snapshot.val();
                const { comments, trueSentiment, predictedSentiment } = extractCSVData(resortData);
    
                // Initial Sentiment Data for Pie Chart
                const sentimentData = analyzeSentiment(predictedSentiment);
                sentimentChartInstance = updateChart(sentimentChartInstance, "sentimentChart", sentimentData, "pie");

                // Initially, show all sentiments in the bar chart
                const feedbackData = analyzeSentimentForBarChart(comments, predictedSentiment, "All");
                feedbackChartInstance = updateChart(feedbackChartInstance, "feedbackChart", feedbackData, "bar");

                // Listen for Pie Chart Click Events to Filter Data for Bar Chart
                if (sentimentChartInstance) {
                    sentimentChartInstance.options.onClick = function(evt, item) {
                        if (item.length > 0) {
                            const selectedLabel = item[0]._model.label;
                            let selectedSentiment = selectedLabel.toLowerCase();

                            if (selectedSentiment === "positive") selectedSentiment = "Positive";
                            else if (selectedSentiment === "negative") selectedSentiment = "Negative";
                            else if (selectedSentiment === "neutral") selectedSentiment = "Neutral";
                            else selectedSentiment = "All";

                            // Update the bar chart with filtered data
                            const filteredData = analyzeSentimentForBarChart(comments, predictedSentiment, selectedSentiment);
                            feedbackChartInstance = updateChart(feedbackChartInstance, "feedbackChart", filteredData, "bar");
                        }
                    };
                }
            } else {
                console.error("No data found for the selected resort.");
            }
        } catch (error) {
            console.error("Error fetching resort details:", error);
        }
    });
});
