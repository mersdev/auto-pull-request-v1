# Azure DevOps Code Changes Analyzer

A Chrome extension that automatically extracts and analyzes code changes from Azure DevOps pull requests using Google's Gemini AI.

## Features

- 🔍 Automatically extracts code changes from Azure DevOps pull requests
- 🤖 Uses Gemini AI to provide intelligent code change analysis
- 📊 Shows detailed statistics for added and removed lines
- 💡 Provides concise summaries and important implementation details
- 🎨 Modern UI with Shadcn/UI styling

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/auto-pull-request-v1.git
cd auto-pull-request-v1
```

2. Create a `.env` file in the root directory and add your Gemini API key:

```bash
GEMINI_API_KEY=your_api_key_here
```

3. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the extension directory

## Usage

1. Navigate to any Azure DevOps pull request
2. Click the extension icon in your Chrome toolbar
3. Click "Extract Changes" to analyze the code
4. View the detailed changes and AI-generated explanation

## Project Structure

```
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
├── background.js         # Background script for API calls
├── content.js            # Content script for page interaction
├── styles.css            # UI styling
└── .env                  # Environment variables (not tracked in git)
```

## Development

### Prerequisites

- Google Chrome browser
- Gemini API key (get one from [Google AI Studio](https://makersuite.google.com/app/apikey))
- Node.js and npm (optional, for development)

### Local Development

1. Make changes to the code
2. Reload the extension in Chrome
3. Test your changes

### Building for Production

1. Update version in `manifest.json`
2. Create a zip file of the extension:

```bash
zip -r extension.zip . -x "*.git*" "*.env*" "README.md"
```

## Security

- API keys are stored in `.env` file (not tracked in git)
- Content Security Policy (CSP) implemented
- Secure communication between content script and background script
- No sensitive data is stored or transmitted

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Error Handling

The extension handles various error cases:

- Invalid/missing API key
- Network connectivity issues
- Rate limiting
- Invalid response formats
- Missing required fields

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [Google Gemini AI](https://deepmind.google/technologies/gemini/) for code analysis
- [Shadcn/UI](https://ui.shadcn.com/) for UI components
- Azure DevOps team for their platform
