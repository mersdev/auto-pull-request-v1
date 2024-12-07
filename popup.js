// Step 1: Constants and Utility Functions
const MESSAGE_TYPES = {
  FILE_CHANGES: "FILE_CHANGES",
  EXPLAIN_CHANGES: "EXPLAIN_CHANGES",
  EXPLANATION_RESULT: "EXPLANATION_RESULT",
  EXPLANATION_TO_POPUP: "EXPLANATION_TO_POPUP",
  ERROR: "ERROR",
};

// Step 2: DOM Interaction Helper Functions
function showStatus(message, isError = false) {
  const status = document.getElementById("statusMessage");
  let emoji = "🔄"; // Default processing emoji

  // Map emojis to specific messages
  if (message.includes("Extracting")) {
    emoji = "🔍";
  } else if (message.includes("Processing")) {
    emoji = "⚡";
  } else if (message.includes("Opening")) {
    emoji = "🚀";
  } else if (message.includes("Waiting")) {
    emoji = "⏳";
  } else if (isError) {
    emoji = "❌";
  }

  status.textContent = `${emoji} ${message}`;
  status.classList.remove("hidden");
  if (isError) {
    status.classList.add("error");
  } else {
    status.classList.remove("error");
  }
}

function hideStatus() {
  const status = document.getElementById("statusMessage");
  status.classList.add("hidden");
}

function disableExtractButton(extractButton) {
  extractButton.disabled = true;
  extractButton.classList.add("loading");
  extractButton.textContent = "Extracting...";
}

function resetExtractButton(extractButton) {
  extractButton.disabled = false;
  extractButton.classList.remove("loading");
  extractButton.textContent = "Extract Changes";
}

// Step 3: Extraction Script Creation
function createExtractionScript() {
  return () => {
    function detectPlatform() {
      const url = window.location.href;
      if (url.includes("dev.azure.com")) {
        return "azure";
      } else if (url.includes("github.com")) {
        return "github";
      }
      return null;
    }

    function extractFileNames() {
      const platform = detectPlatform();
      if (!platform) {
        chrome.runtime.sendMessage({
          type: "ERROR",
          message: "❌ Unsupported platform",
        });
        return;
      }

      chrome.runtime.sendMessage({
        type: "STATUS_UPDATE",
        message: "📑 Collecting file changes...",
      });

      if (platform === "azure") {
        window.handleAzureExtraction((error, changes) => {
          if (error) {
            chrome.runtime.sendMessage({
              type: "ERROR",
              message: error.message,
            });
            return;
          }
          chrome.runtime.sendMessage({
            type: "FILE_CHANGES",
            fileNames: changes,
            platform: platform,
          });
          explainChangesForAllCodes(changes);
        });
      } else if (platform === "github") {
        window.handleGitHubExtraction((error, changes) => {
          if (error) {
            chrome.runtime.sendMessage({
              type: "ERROR",
              message: error.message,
            });
            return;
          }
          chrome.runtime.sendMessage({
            type: "FILE_CHANGES",
            fileNames: changes,
            platform: platform,
          });
          explainChangesForAllCodes(changes);
        });
      }
    }

    function explainChangesForAllCodes(changes) {
      chrome.runtime.sendMessage({
        type: "EXPLAIN_CHANGES",
        changes: changes,
        platform: detectPlatform(),
      });
    }

    const platform = detectPlatform();
    if (!platform) {
      chrome.runtime.sendMessage({
        type: "ERROR",
        message: "❌ Unsupported platform - please use Azure DevOps or GitHub",
      });
      return;
    }

    // Get the appropriate handler based on platform
    const handler =
      platform === "azure"
        ? window.handleAzureExtraction
        : window.handleGitHubExtraction;
    if (!handler) {
      chrome.runtime.sendMessage({
        type: "ERROR",
        message: "❌ Platform handler not found",
      });
      return;
    }

    handler((error, changes) => {
      if (error) {
        chrome.runtime.sendMessage({
          type: "ERROR",
          message: error.message,
        });
        return;
      }
      extractFileNames();
    });
  };
}

// Step 4: Main Extraction Handler
async function handleExtraction() {
  const extractButton = document.getElementById("extractButton");

  try {
    disableExtractButton(extractButton);
    showStatus("🚀 Starting extraction process...");

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    showStatus("⏳ Refreshing page...");
    await chrome.tabs.reload(tab.id);

    setTimeout(async () => {
      showStatus("🔍 Preparing to extract changes...");
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: createExtractionScript(),
      });
    }, 3000);
  } catch (error) {
    console.error("Extraction failed:", error);
    showStatus(
      "❌ Error during extraction. Please check your connection",
      true
    );
    resetExtractButton(extractButton);
  }
}

