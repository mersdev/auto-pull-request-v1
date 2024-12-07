// Azure DevOps-specific selectors
const AZURE_SELECTORS = {
  fileName: ".repos-summary-header .body-s.secondary-text.text-ellipsis",
  reposHeader: ".repos-summary-header",
  codeContent: ".repos-line-content",
  filesTab: "#__bolt-tab-files",
  reposViewer: ".repos-changes-viewer",
};

// Extract file names for Azure DevOps
function getAzureFileName(sendResponse) {
  const fileNameElement = document.querySelector(AZURE_SELECTORS.fileName);
  if (fileNameElement) {
    sendResponse({
      fileName: fileNameElement.textContent.trim(),
      platform: "azure",
    });
  }
}

// Azure DevOps specific extraction
function extractAzureChanges() {
  const headers = document.getElementsByClassName(AZURE_SELECTORS.reposHeader);
  const fileNameAndCodes = [];

  for (const header of headers) {
    const extractedData = extractAzureFileData(header);
    if (extractedData) {
      fileNameAndCodes.push(extractedData);
    }
  }

  return fileNameAndCodes;
}

function extractAzureFileData(header) {
  const fileNameElement = header.querySelector(AZURE_SELECTORS.fileName);

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

// Azure DevOps-specific scroll and extract
function handleAzureExtraction(callback) {
  const filesTab = document.querySelector(AZURE_SELECTORS.filesTab);
  const viewer = document.querySelector(AZURE_SELECTORS.reposViewer);

  if (!filesTab || !viewer) {
    return callback(new Error("Azure DevOps files tab or viewer not found"));
  }

  filesTab.click();
  setTimeout(() => {
    viewer.scrollTo({
      top: viewer.scrollHeight,
      behavior: "smooth",
    });

    setTimeout(() => {
      viewer.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      const changes = extractAzureChanges();
      const formattedChanges = changes.map((file) => ({
        fileName: file.fileName,
        added: file.changes
          .filter((change) => change.type === "added")
          .map((change) => change.content),
        removed: file.changes
          .filter((change) => change.type === "removed")
          .map((change) => change.content),
      }));
      callback(null, formattedChanges);
    }, 3000);
  }, 2000);
}

export {
  getAzureFileName,
  extractAzureChanges,
  handleAzureExtraction,
  AZURE_SELECTORS,
};
