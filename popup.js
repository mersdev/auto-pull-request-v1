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

function updateFileNameDisplay(message) {
  const fileNameSpan = document.getElementById("fileName");
  fileNameSpan.innerHTML = message;
}

function hideExplanation() {
  document.getElementById("explanation").classList.add("hidden");
}

function resetExplanationDisplay() {
  const explanationCard = document.getElementById("explanation");
  explanationCard.classList.add("hidden");
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
          fileName:
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
        fileName:
          "Files tab not found - please make sure you're on the correct page",
      });
    }
  };
}

// Step 4: Main Extraction Handler
async function handleExtraction() {
  const extractButton = document.getElementById("extractButton");
  const fileNameSpan = document.getElementById("fileName");

  try {
    disableExtractButton(extractButton);
    updateFileNameDisplay(
      '<div class="empty-state">Extracting changes...</div>'
    );
    hideExplanation();

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
    updateFileNameDisplay("Error during extraction");
    resetExtractButton(extractButton);
  }
}

// Step 5: Message Handling
function handleIncomingMessages(message) {
  const fileNameSpan = document.getElementById("fileName");
  const extractButton = document.getElementById("extractButton");
  const explanationCard = document.getElementById("explanation");
  const explanationContent = explanationCard.querySelector(
    ".explanation-content"
  );

  if (
    message.type === "FILE_CHANGES" &&
    message.fileNames &&
    message.fileNames.length > 0
  ) {
    const formattedOutput = formatFileChanges(message.fileNames);
    fileNameSpan.innerHTML = formattedOutput;
  } else if (message.type === "ERROR") {
    fileNameSpan.textContent = message.fileName;
  }

  if (message.type === "EXPLANATION_TO_POPUP" && message.explanation) {
    processExplanation(
      explanationCard,
      explanationContent,
      message.explanation
    );
  }

  resetExtractButton(extractButton);
}

// Step 6: Helpers for File Changes and Explanations
function formatFileChanges(fileNames) {
  return `
    <div class="file-container">
      ${fileNames.filter(Boolean).map(formatSingleFileChanges).join("")}
    </div>
  `;
}

function formatSingleFileChanges(file) {
  const addedCount = file.changes.filter((c) => c.type === "added").length;
  const removedCount = file.changes.filter((c) => c.type === "removed").length;

  const changes = file.changes.map(formatCodeLine).join("");

  return `
    <div class="file-section">
      <div class="file-header">
        <div class="file-info">
          <div class="file-name">${escapeHtml(file.fileName)}</div>
          <div class="file-stats">
            <span class="stat-added">+${addedCount}</span>
            <span class="stat-removed">-${removedCount}</span>
          </div>
        </div>
      </div>
      <div class="code-content">${changes}</div>
    </div>`;
}

function formatCodeLine(change) {
  const symbol =
    change.type === "added" ? "+" : change.type === "removed" ? "-" : " ";
  const className = `code-line ${
    change.type === "added"
      ? "added-line"
      : change.type === "removed"
      ? "removed-line"
      : "unchanged-line"
  }`;
  return `<div class="${className}">${symbol} ${escapeHtml(
    change.content
  )}</div>`;
}

function processExplanation(explanationCard, explanationContent, explanation) {
  try {
    if (explanation.startsWith("Error:")) {
      handleErrorExplanation(explanationCard, explanationContent, explanation);
      return;
    }

    const parsedExplanation = JSON.parse(explanation);
    handleValidExplanation(
      explanationCard,
      explanationContent,
      parsedExplanation
    );
  } catch (e) {
    handleInvalidExplanation(explanationCard, explanationContent);
  }
}

function handleErrorExplanation(
  explanationCard,
  explanationContent,
  explanation
) {
  explanationCard.classList.remove("hidden");
  explanationContent.innerHTML = `
    <div class="error-message">
      <strong>⚠️ ${explanation}</strong>
      <br><br>
      <ul>
        <li>Please make sure Ollama is running on localhost:11434</li>
        <li>Check if the model "llama3" is available</li>
        <li>Try reloading the extension and the page</li>
      </ul>
    </div>
  `;
}

function handleValidExplanation(
  explanationCard,
  explanationContent,
  parsedExplanation
) {
  if (!parsedExplanation.title || !parsedExplanation.sections) {
    throw new Error("Invalid explanation format");
  }

  explanationCard.classList.remove("hidden");
  explanationContent.innerHTML = `
    <div class="explanation-title">${parsedExplanation.title}</div>
    
    ${Object.entries(parsedExplanation.sections)
      .map(
        ([section, points]) => `
        <div class="explanation-section">
          <h3 class="section-title">${
            section.charAt(0).toUpperCase() + section.slice(1)
          }</h3>
          <ul class="section-points">
            ${points.map((point) => `<li>${point}</li>`).join("")}
          </ul>
        </div>
      `
      )
      .join("")}
  `;
}

function handleInvalidExplanation(explanationCard, explanationContent) {
  explanationCard.classList.remove("hidden");
  explanationContent.innerHTML = `
    <div class="error-message">
      <strong>Error processing the explanation</strong>
      <br><br>
      <ul>
        <li>The response format was invalid</li>
        <li>Try extracting changes again</li>
        <li>If the issue persists, please check the console for details</li>
      </ul>
    </div>
  `;
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Step 7: Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  const extractButton = document.getElementById("extractButton");
  extractButton.addEventListener("click", handleExtraction);
});

chrome.runtime.onMessage.addListener(handleIncomingMessages);
