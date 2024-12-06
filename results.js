// Initialize the page with data from storage
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const data = await chrome.storage.local.get([
      "fileChanges",
      "explanation",
      "reviewMessage",
    ]);
    console.log("Retrieved data:", data); // For debugging

    if (data.fileChanges) {
      displayFileChanges(data.fileChanges);
    } else {
      displayEmptyState("fileChangesContent", "No code changes available");
    }

    if (data.explanation) {
      displayExplanation(data.explanation);
    } else {
      displayEmptyState("explanation", "No explanation available");
    }

    if (data.reviewMessage) {
      displayReviewMessage(data.reviewMessage);
    } else {
      displayEmptyState("messageText", "No review message available");
    }

    // Set up button listeners
    setupButtonListeners();
  } catch (error) {
    console.error("Error initializing results page:", error);
    displayError("Error loading results. Please try extracting changes again.");
  }
});

function displayEmptyState(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<div class="empty-state">${message}</div>`;
  }
}

function displayError(message) {
  const container = document.querySelector(".container");
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;
  container.insertBefore(errorDiv, container.firstChild);
}

function displayFileChanges(fileChanges) {
  const fileChangesContent = document.getElementById("fileChangesContent");
  if (!fileChangesContent) return;

  try {
    if (!Array.isArray(fileChanges) || fileChanges.length === 0) {
      displayEmptyState("fileChangesContent", "No code changes available");
      return;
    }

    fileChangesContent.innerHTML = formatFileChanges(fileChanges);
  } catch (error) {
    console.error("Error displaying file changes:", error);
    displayEmptyState("fileChangesContent", "Error displaying code changes");
  }
}

function displayExplanation(explanation) {
  const explanationContent = document.querySelector(".explanation-content");
  if (!explanationContent) return;

  try {
    let parsedExplanation = explanation;
    if (typeof explanation === "string") {
      parsedExplanation = JSON.parse(explanation);
    }

    if (!parsedExplanation || !parsedExplanation.sections) {
      displayEmptyState("explanation", "Invalid explanation format");
      return;
    }

    const html = formatExplanation(parsedExplanation);
    explanationContent.innerHTML = html;
  } catch (error) {
    console.error("Error displaying explanation:", error);
    displayEmptyState("explanation", "Error displaying explanation");
  }
}

function formatExplanation(explanation) {
  let html = "";

  // Add title if available
  if (explanation.title) {
    html += `<div class="explanation-title">${escapeHtml(
      explanation.title
    )}</div>`;
  }

  // Add sections
  if (explanation.sections) {
    Object.entries(explanation.sections).forEach(([sectionName, points]) => {
      if (Array.isArray(points) && points.length > 0) {
        const sectionTitle =
          sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
        html += `
          <div class="explanation-section">
            <h3 class="section-subtitle">${escapeHtml(sectionTitle)}</h3>
            <ul class="explanation-points">
              ${points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
            </ul>
          </div>
        `;
      }
    });
  }

  return html;
}

function displayReviewMessage(message) {
  const messageText = document.getElementById("messageText");
  if (!messageText) return;

  try {
    if (!message) {
      displayEmptyState("messageText", "No review message available");
      return;
    }

    messageText.textContent = message;
  } catch (error) {
    console.error("Error displaying review message:", error);
    displayEmptyState("messageText", "Error displaying review message");
  }
}

function formatFileChanges(fileNames) {
  return fileNames.map((file) => formatSingleFileChanges(file)).join("");
}

function formatSingleFileChanges(file) {
  const changes = file.changes.map((change) => formatCodeLine(change)).join("");
  return `
        <div class="file-changes">
            <div class="file-name">${escapeHtml(file.fileName)}</div>
            <div class="code-changes">${changes}</div>
        </div>
    `;
}

function formatCodeLine(change) {
  const typeClass =
    change.type === "added"
      ? "added"
      : change.type === "removed"
      ? "removed"
      : "";
  const prefix =
    change.type === "added" ? "+" : change.type === "removed" ? "-" : " ";
  return `<div class="code-line ${typeClass}"><span class="prefix">${prefix}</span>${escapeHtml(
    change.content
  )}</div>`;
}

function setupButtonListeners() {
  const copyButton = document.getElementById("copyMessageButton");
  const regenerateButton = document.getElementById("regenerateMessageButton");

  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      const messageText = document.getElementById("messageText");
      if (!messageText || !messageText.textContent) return;

      try {
        await navigator.clipboard.writeText(messageText.textContent);
        updateButtonState(copyButton, "Copied!");
        setTimeout(() => updateButtonState(copyButton, "Copy Message"), 2000);
      } catch (error) {
        console.error("Error copying message:", error);
        updateButtonState(copyButton, "Copy failed");
        setTimeout(() => updateButtonState(copyButton, "Copy Message"), 2000);
      }
    });
  }

  if (regenerateButton) {
    regenerateButton.addEventListener("click", async () => {
      updateButtonState(regenerateButton, "Regenerating...");
      chrome.runtime.sendMessage({ type: "REGENERATE_MESSAGE" });
    });
  }
}

function updateButtonState(button, text) {
  const buttonText = button.querySelector(".button-text");
  if (buttonText) {
    buttonText.textContent = text;
  }
}

function escapeHtml(unsafe) {
  if (typeof unsafe !== "string") return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_REVIEW_MESSAGE") {
    displayReviewMessage(message.message);
    updateButtonState(
      document.getElementById("regenerateMessageButton"),
      "Regenerate"
    );
  }
});