// Step 5: Message Handling
let isTabOpening = false;

function handleIncomingMessages(message) {
  const extractButton = document.getElementById("extractButton");

  if (message.type === "STATUS_UPDATE") {
    showStatus(message.message);
    updatePlatformStatus();
  } else if (
    message.type === "FILE_CHANGES" &&
    message.fileNames &&
    message.fileNames.length > 0
  ) {
    // Store the file changes and update status
    chrome.storage.local.set({
      fileChanges: message.fileNames,
    });
    showStatus("⚡ Processing code changes...");
  } else if (message.type === "ERROR") {
    showStatus(message.message, true);
    resetExtractButton(extractButton);
    isTabOpening = false;
    return;
  } else if (
    message.type === "EXPLANATION_TO_POPUP" &&
    message.explanation &&
    !isTabOpening
  ) {
    try {
      // First, check if we have all the necessary data
      chrome.storage.local.get(["fileChanges"], async (data) => {
        if (!data.fileChanges) {
          showStatus("⏳ Waiting for code changes to be processed...", true);
          return;
        }

        // Set flag to prevent multiple tabs
        isTabOpening = true;
        showStatus("📝 Generating review message...");

        // Generate review message if not provided
        const reviewMessage = generateDefaultReviewMessage(message.explanation);

        // Store all data
        await chrome.storage.local.set({
          explanation: message.explanation,
          reviewMessage: reviewMessage,
        });

        showStatus("🚀 Preparing results page...");

        try {
          // Check for existing tabs with results.html
          const resultsUrl = chrome.runtime.getURL("results.html");
          const tabs = await chrome.tabs.query({ url: resultsUrl });

          if (tabs.length > 0) {
            showStatus("🔄 Updating existing results tab...");
            // If tab exists, focus it and reload
            await chrome.tabs.update(tabs[0].id, {
              active: true,
              highlighted: true,
            });
            await chrome.tabs.reload(tabs[0].id);
          } else {
            showStatus("✨ Creating new results tab...");
            // If no tab exists, create new one
            await chrome.tabs.create({ url: resultsUrl });
          }

          // Reset popup state
          resetExtractButton(extractButton);
          hideStatus();
        } catch (error) {
          console.error("Error handling tabs:", error);
          showStatus("❌ Error opening results page. Please try again", true);
        } finally {
          // Always reset the flag
          isTabOpening = false;
        }
      });
    } catch (error) {
      console.error("Error processing explanation:", error);
      showStatus("❌ Failed to process explanation. Please try again", true);
      resetExtractButton(extractButton);
      isTabOpening = false;
    }
  }
}

function generateDefaultReviewMessage(explanation) {
  try {
    const parsedExplanation =
      typeof explanation === "string" ? JSON.parse(explanation) : explanation;
    const summaryPoints = parsedExplanation.sections?.summary || [];

    return `Hi team! 👋\n\nI've created a new PR that needs your review.\n
            sbod-xxx: https://github.com/org/repo/pull/xxx\n\n
            Summary of changes:\n${summaryPoints
              .map((point) => `• ${point}`)
              .join(
                "\n"
              )}\n\nWould appreciate your review when you have a moment. Thanks! 🙏`;
  } catch (error) {
    console.error("Error generating review message:", error);
    return "Review message could not be generated. Please check the changes and explanation sections.";
  }
}

// Step 6: Initialize Event Listeners
async function updatePlatformStatus() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const url = tab.url;

    const platformLogo = document.getElementById("platformLogo");
    const platformText = document.getElementById("platformText");
    const platformStatus = document.getElementById("platformStatus");

    if (url.includes("dev.azure.com")) {
      platformLogo.src = "images/ado.png";
      platformText.textContent = "Azure DevOps";
      platformStatus.className = "status-dot online";
    } else if (url.includes("github.com")) {
      platformLogo.src = "images/github.png";
      platformText.textContent = "GitHub";
      platformStatus.className = "status-dot online";
    } else {
      platformLogo.src = "images/404.png";
      platformText.textContent = "Offline";
      platformStatus.className = "status-dot offline";
    }
  } catch (error) {
    console.error("Error updating platform status:", error);
    // Set to offline state if there's an error
    platformLogo.src = "images/404.png";
    platformText.textContent = "Offline";
    platformStatus.className = "status-dot offline";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const extractButton = document.getElementById("extractButton");
  extractButton.addEventListener("click", handleExtraction);
  isTabOpening = false; // Reset flag when popup opens

  // Add platform status check
  updatePlatformStatus();
});

chrome.runtime.onMessage.addListener(handleIncomingMessages);
