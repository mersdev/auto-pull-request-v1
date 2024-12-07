// Azure DevOps-specific selectors
const AZURE_SELECTORS = {
  fileName: ".repos-summary-header .body-s.secondary-text.text-ellipsis",
  reposHeader: "repos-summary-header",
  codeContent: "repos-line-content",
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
  const codeElements = header.getElementsByClassName(
    AZURE_SELECTORS.codeContent
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

// Azure DevOps-specific scroll and extract
function handleAzureExtraction(callback) {
  const filesTab = document.querySelector(AZURE_SELECTORS.filesTab);
  if (!filesTab) {
    console.error("Files tab not found with any selector");
    return callback(
      new Error(
        "Azure DevOps files tab not found. Please make sure you're on a pull request page."
      )
    );
  }

  // Click the files tab and wait for the viewer to load
  filesTab.click();

  // Wait for the viewer to be available
  setTimeout(() => {
    const viewer = document.querySelector(AZURE_SELECTORS.reposViewer);
    if (!viewer) {
      console.error("Repos viewer not found with any selector");
      return callback(
        new Error(
          "Azure DevOps changes viewer not found. Please try refreshing the page."
        )
      );
    }

    // Scroll to load all content
    viewer.scrollTo({
      top: viewer.scrollHeight,
      behavior: "smooth",
    });

    setTimeout(() => {
      // Scroll back to top
      viewer.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      // Extract and format changes
      try {
        const changes = extractAzureChanges();
        if (!changes || changes.length === 0) {
          return callback(
            new Error(
              "No changes found. Please make sure you're on a pull request with changes."
            )
          );
        }

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
      } catch (error) {
        console.error("Error extracting changes:", error);
        callback(new Error("Error extracting changes. Please try again."));
      }
    }, 3000); // Wait for content to load after scrolling
  }, 2000); // Wait for files tab click to take effect
}

// Make functions globally available
window.getAzureFileName = getAzureFileName;
window.handleAzureExtraction = handleAzureExtraction;
window.AZURE_SELECTORS = AZURE_SELECTORS;
