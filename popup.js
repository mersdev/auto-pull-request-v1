// Step 1: Constants and Utility Functions
const SELECTORS = {
  REPOS_HEADER: ".repos-summary-header",
  FILE_NAME: ".body-s.secondary-text.text-ellipsis",
  CODE_CONTENT: ".repos-line-content",
  FILES_TAB: "#__bolt-tab-files",
  REPOS_VIEWER: ".repos-changes-viewer",
};

const MESSAGE_TYPES = {
  FILE_CHANGES: "FILE_CHANGES",
  EXPLAIN_CHANGES: "EXPLAIN_CHANGES",
  EXPLANATION_RESULT: "EXPLANATION_RESULT",
  EXPLANATION_TO_POPUP: "EXPLANATION_TO_POPUP",
  ERROR: "ERROR",
};

// Step 2: DOM Interaction Helper Functions
function showStatus(message, isError = false) {
  const status = document.getElementById("status");
  status.textContent = message;
  status.classList.remove("hidden");
  if (isError) {
    status.classList.add("error");
  } else {
    status.classList.remove("error");
  }
}

function hideStatus() {
  const status = document.getElementById("status");
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
    function extractFileNames() {
      const headers = document.getElementsByClassName("repos-summary-header");
      const fileNameAndCodes = [];

      for (const header of headers) {
        const extractedData = extractFileNamesAndCodes(header);
        if (extractedData) {
          fileNameAndCodes.push(extractedData);
        }
      }

      chrome.runtime.sendMessage({
        type: "FILE_CHANGES",
        fileNames: fileNameAndCodes,
      });

      explainChangesForAllCodes(fileNameAndCodes);
    }

    function extractFileNamesAndCodes(header) {
      const fileNameElement = header.getElementsByClassName(
        "body-s secondary-text text-ellipsis"
      )[0];

      if (!fileNameElement) {
        console.log("No filename found for header");
        return null;
      }

      const diffContent = [];
      const codeElements = header.getElementsByClassName("repos-line-content");

      for (const code of codeElements) {
        const type = code.classList.contains("removed")
          ? "removed"
          : code.classList.contains("added")
          ? "added"
          : "unchanged";

        const content = code.textContent.trim();
        if (content) {
          diffContent.push({ type, content });
        }
      }

      return {
        fileName: fileNameElement.textContent.trim(),
        changes: diffContent,
      };
    }

    function explainChangesForAllCodes(fileNameAndCodes) {
      const changes = fileNameAndCodes
        .filter((file) => file !== null)
        .map((file) => ({
          fileName: file.fileName,
          added: file.changes
            .filter((change) => change.type === "added")
            .map((change) => change.content),
          removed: file.changes
            .filter((change) => change.type === "removed")
            .map((change) => change.content),
        }));

      chrome.runtime.sendMessage({
        type: "EXPLAIN_CHANGES",
        changes: changes,
      });
    }

    function scrollDownToGetAllCodes() {
      const viewer = document.getElementsByClassName("repos-changes-viewer")[0];

      if (viewer) {
        viewer.scrollTo({
          top: viewer.scrollHeight,
          behavior: "smooth",
        });

        setTimeout(() => {
          viewer.scrollTo({
            top: 0,
            behavior: "smooth",
          });
          extractFileNames();
        }, 3000);
      } else {
        chrome.runtime.sendMessage({
          type: "ERROR",
          message:
            "Viewer element not found - please make sure you're on a diff view",
        });
      }
    }

    const filesTab = document.querySelector("#__bolt-tab-files");

    if (filesTab) {
      filesTab.click();
      setTimeout(scrollDownToGetAllCodes, 2000);
    } else {
      chrome.runtime.sendMessage({
        type: "ERROR",
        message:
          "Files tab not found - please make sure you're on the correct page",
      });
    }
  };
}

// Step 4: Main Extraction Handler
async function handleExtraction() {
  const extractButton = document.getElementById("extractButton");

  try {
    disableExtractButton(extractButton);
    showStatus("Extracting changes...");

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    await chrome.tabs.reload(tab.id);

    setTimeout(async () => {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: createExtractionScript(),
      });
    }, 3000);
  } catch (error) {
    console.error("Extraction failed:", error);
    showStatus("Error during extraction", true);
    resetExtractButton(extractButton);
  }
}

// Step 5: Message Handling
function handleIncomingMessages(message) {
  const extractButton = document.getElementById("extractButton");

  if (
    message.type === "FILE_CHANGES" &&
    message.fileNames &&
    message.fileNames.length > 0
  ) {
    // Store the file changes and update status
    chrome.storage.local.set({
      fileChanges: message.fileNames,
    });
    showStatus("Processing changes...");
  } else if (message.type === "ERROR") {
    showStatus(message.message, true);
    resetExtractButton(extractButton);
    return;
  } else if (message.type === "EXPLANATION_TO_POPUP" && message.explanation) {
    try {
      // First, check if we have all the necessary data
      chrome.storage.local.get(["fileChanges"], async (data) => {
        if (!data.fileChanges) {
          showStatus("Waiting for code changes...", true);
          return;
        }

        // Generate review message if not provided
        const reviewMessage = generateDefaultReviewMessage(message.explanation);

        // Store all data
        await chrome.storage.local.set({
          explanation: message.explanation,
          reviewMessage: reviewMessage,
        });

        // Show final status
        showStatus(`Opening results page...`);

        // Open results page after a short delay to ensure storage is complete
        setTimeout(() => {
          chrome.tabs.create({ url: "results.html" }, () => {
            // Reset popup state after the new tab is opened
            resetExtractButton(extractButton);
            hideStatus();
          });
        }, 2500);
      });
    } catch (error) {
      console.error("Error processing explanation:", error);
      showStatus("Failed to process explanation", true);
      resetExtractButton(extractButton);
    }
  }
}

function generateDefaultReviewMessage(explanation) {
  try {
    const parsedExplanation =
      typeof explanation === "string" ? JSON.parse(explanation) : explanation;
    const summaryPoints = parsedExplanation.changes || [];

    return `Hi team! 

I've created a new PR that needs your review.

Summary of changes:
${summaryPoints.map((point) => `- ${point}`).join("\n")}

Would appreciate your review when you have a moment. Thanks!`;
  } catch (error) {
    console.error("Error generating review message:", error);
    return "Review message could not be generated. Please check the changes and explanation sections.";
  }
}
// Step 6: Initialize Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  const extractButton = document.getElementById("extractButton");
  extractButton.addEventListener("click", handleExtraction);
});

chrome.runtime.onMessage.addListener(handleIncomingMessages);
