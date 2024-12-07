// GitHub-specific selectors
const GITHUB_SELECTORS = {
  fileName: ".file-header[data-path]",
  diffElement: ".file",
  diffTable: ".diff-table tr",
  deletionLine: ".blob-code-deletion",
  additionLine: ".blob-code-addition",
  filesTab: ".js-pull-request-tab[data-tab-item='files']",
  reposViewer: ".pull-request-tab-content",
};

// Extract file names for GitHub
function getGitHubFileName(sendResponse) {
  const fileNameElements = document.querySelectorAll(GITHUB_SELECTORS.fileName);
  if (fileNameElements.length > 0) {
    const fileNames = Array.from(fileNameElements).map((el) =>
      el.getAttribute("data-path")
    );
    sendResponse({ fileName: fileNames[0], platform: "github" });
  }
}

// GitHub specific extraction
function extractGitHubChanges() {
  const changes = [];
  const diffElements = document.querySelectorAll(GITHUB_SELECTORS.diffElement);

  diffElements.forEach((diffElement) => {
    const fileName = diffElement
      .querySelector(GITHUB_SELECTORS.fileName)
      .getAttribute("data-path");
    const removedLines = [];
    const addedLines = [];

    // Get all diff content lines
    const diffLines = diffElement.querySelectorAll(GITHUB_SELECTORS.diffTable);
    diffLines.forEach((line) => {
      if (line.classList.contains("deletion")) {
        const code = line.querySelector(
          GITHUB_SELECTORS.deletionLine
        )?.textContent;
        if (code) removedLines.push(code.trim());
      } else if (line.classList.contains("addition")) {
        const code = line.querySelector(
          GITHUB_SELECTORS.additionLine
        )?.textContent;
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

// GitHub-specific scroll and extract
function handleGitHubExtraction(callback) {
  const filesTab = document.querySelector(GITHUB_SELECTORS.filesTab);
  const viewer = document.querySelector(GITHUB_SELECTORS.reposViewer);

  if (!filesTab || !viewer) {
    return callback(new Error("GitHub files tab or viewer not found"));
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
      const changes = extractGitHubChanges();
      callback(null, changes);
    }, 3000);
  }, 2000);
}

export {
  getGitHubFileName,
  extractGitHubChanges,
  handleGitHubExtraction,
  GITHUB_SELECTORS,
};
