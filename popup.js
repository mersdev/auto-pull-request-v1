document.addEventListener("DOMContentLoaded", () => {
  const extractButton = document.getElementById("extractButton");
  const fileNameSpan = document.getElementById("fileName");

  extractButton.addEventListener("click", async () => {
    try {
      extractButton.disabled = true;
      extractButton.classList.add("loading");
      extractButton.textContent = "Extracting...";
      document.getElementById("fileName").innerHTML =
        '<div class="empty-state">Extracting changes...</div>';
      document.getElementById("explanation").classList.add("hidden");

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      await chrome.tabs.reload(tab.id);

      setTimeout(async () => {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            function extractFileNames() {
              console.log("Extracting file names...");

              let index = 1;

              const headers = document.getElementsByClassName(
                "repos-summary-header"
              );
              console.log("Found headers:", headers.length);

              const fileNameAndCodes = [];

              for (const header of headers) {
                fileNameAndCodes.push(extractFileNamesAndCodes(header, index));
                index++;
              }

              console.log("Extracted data:", fileNameAndCodes);
              chrome.runtime.sendMessage({
                type: "FILE_CHANGES",
                fileNames: fileNameAndCodes,
              });
              explainChangesForAllCodes(fileNameAndCodes);
            }

            function extractFileNamesAndCodes(header, index) {
              const fileNameElement = header.getElementsByClassName(
                "body-s secondary-text text-ellipsis"
              )[0];

              if (!fileNameElement) {
                console.log(`No filename found for header ${index}`);
                return;
              }

              const diffContent = [];
              const codeElements =
                header.getElementsByClassName("repos-line-content");

              console.log(
                `Found ${
                  codeElements.length
                } code lines for file ${fileNameElement.textContent.trim()}`
              );

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
                .map((file) => {
                  if (!file) return null;

                  const addedLines = file.changes
                    .filter((change) => change.type === "added")
                    .map((change) => change.content);

                  const removedLines = file.changes
                    .filter((change) => change.type === "removed")
                    .map((change) => change.content);

                  return {
                    fileName: file.fileName,
                    added: addedLines,
                    removed: removedLines,
                  };
                })
                .filter(Boolean);

              chrome.runtime.sendMessage({
                type: "EXPLAIN_CHANGES",
                changes: changes,
              });
            }

            chrome.runtime.onMessage.addListener((message) => {
              if (message.type === "EXPLANATION_RESULT") {
                chrome.runtime.sendMessage({
                  type: "EXPLANATION_TO_POPUP",
                  explanation: message.explanation,
                });
              }
            });

            function scrollDownToGetAllCodes() {
              console.log("Starting scroll process...");

              const viewer = document.getElementsByClassName(
                "repos-changes-viewer"
              )[0];

              if (viewer) {
                console.log("Found viewer element");
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
                console.log("Viewer element not found");
                chrome.runtime.sendMessage({
                  type: "ERROR",
                  fileName:
                    "Viewer element not found - please make sure you're on a diff view",
                });
              }
            }

            console.log("Starting extraction process...");
            const filesTab = document.querySelector("#__bolt-tab-files");

            if (filesTab) {
              console.log("Found files tab");
              filesTab.click();
              setTimeout(() => {
                scrollDownToGetAllCodes();
              }, 2000);
            } else {
              console.log("Files tab not found");
              chrome.runtime.sendMessage({
                type: "ERROR",
                fileName:
                  "Files tab not found - please make sure you're on the correct page",
              });
            }
          },
        });
      }, 3000);
    } catch (error) {
      console.error("Extraction failed:", error);
      fileNameSpan.textContent = "Error during extraction";
      extractButton.disabled = false;
      extractButton.textContent = "Extract Changes";
      extractButton.classList.remove("loading");
    }
  });
});

// Message listener for handling file names and explanations
chrome.runtime.onMessage.addListener((message) => {
  console.log("Received message in popup:", message);
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
    console.log("Processing file changes:", message.fileNames);
    const formattedOutput = `
      <div class="file-container">
        ${message.fileNames
          .map((file) => {
            if (!file) return "";

            const addedCount = file.changes.filter(
              (c) => c.type === "added"
            ).length;
            const removedCount = file.changes.filter(
              (c) => c.type === "removed"
            ).length;

            const changes = file.changes
              .map((change) => {
                const symbol =
                  change.type === "added"
                    ? "+"
                    : change.type === "removed"
                    ? "-"
                    : " ";
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
              })
              .join("");

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
          })
          .join("")}
      </div>`;

    fileNameSpan.innerHTML = formattedOutput;
  } else if (message.type === "ERROR") {
    console.log("Received error message:", message.fileName);
    fileNameSpan.textContent = message.fileName;
  }

  if (message.type === "EXPLANATION_TO_POPUP" && message.explanation) {
    try {
      if (message.explanation.startsWith("Error:")) {
        explanationCard.classList.remove("hidden");
        explanationContent.innerHTML = `
          <div class="error-message">
            <strong>⚠️ ${message.explanation}</strong>
            <br><br>
            <ul>
              <li>Please make sure Ollama is running on localhost:11434</li>
              <li>Check if the model "llama3" is available</li>
              <li>Try reloading the extension and the page</li>
            </ul>
          </div>
        `;
        return;
      }

      const parsedExplanation = JSON.parse(message.explanation);

      if (!parsedExplanation.title || !parsedExplanation.desc) {
        throw new Error("Invalid explanation format");
      }

      explanationCard.classList.remove("hidden");
      explanationContent.innerHTML = `
        <strong>${parsedExplanation.title}</strong>
        <br><br>
        ${parsedExplanation.desc
          .split("\n")
          .map((line) => `<li>${line.trim()}</li>`)
          .join("")}
      `;
    } catch (e) {
      console.error("Error processing explanation:", e);
      explanationCard.classList.remove("hidden");
      explanationContent.innerHTML = `
        <div class="error-message">
          <strong>⚠️ Error processing the explanation</strong>
          <br><br>
          <ul>
            <li>The response format was invalid</li>
            <li>Try extracting changes again</li>
            <li>If the issue persists, please check the console for details</li>
          </ul>
        </div>
      `;
    }
  }

  extractButton.disabled = false;
  extractButton.textContent = "Extract Changes";
  extractButton.classList.remove("loading");
});

// Helper function to safely escape HTML
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
