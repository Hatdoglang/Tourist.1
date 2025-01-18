import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDbNXaBjr2FVNN3nC4W8CUa9DlQwR2D87s",
  authDomain: "csas-158fc.firebaseapp.com",
  databaseURL: "https://csas-158fc-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "csas-158fc",
  storageBucket: "csas-158fc.appspot.com",
  messagingSenderId: "763041820862",
  appId: "1:763041820862:web:c11981b07960e91ece6eef",
  measurementId: "G-26BMZST2LE",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// List of stop words
const stopWords = new Set(["i"]);

// List of positive and negative words associated with specific aspects
const aspects = {
  positive: {
    "Great Value for Money": [
      "affordable", "value for money", "great price", "cheap", "worth the price"
    ],
    "Friendly Staff": [
      "friendly staff", "helpful staff", "polite staff", "welcoming staff"
    ],
    "Relaxing Atmosphere": [
      "relaxing atmosphere", "peaceful environment", "calm place", "unwind"
    ],
    "Clean Facilities": [
      "clean facilities", "well-maintained", "neat rooms", "tidy"
    ],
    "Delicious Food": [
      "delicious food", "tasty food", "amazing food", "good food", "great food"
    ]
  },
  negative: {
    "Slow Service": [
      "slow service", "poor service", "delayed service", "rude service"
    ],
    "Overpriced": [
      "overpriced", "expensive", "not worth the price", "too costly"
    ],
    "Unclean": [
      "dirty", "unclean", "filthy", "unmaintained", "messy"
    ],
    "Noisy Environment": [
      "noisy", "loud", "disturbing noise", "too noisy"
    ]
  }
};

// Fetch and analyze all reviews
async function fetchAndAnalyzeAllReviews() {
  try {
    const reviewsRef = ref(database, "reviews");
    const snapshot = await get(reviewsRef);

    if (snapshot.exists()) {
      const reviewsData = snapshot.val();
      const sentimentData = {
        positive: 0,
        negative: 0,
        neutral: 0,
        aspects: { positive: {}, negative: {} }
      };

      // Ensure data is being processed
      console.log("Reviews data fetched:", reviewsData);

      for (const placeId in reviewsData) {
        const placeReviews = reviewsData[placeId];
        for (const reviewKey in placeReviews) {
          if (reviewKey.startsWith("review_")) {
            const review = placeReviews[reviewKey];
            console.log("Review being analyzed:", review);
            analyzeReviewSentiment(review, sentimentData);
          }
        }
      }

      console.log("Sentiment Data:", sentimentData);
      displaySentimentCharts(sentimentData);
    } else {
      console.log("No data available.");
    }
  } catch (error) {
    console.error("Error fetching reviews:", error);
  }
}

// Analyze review sentiment by aspects
function analyzeReviewSentiment(review, sentimentData) {
  if (review.comments && typeof review.comments === "string") {
    const filteredComments = filterStopWords(review.comments);

    // Check positive aspects
    for (const aspect in aspects.positive) {
      aspects.positive[aspect].forEach(word => {
        if (filteredComments.includes(word)) {
          sentimentData.positive++;
          updateAspectCount(sentimentData.aspects.positive, aspect);
        }
      });
    }

    // Check negative aspects
    for (const aspect in aspects.negative) {
      aspects.negative[aspect].forEach(word => {
        if (filteredComments.includes(word)) {
          sentimentData.negative++;
          updateAspectCount(sentimentData.aspects.negative, aspect);
        }
      });
    }

    // If no positive or negative aspects are found, count as neutral
    if (sentimentData.positive === 0 && sentimentData.negative === 0) {
      sentimentData.neutral++;
    }
  }
}

// Update aspect count for both positive and negative aspects
function updateAspectCount(aspectObj, aspect) {
  if (!aspectObj[aspect]) {
    aspectObj[aspect] = 0;
  }
  aspectObj[aspect]++;
}

// Remove stop words from comments
function filterStopWords(comment) {
  const words = comment.split(" ");
  return words.filter(word => !stopWords.has(word.toLowerCase())).join(" ");
}

// Display sentiment charts
function displaySentimentCharts(sentimentData) {
  const positiveLabels = Object.keys(sentimentData.aspects.positive);
  const positiveData = Object.values(sentimentData.aspects.positive);
  const negativeLabels = Object.keys(sentimentData.aspects.negative);
  const negativeData = Object.values(sentimentData.aspects.negative);

  console.log("Positive Aspects:", positiveLabels, positiveData);
  console.log("Negative Aspects:", negativeLabels, negativeData);

  // Calculate the maximum value across both datasets to synchronize scales
  const maxDataValue = Math.max(...positiveData, ...negativeData);

  const ctxPositive = document.getElementById("positiveAspectsChart").getContext("2d");
  new Chart(ctxPositive, {
    type: "bar",
    data: {
      labels: positiveLabels,
      datasets: [{
        label: "Positive Aspects",
        data: positiveData,
        backgroundColor: "rgba(0, 128, 0, 0.2)",
        borderColor: "rgba(0, 128, 0, 1)",
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y', // Horizontal bars
      responsive: true,
      scales: {
        x: {
          beginAtZero: true,
          max: maxDataValue // Use the calculated maximum value
        }
      }
    }
  });

  const ctxNegative = document.getElementById("negativeAspectsChart").getContext("2d");
  new Chart(ctxNegative, {
    type: "bar",
    data: {
      labels: negativeLabels,
      datasets: [{
        label: "Negative Aspects",
        data: negativeData,
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y', // Horizontal bars
      responsive: true,
      scales: {
        x: {
          beginAtZero: true,
          max: maxDataValue // Use the calculated maximum value
        }
      }
    }
  });
}


// Fetch and analyze reviews
fetchAndAnalyzeAllReviews();
