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
      displayEmptyState("codeChanges", "No code changes available");
    }

    if (data.explanation) {
      displayExplanation(data.explanation);
    } else {
      displayEmptyState("explanation", "No explanation available");
    }

    if (data.reviewMessage) {
      displayReviewMessage(data.reviewMessage);
    } else {
      displayEmptyState("message", "No review message available");
    }

    // Set up button listeners
    setupButtonListeners();

    // Auto scroll to Review Message section
    setTimeout(() => {
      const reviewMessageSection = document.querySelector(
        ".section-card:last-child"
      );
      if (reviewMessageSection) {
        reviewMessageSection.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 500); // Small delay to ensure content is rendered
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
  const codeChangesDiv = document.getElementById("codeChanges");
  if (!codeChangesDiv) return;

  try {
    if (!Array.isArray(fileChanges) || fileChanges.length === 0) {
      displayEmptyState("codeChanges", "No code changes available");
      return;
    }

    codeChangesDiv.innerHTML = formatFileChanges(fileChanges);
  } catch (error) {
    console.error("Error displaying file changes:", error);
    displayEmptyState("codeChanges", "Error displaying code changes");
  }
}

function displayExplanation(explanation) {
  const explanationDiv = document.getElementById("explanation");
  if (!explanationDiv) return;

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
    explanationDiv.innerHTML = html;
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

  // Add sections in specific order with custom styling
  const sectionOrder = [
    "summary",
    "implementation",
    "impact",
    "testing",
    "recommendations",
  ];

  if (explanation.sections) {
    sectionOrder.forEach((sectionName) => {
      const points = explanation.sections[sectionName];
      if (Array.isArray(points) && points.length > 0) {
        const sectionTitle =
          sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
        html += `
          <div class="explanation-section" data-section="${sectionName}">
            <h3 class="section-subtitle">${escapeHtml(sectionTitle)}</h3>
            <ul class="explanation-points">
              ${points
                .map(
                  (point) => `
                <li>${escapeHtml(point)}</li>
              `
                )
                .join("")}
            </ul>
          </div>
        `;
      }
    });
  }

  return html;
}

function displayReviewMessage(message) {
  const messageDiv = document.getElementById("message");
  if (!messageDiv) return;

  try {
    if (!message) {
      displayEmptyState("message", "No review message available");
      return;
    }

    // Format the message with proper spacing and structure
    const formattedMessage = message
      .split("\n")
      .map((line) => {
        if (line.trim().startsWith("-")) {
          return `<li>${escapeHtml(line.trim().substring(1).trim())}</li>`;
        }
        return line ? `<p>${escapeHtml(line)}</p>` : "";
      })
      .join("");

    messageDiv.innerHTML = formattedMessage;
  } catch (error) {
    console.error("Error displaying review message:", error);
    displayEmptyState("message", "Error displaying review message");
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

  // Remove "Plus" and "Minus" text if present, but keep the + and - signs
  let content = change.content;
  content = content.replace(/^Plus\s+/, ""); // Remove "Plus" text
  content = content.replace(/^Minus\s+/, ""); // Remove "Minus" text

  return `<div class="code-line ${typeClass}"><span class="prefix">${prefix}</span>${escapeHtml(
    content
  )}</div>`;
}

function setupButtonListeners() {
  const copyButton = document.getElementById("copyButton");
  const regenerateButton = document.getElementById("regenerateButton");

  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      try {
        // Get the stored explanation data to access summary points
        const data = await chrome.storage.local.get(["explanation"]);
        if (!data.explanation) {
          console.error("No explanation data found");
          return;
        }

        // Parse the explanation to get summary points
        const parsedExplanation =
          typeof data.explanation === "string"
            ? JSON.parse(data.explanation)
            : data.explanation;

        const summaryPoints = parsedExplanation.sections?.summary || [];

        // Build the formatted message
        const formattedText = [
          "Hi team! 👋",
          "",
          "I've created a new PR that needs your review.",
          "sbod-xxx: ",
          "",
          "Summary of changes:",
          ...summaryPoints.map((point) => `- ${point}`),
          "",
          "Would appreciate your review when you have a moment. Thanks! 🙏",
        ].join("\n");

        await navigator.clipboard.writeText(formattedText);
        updateButtonState(copyButton, "Copied!");
        setTimeout(() => updateButtonState(copyButton, "Copy"), 2000);
      } catch (error) {
        console.error("Error copying message:", error);
        updateButtonState(copyButton, "Copy failed");
        setTimeout(() => updateButtonState(copyButton, "Copy"), 2000);
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
  button.textContent = text;
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
      document.getElementById("regenerateButton"),
      "Regenerate"
    );
  }
});
