// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getFileName") {
    const fileNameElement = document.querySelector(
      ".repos-summary-header .body-s.secondary-text.text-ellipsis"
    );
    if (fileNameElement) {
      sendResponse({ fileName: fileNameElement.textContent.trim() });
    }
  }
});

// Forward file changes to popup
function forwardFileChanges(fileNameAndCodes) {
  chrome.runtime.sendMessage({ fileNames: fileNameAndCodes });
}

// Listen for explanation results from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "EXPLANATION_RESULT") {
    // Forward the explanation to the popup
    chrome.runtime.sendMessage({
      type: "EXPLANATION_TO_POPUP",
      explanation: message.explanation,
    });
  }
});
