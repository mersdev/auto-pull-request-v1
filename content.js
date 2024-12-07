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

// Get platform selectors
function getPlatformSelectors(platform) {
  if (platform === "azure") {
    return window.AZURE_SELECTORS;
  } else if (platform === "github") {
    return window.GITHUB_SELECTORS;
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
      window.getAzureFileName(sendResponse);
    } else if (platform === "github") {
      window.getGitHubFileName(sendResponse);
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
  if (!platform) {
    callback(new Error("Unsupported platform"));
    return;
  }

  const selectors = getPlatformSelectors(platform);
  if (!selectors) {
    callback(new Error("Platform selectors not found"));
    return;
  }

  if (platform === "azure") {
    window.handleAzureExtraction((error, changes) => {
      if (error) {
        callback(error);
        return;
      }
      forwardFileChanges(changes);
      callback(null, changes);
    });
  } else if (platform === "github") {
    window.handleGitHubExtraction((error, changes) => {
      if (error) {
        callback(error);
        return;
      }
      forwardFileChanges(changes);
      callback(null, changes);
    });
  }
}

// Make functions globally available
window.detectPlatform = detectPlatform;
window.extractChanges = extractChanges;
window.forwardFileChanges = forwardFileChanges;
window.getPlatformSelectors = getPlatformSelectors;
