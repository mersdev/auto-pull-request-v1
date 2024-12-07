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

// Platform-specific selectors
const PLATFORM_SELECTORS = {
  azure: {
    fileName: ".repos-summary-header .body-s.secondary-text.text-ellipsis",
  },
  github: {
    fileName: ".file-header[data-path]",
  },
};

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getFileName") {
    const platform = detectPlatform();
    if (!platform) {
      sendResponse({ error: "Unsupported platform" });
      return;
    }

    if (platform === "azure") {
      const fileNameElement = document.querySelector(
        PLATFORM_SELECTORS.azure.fileName
      );
      if (fileNameElement) {
        sendResponse({
          fileName: fileNameElement.textContent.trim(),
          platform,
        });
      }
    } else if (platform === "github") {
      const fileNameElements = document.querySelectorAll(
        PLATFORM_SELECTORS.github.fileName
      );
      if (fileNameElements.length > 0) {
        const fileNames = Array.from(fileNameElements).map((el) =>
          el.getAttribute("data-path")
        );
        sendResponse({ fileName: fileNames[0], platform }); // Send first file for now
      }
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
function extractChanges() {
  const platform = detectPlatform();
  if (platform === "azure") {
    return extractAzureChanges();
  } else if (platform === "github") {
    return extractGithubChanges();
  }
  return null;
}

// Azure DevOps specific extraction
function extractAzureChanges() {
  // Existing Azure implementation
  // ... (keep existing Azure implementation)
}

// GitHub specific extraction
function extractGithubChanges() {
  const changes = [];
  const diffElements = document.querySelectorAll(".file");

  diffElements.forEach((diffElement) => {
    const fileName = diffElement
      .querySelector(".file-header")
      .getAttribute("data-path");
    const removedLines = [];
    const addedLines = [];

    // Get all diff content lines
    const diffLines = diffElement.querySelectorAll(".diff-table tr");
    diffLines.forEach((line) => {
      if (line.classList.contains("deletion")) {
        const code = line.querySelector(".blob-code-deletion")?.textContent;
        if (code) removedLines.push(code.trim());
      } else if (line.classList.contains("addition")) {
        const code = line.querySelector(".blob-code-addition")?.textContent;
        if (code) addedLines.push(code.trim());
      }
    });

    if (removedLines.length > 0 || addedLines.length > 0) {
      changes.push({
        fileName,
        removed: removedLines,
        added: addedLines,
      });
    }
  });

  return changes;
}
