# Git Pull Request Helper

A browser extension that helps you extract and analyze code changes from pull requests, making code review more efficient and organized.

## Features

<<<<<<< Updated upstream
- Quick access to pull request changes through a convenient popup interface
- Extract code changes from your current branch
- Clean and modern user interface with a professional design
- Seamless integration with Git platforms
=======
- **Multi-Platform Support**

  - Seamless integration with GitHub and Azure DevOps
  - Platform-specific handling for different PR interfaces
  - Automatic platform detection and status indication

- **Smart Code Analysis**

  - Extracts code changes from pull requests
  - Identifies additions and deletions in code
  - Organizes changes by file for easy review
  - Integrates with Gemini AI for automated code review suggestions

- **Modern User Interface**

  - Clean and intuitive popup interface
  - Real-time platform status indication
  - Responsive design with smooth animations
  - Custom-styled code display with syntax highlighting

- **Advanced Functionality**
  - Automatic PR description generation
  - Copy changes to clipboard
  - Regenerate analysis on demand
  - Scroll synchronization for large PRs

## Technical Implementation

### Architecture

The extension is built with a modular architecture:

- **Background Service Worker** (`background.js`)

  - Handles Gemini AI integration for code review
  - Manages message passing between components
  - Processes code changes and generates review summaries

- **Platform-Specific Handlers**

  - `github-handler.js`: GitHub-specific code extraction
  - `azure-handler.js`: Azure DevOps-specific code extraction
  - Custom selectors and DOM manipulation for each platform

- **UI Components**
  - Popup interface with real-time status updates
  - Results page for displaying analyzed changes
  - Custom CSS with CSS variables for theming

### Core Features Implementation

1. **Code Extraction**

   - Uses platform-specific selectors to identify code changes
   - Handles both added and removed code segments
   - Maintains file structure and context

2. **Change Analysis**

   - Processes diffs using DOM traversal
   - Formats changes for AI analysis
   - Generates structured summaries

3. **AI Integration**
   - Connects with Gemini AI for code review
   - Processes responses into formatted explanations
   - Generates PR descriptions and summaries
>>>>>>> Stashed changes

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

The extension requires the following environment variables to be set in your `.env` file:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here
```

### Environment Variables Description

- `GEMINI_API_KEY`: Your Google Gemini AI API key (required)

## Usage

1. Navigate to your pull request
2. Click the extension icon in your browser toolbar
3. Click "Extract Changes" to analyze the code changes
4. Review the extracted changes in an organized format

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

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have suggestions for improvements, please open an issue in the GitHub repository.
