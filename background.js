// Constants for configuration and error messages
const ERROR_MESSAGES = {
  INVALID_API_KEY:
    "Error: Invalid API key. Please check your Gemini API key in .env file.",
  RATE_LIMIT: "Error: Rate limit exceeded. Please try again later.",
  CONNECTION_FAILED:
    "Error: Failed to connect to Gemini API. Please check your internet connection.",
  API_KEY_NOT_FOUND:
    "Error: GEMINI_API_KEY not found in .env file. Please add your API key.",
  INVALID_RESPONSE:
    "Error: Received invalid response format. Please try again.",
  UNEXPECTED_ERROR: "An unexpected error occurred.",
};

const GEMINI_CONFIG = {
  BASE_URL:
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
  PROMPT_TEMPLATE: (
    changes
  ) => `You are a code review assistant. Please analyze the following code changes and provide a response in valid JSON format with exactly these fields:
{
  "title": "A concise one-line summary of the main changes",
  "sections": {
    "summary": ["Key points about the overall changes"],
    "implementation": ["Technical implementation details"],
    "impact": ["Breaking changes", "Dependencies affected"],
    "testing": ["Testing requirements", "Areas to focus testing"]
  }
}

IMPORTANT: 
- Your response must be ONLY the JSON object, nothing else.
- Do not include any explanations or markdown formatting.
- The response must be valid JSON that can be parsed with JSON.parse().
- Keep each point concise and actionable.
- Limit each section to 2-3 key points.

Example response:
{
  "title": "Added user authentication system",
  "sections": {
    "summary": ["Implements JWT-based authentication", "Adds user login/signup endpoints"],
    "implementation": ["Uses bcrypt for password hashing", "JWT tokens expire in 24h"],
    "impact": ["Requires environment variables for JWT_SECRET", "Updates to user model schema"],
    "testing": ["Add tests for auth middleware", "Verify token expiration handling"]
  }
}

Changes to analyze:
${changes}`,
};

// Global variable to store API key
let GEMINI_API_KEY = null;

// Function to load API key from .env file
async function loadApiKey() {
  try {
    const response = await fetch(chrome.runtime.getURL(".env"));
    const text = await response.text();
    const envVars = text.split("\n").reduce((acc, line) => {
      const [key, value] = line.split("=");
      return key && value ? { ...acc, [key.trim()]: value.trim() } : acc;
    }, {});

    GEMINI_API_KEY = envVars.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not found");
    return GEMINI_API_KEY;
  } catch (error) {
    console.error("Error loading API key:", error);
    throw error;
  }
}

// Function to test Gemini API availability
async function testGeminiAvailability() {
  if (!GEMINI_API_KEY) await loadApiKey();

  const response = await fetch(
    `${GEMINI_CONFIG.BASE_URL}?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hi" }] }],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return true;
}

// Function to format changes for prompt
function formatChanges(changes) {
  return changes
    .map(
      (file) => `
      File: ${file.fileName}
      Removed lines:
      ${file.removed.join("\n")}
      Added lines:
      ${file.added.join("\n")}
    `
    )
    .join("\n\n");
}

// Function to get code review from Gemini
async function getCodeReview(changes) {
  await testGeminiAvailability();

  const formattedChanges = formatChanges(changes);
  const prompt = GEMINI_CONFIG.PROMPT_TEMPLATE(formattedChanges);

  const response = await fetch(
    `${GEMINI_CONFIG.BASE_URL}?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          topK: 1,
          topP: 1,
        },
      }),
    }
  );

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || "Unknown error");
  if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
    throw new Error("Invalid response structure from Gemini API");
  }

  const responseText = data.candidates[0].content.parts[0].text
    .trim()
    .replace(/```json\n?|\n?```/g, "")
    .replace(/[\u201C\u201D]/g, '"') // Replace smart quotes with straight quotes
    .trim();

  try {
    const parsedResponse = JSON.parse(responseText);

    // Validate response structure
    if (
      !parsedResponse.title ||
      !parsedResponse.sections ||
      !parsedResponse.sections.summary ||
      !parsedResponse.sections.implementation ||
      !parsedResponse.sections.impact ||
      !parsedResponse.sections.testing
    ) {
      throw new Error("Missing required fields in response");
    }

    // Ensure all sections are arrays
    Object.keys(parsedResponse.sections).forEach((key) => {
      if (!Array.isArray(parsedResponse.sections[key])) {
        parsedResponse.sections[key] = [parsedResponse.sections[key]];
      }
    });

    return parsedResponse;
  } catch (error) {
    console.error("JSON parsing error:", error, "Response text:", responseText);
    throw new Error("Failed to parse Gemini API response");
  }
}

// Function to update overview tab with explanation
function updateOverviewTab(tabId, explanation) {
  const updateScript = {
    target: { tabId: tabId },
    func: (title, sections) => {
      function formatSections(sections) {
        return Object.entries(sections)
          .map(([section, points]) => {
            const sectionTitle =
              section.charAt(0).toUpperCase() + section.slice(1);
            const formattedPoints = points
              .map((point) => `• ${point}`)
              .join("\n");
            return `${sectionTitle}:\n${formattedPoints}`;
          })
          .join("\n\n");
      }

      function updateInputValue(input, value) {
        if (input) {
          input.value = value;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }

      function waitForElement(selector, maxAttempts = 10) {
        return new Promise((resolve, reject) => {
          let attempts = 0;

          const checkElement = () => {
            attempts++;
            const element = document.querySelector(selector);

            if (element) {
              resolve(element);
            } else if (attempts >= maxAttempts) {
              reject(
                new Error(
                  `Element ${selector} not found after ${maxAttempts} attempts`
                )
              );
            } else {
              setTimeout(checkElement, 500);
            }
          };

          checkElement();
        });
      }

      async function updateFields() {
        try {
          // Click overview tab
          const overviewTab = await waitForElement("#__bolt-tab-overview");
          overviewTab.click();

          // Wait for inputs and update them
          const [titleInput, descInput] = await Promise.all([
            waitForElement("#__bolt-textfield-input-4"),
            waitForElement("#__bolt-textfield-input-5"),
          ]);

          // Format description
          const formattedDescription = formatSections(sections);

          // Update fields
          updateInputValue(titleInput, title);
          updateInputValue(descInput, formattedDescription);

          console.log("Overview tab updated successfully");
        } catch (error) {
          console.error("Error updating overview tab:", error);
        }
      }

      // Start the update process
      updateFields();
    },
    args: [explanation.title, explanation.sections],
  };

  return chrome.scripting.executeScript(updateScript);
}

// Message listener for handling code review requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EXPLAIN_CHANGES") {
    getCodeReview(message.changes)
      .then((explanation) => {
        // Send explanation to popup
        chrome.tabs.sendMessage(sender.tab.id, {
          type: "EXPLANATION_RESULT",
          explanation: JSON.stringify(explanation),
        });

        // Update overview tab
        updateOverviewTab(sender.tab.id, explanation).catch((error) => {
          console.error("Error executing overview update script:", error);
        });
      })
      .catch((error) => {
        console.error("Error:", error);
        const errorMessage =
          Object.values(ERROR_MESSAGES).find((msg) =>
            error.message.includes(msg)
          ) || ERROR_MESSAGES.UNEXPECTED_ERROR;

        chrome.tabs.sendMessage(sender.tab.id, {
          type: "EXPLANATION_RESULT",
          explanation: errorMessage,
        });
      });
  } else if (message.type === "EXPLANATION_TO_POPUP") {
    chrome.runtime.sendMessage(message);
  }
  return true;
});
