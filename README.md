# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/d1870b16-3378-4e57-8d75-63522444d028

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/d1870b16-3378-4e57-8d75-63522444d028) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Document Scanning (OCR) Features

The app supports document scanning in Cost Management with two OCR engines:

### 1. Tesseract.js (Default)
- **Free and open-source**
- Works offline
- Supports multiple languages (Serbian, Croatian, English)
- No API key required

### 2. Google Gemini AI (Optional)
- **More accurate** AI-powered extraction
- Better at understanding document context
- Requires Google Gemini API key

#### Setting up Gemini AI:

1. Get a Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a `.env.local` file in the root directory
3. Add your API key:
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```
4. Restart the development server
5. In Cost Management, select "Gemini AI" from the OCR engine dropdown

**Note**: If no API key is set, the app will automatically use Tesseract OCR.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/d1870b16-3378-4e57-8d75-63522444d028) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
