// GitHub-specific selectors
const GITHUB_SELECTORS = {
  fileName: ".file-header[data-path]",
  reposHeader: ".file.js-file",
  codeContent: ".blob-code",
  reposViewer: ".js-diff-progressive-container",
  reposViewerBackup: ".pull-request-tab-content",
  deletionLine: ".blob-code-deletion .blob-code-inner",
  additionLine: ".blob-code-addition .blob-code-inner",
  pullRequestTitle: "#pull_request_title",
  pullRequestBody: "#pull_request_body",
};

// Extract file names for GitHub
function getGitHubFileName(sendResponse) {
  const fileNameElement = document.querySelector(GITHUB_SELECTORS.fileName);
  if (fileNameElement) {
    sendResponse({
      fileName: fileNameElement.getAttribute("data-path"),
      platform: "github",
    });
  }
}

// Extract GitHub PR title and description
function getGitHubPRDetails(callback) {
  const titleElement = document.querySelector(
    GITHUB_SELECTORS.pullRequestTitle
  );
  const bodyElement = document.querySelector(GITHUB_SELECTORS.pullRequestBody);

  if (!titleElement || !bodyElement) {
    return callback(
      new Error(
        "Pull request form elements not found. Make sure you're on the PR creation/edit page."
      )
    );
  }

  callback(null, {
    title: titleElement.value.trim(),
    description: bodyElement.value.trim(),
  });
}

// Set GitHub PR title and description
function setGitHubPRDetails(title, description, callback) {
  const titleElement = document.querySelector(
    GITHUB_SELECTORS.pullRequestTitle
  );
  const bodyElement = document.querySelector(GITHUB_SELECTORS.pullRequestBody);

  if (!titleElement || !bodyElement) {
    return callback(
      new Error(
        "Pull request form elements not found. Make sure you're on the PR creation/edit page."
      )
    );
  }

  try {
    titleElement.value = title;
    bodyElement.value = description;

    // Trigger input events to ensure GitHub's UI updates
    titleElement.dispatchEvent(new Event("input", { bubbles: true }));
    bodyElement.dispatchEvent(new Event("input", { bubbles: true }));

    callback(null, { success: true });
  } catch (error) {
    callback(error);
  }
}

// GitHub specific extraction
function extractGitHubChanges() {
  const headers = document.querySelectorAll(GITHUB_SELECTORS.reposHeader);
  const fileNameAndCodes = [];

  for (const header of headers) {
    const extractedData = extractGitHubFileData(header);
    if (extractedData) {
      fileNameAndCodes.push(extractedData);
    }
  }

  return fileNameAndCodes;
}

function extractGitHubFileData(header) {
  const fileNameElement = header.querySelector(GITHUB_SELECTORS.fileName);

  if (!fileNameElement) {
    console.log("No filename found for header");
    return null;
  }

  const diffContent = [];
  const deletions = header.querySelectorAll(GITHUB_SELECTORS.deletionLine);
  const additions = header.querySelectorAll(GITHUB_SELECTORS.additionLine);

  // Process deletions
  deletions.forEach((line) => {
    const content = line.textContent.trim();
    if (content) {
      diffContent.push({ type: "removed", content });
    }
  });

  // Process additions
  additions.forEach((line) => {
    const content = line.textContent.trim();
    if (content) {
      diffContent.push({ type: "added", content });
    }
  });

  return {
    fileName: fileNameElement.getAttribute("data-path"),
    changes: diffContent,
  };
}

// GitHub-specific scroll and extract
function handleGitHubExtraction(callback) {
  // Find the content viewer directly
  const viewer =
    document.querySelector(GITHUB_SELECTORS.reposViewer) ||
    document.querySelector(GITHUB_SELECTORS.reposViewerBackup);

  if (!viewer) {
    console.error("Content viewer not found with any selector");
    return callback(
      new Error(
        "GitHub changes viewer not found. Please make sure you're on a pull request page."
      )
    );
  }

  // Scroll to load all content
  viewer.scrollTo({
    top: viewer.scrollHeight,
    behavior: "smooth",
  });

  // Wait for content to load and scroll back
  setTimeout(() => {
    viewer.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    // Extract and format changes
    try {
      const changes = extractGitHubChanges();
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
  }, 1000); // Reduced wait time since we don't need to wait for tab switch
}

// Make functions globally available
window.getGitHubFileName = getGitHubFileName;
window.handleGitHubExtraction = handleGitHubExtraction;
window.GITHUB_SELECTORS = GITHUB_SELECTORS;
window.getGitHubPRDetails = getGitHubPRDetails;
window.setGitHubPRDetails = setGitHubPRDetails;
