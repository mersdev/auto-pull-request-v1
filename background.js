// Load environment variables
let GEMINI_API_KEY;

// Function to load API key from .env
async function loadApiKey() {
  try {
    const response = await fetch(chrome.runtime.getURL(".env"));
    const text = await response.text();
    const envVars = text.split("\n").reduce((acc, line) => {
      const [key, value] = line.split("=");
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {});

    GEMINI_API_KEY = envVars.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not found in .env file");
    }
  } catch (error) {
    console.error("Error loading API key:", error);
    throw error;
  }
}

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// Function to test if Gemini API is available
async function testGeminiAvailability() {
  try {
    // Ensure API key is loaded
    if (!GEMINI_API_KEY) {
      await loadApiKey();
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Hi",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Gemini test response:", data);
    return true;
  } catch (error) {
    console.error("Gemini test failed:", error);
    if (error.message.includes("401")) {
      throw new Error(
        "Invalid API key. Please check your Gemini API key in .env file."
      );
    } else if (error.message.includes("429")) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    throw error;
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EXPLAIN_CHANGES") {
    const changes = message.changes;

    // Format the changes for the prompt
    const prompt = changes
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

    // First test Gemini availability
    testGeminiAvailability()
      .then(async () => {
        // Ensure API key is loaded
        if (!GEMINI_API_KEY) {
          await loadApiKey();
        }

        // If Gemini is available, proceed with the explanation request
        return fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are a code review assistant. Please analyze the following code changes and provide a response in valid JSON format with exactly these fields:
                {
                  "title": "A concise one-line summary of the main changes",
                  "desc": "A description that includes:
                    - Key changes and their purpose
                    - Important implementation details 
                    - Any breaking changes or dependencies
                    - Testing considerations"
                }

                IMPORTANT: Your response must be ONLY the JSON object, nothing else.
                Do not include any explanations or markdown formatting.
                The response must be valid JSON that can be parsed with JSON.parse().

                Changes to analyze:
                ${prompt}`,
                  },
                ],
              },
            ],
          }),
        });
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.error) {
          throw new Error(data.error.message || "Unknown error occurred");
        }

        // Extract and validate the response text
        const responseText = data.candidates[0].content.parts[0].text.trim();
        console.log("Raw Gemini response:", responseText);

        // Try to parse the response as JSON
        try {
          // Remove any potential markdown code block markers
          const cleanedResponse = responseText
            .replace(/```json\n?|\n?```/g, "")
            .trim();
          const parsedExplanation = JSON.parse(cleanedResponse);

          // Validate the required fields
          if (!parsedExplanation.title || !parsedExplanation.desc) {
            throw new Error("Response missing required fields");
          }

          // Send the explanation back to the content script
          console.log("Processed explanation:", parsedExplanation);
          chrome.tabs.sendMessage(sender.tab.id, {
            type: "EXPLANATION_RESULT",
            explanation: JSON.stringify(parsedExplanation),
          });
        } catch (parseError) {
          console.error("Failed to parse Gemini response:", parseError);
          throw new Error("Invalid response format from Gemini API");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        let errorMessage = "An unexpected error occurred.";

        if (error.message.includes("401")) {
          errorMessage =
            "Error: Invalid API key. Please check your Gemini API key in .env file.";
        } else if (error.message.includes("429")) {
          errorMessage = "Error: Rate limit exceeded. Please try again later.";
        } else if (error.message.includes("Failed to fetch")) {
          errorMessage =
            "Error: Failed to connect to Gemini API. Please check your internet connection.";
        } else if (error.message.includes("GEMINI_API_KEY not found")) {
          errorMessage =
            "Error: GEMINI_API_KEY not found in .env file. Please add your API key.";
        } else if (error.message.includes("Invalid response format")) {
          errorMessage =
            "Error: Received invalid response format. Please try again.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }

        chrome.tabs.sendMessage(sender.tab.id, {
          type: "EXPLANATION_RESULT",
          explanation: errorMessage,
        });
      });
  } else if (message.type === "EXPLANATION_TO_POPUP") {
    // Forward explanation to popup
    chrome.runtime.sendMessage(message);
  }
  return true; // Required for async response
});
