# Git Pull Request Helper

A powerful browser extension that streamlines code reviews by providing AI-powered analysis and automated PR summaries for GitHub and Azure DevOps.

## Key Features

### 🔄 Smart Code Analysis

- Automatically extracts and categorizes code changes from pull requests
- Identifies additions and deletions with syntax-aware parsing
- Provides structured analysis of changes by file
- Generates comprehensive code review reports using Gemini AI

### 🌐 Multi-Platform Support

- Seamless integration with GitHub and Azure DevOps
- Platform-specific handlers for accurate code extraction
- Automatic platform detection and status indication
- Consistent experience across different Git platforms

### 🤖 AI-Powered Review Assistant

- Automated code review suggestions using Gemini AI
- Smart PR description generation
- Impact analysis and testing recommendations
- Technical implementation summaries

### 💬 Team Communication

- Generates formatted review messages for team communication
- Customizable PR descriptions with key changes highlighted
- One-click copy and share functionality
- Structured summaries for better team understanding

## Technical Implementation

### Platform Integration

```javascript
// Platform-specific handlers for accurate code extraction
const GITHUB_SELECTORS = {
  fileName: ".file-header[data-path]",
  reposHeader: ".file.js-file",
  deletionLine: ".blob-code-deletion .blob-code-inner",
  additionLine: ".blob-code-addition .blob-code-inner",
};

const AZURE_SELECTORS = {
  fileName: ".repos-summary-header .body-s.secondary-text.text-ellipsis",
  reposHeader: "repos-summary-header",
  codeContent: "repos-line-content",
};
```

### AI Integration

The extension uses Gemini AI to provide:

- Code change analysis
- PR description generation
- Impact assessment
- Testing recommendations

## Installation

1. Clone this repository

```bash
git clone https://github.com/mersdev/git-pull-request-helper.git
```

2. Set up Gemini AI API access:

   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the `.env.example` file to `.env`

   ```bash
   cp .env.example .env
   ```

   - Replace `your_gemini_api_key_here` with your actual API key in the `.env` file

3. Open Chrome/Edge and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right corner
5. Click "Load unpacked" and select the cloned repository folder

## Environment Variables

The extension requires the following environment variables in your `.env` file:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here

```

## Usage

1. Navigate to a pull request on GitHub or Azure DevOps
2. Click the extension icon in your browser toolbar
3. The extension will automatically detect the platform and show its status
4. Click "Extract Changes" to analyze the code changes
5. Review the generated:
   - Code analysis report
   - PR description
   - Review message for team
6. Use the copy/regenerate buttons to share with your team

## Features in Detail

### Code Analysis

- Extracts changes from pull requests
- Categorizes additions and deletions
- Provides file-by-file breakdown
- Generates structured analysis reports

### PR Message Generation

- Creates formatted PR descriptions
- Includes summary of changes
- Highlights key modifications
- Suggests testing focus areas

### Team Communication

- Generates review request messages
- Includes key changes and impact
- Provides formatted summaries
- Easy copy and share functionality

## Development

### Local Development

1. Make your changes to the source code
2. Reload the extension in your browser
3. Test the changes by using the extension

## Contributing

1. Fork the repository
2. Create a new branch for your feature
3. Commit your changes
4. Push to your branch
5. Open a pull request

## Support

If you encounter any issues or have suggestions for improvements:

1. Check the existing issues in the GitHub repository
2. Open a new issue with a detailed description
3. Include steps to reproduce any bugs
4. Attach relevant screenshots if applicable

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```

```
