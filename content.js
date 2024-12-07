import { getGitHubFileName, handleGitHubExtraction } from "./github-handler.js";
import { getAzureFileName, handleAzureExtraction } from "./azure-handler.js";

// Platform detection
function detectPlatform() {
  const url = window.location.href;
  if (url.includes("dev.azure.com")) {
    return "azure";
  } else if (url.includes("github.com")) {
    return "github";
  }
  return null;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getFileName") {
    const platform = detectPlatform();
    if (!platform) {
      sendResponse({ error: "Unsupported platform" });
      return;
    }

    if (platform === "azure") {
      getAzureFileName(sendResponse);
    } else if (platform === "github") {
      getGitHubFileName(sendResponse);
    }
  }
});

// Forward file changes to popup
function forwardFileChanges(fileNameAndCodes) {
  chrome.runtime.sendMessage({
    fileNames: fileNameAndCodes,
    platform: detectPlatform(),
  });
}

// Listen for explanation results from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "EXPLANATION_RESULT") {
    // Forward the explanation to the popup
    chrome.runtime.sendMessage({
      type: "EXPLANATION_TO_POPUP",
      explanation: message.explanation,
      platform: detectPlatform(),
    });
  }
});

// Extract changes based on platform
function extractChanges(callback) {
  const platform = detectPlatform();
  if (platform === "azure") {
    handleAzureExtraction((error, changes) => {
      if (error) {
        callback(error);
        return;
      }
      forwardFileChanges(changes);
      callback(null, changes);
    });
  } else if (platform === "github") {
    handleGitHubExtraction((error, changes) => {
      if (error) {
        callback(error);
        return;
      }
      forwardFileChanges(changes);
      callback(null, changes);
    });
  } else {
    callback(new Error("Unsupported platform"));
  }
}

// Export for use in other modules
export { detectPlatform, extractChanges, forwardFileChanges };
