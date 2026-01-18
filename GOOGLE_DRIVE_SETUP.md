# Google Drive Upload Setup Guide

This guide will help you set up the file upload feature to Google Drive on your portfolio website.

## Prerequisites

- A Google account
- Access to Google Cloud Console

## Step-by-Step Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "Portfolio Upload")
5. Click "Create"

### 2. Enable Google Drive API

1. In your Google Cloud project, go to **APIs & Services** > **Library**
2. Search for "Google Drive API"
3. Click on "Google Drive API"
4. Click **Enable**

### 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - Choose "External" (unless you have a Google Workspace account)
   - Fill in the required information:
     - App name: Your portfolio name
     - User support email: Your email
     - Developer contact email: Your email
   - Click "Save and Continue" through the steps
   - **Important**: Under "Test users", click "ADD USERS" and add email addresses of people who will use the upload feature (this prevents the "unverified app" warning for them)
   - Note: The `drive` scope requires app verification for public use, but test users can use it without verification
4. Back in Credentials, click **Create Credentials** > **OAuth client ID** again
5. Select **Web application** as the application type
6. Name it (e.g., "Portfolio Web Client")
7. Under **Authorized JavaScript origins**, add:
   - `http://localhost:8000` (for local development)
   - `https://yourdomain.com` (your production domain)
8. Under **Authorized redirect URIs**, add:
   - `http://localhost:8000` (for local development)
   - `https://yourdomain.com` (your production domain)
9. Click **Create**
10. Copy the **Client ID** (you'll need this)

### 4. Create an API Key

1. Still in **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API key**
3. Copy the API key (you'll need this)
4. (Optional) Click "Restrict key" for security:
   - Under "API restrictions", select "Restrict key"
   - Choose "Google Drive API"
   - Click "Save"

### 5. Configure Your Website

1. Open `google-drive-config.js` in your project
2. Replace `YOUR_CLIENT_ID_HERE` with your OAuth Client ID
3. Replace `YOUR_API_KEY_HERE` with your API Key
4. (Optional) Set a default folder ID if you want all uploads to go to a specific folder:
   - Open the folder in Google Drive
   - Copy the ID from the URL: `https://drive.google.com/drive/folders/FOLDER_ID`
   - Replace `GOOGLE_DRIVE_DEFAULT_FOLDER_ID` with that ID

### 6. Test the Upload Feature

1. Start your local server (e.g., `python3 -m http.server 8000`)
2. Navigate to `http://localhost:8000`
3. Click on "Upload" in the navigation
4. Click "Sign in with Google"
5. Authorize the application
6. Select files to upload
7. Click "Upload All Files"

## Finding a Folder ID

If you want to upload files to a specific Google Drive folder:

1. Open the folder in Google Drive
2. Look at the URL: `https://drive.google.com/drive/folders/abc123xyz`
3. The folder ID is the part after `/folders/` (e.g., `abc123xyz`)
4. Enter this ID in the "Folder ID" field, or set it as the default in `google-drive-config.js`

## Security Notes

- **Never commit** `google-drive-config.js` with real credentials to a public repository
- Use environment variables or a backend service for production
- Restrict your API key to Google Drive API only
- Regularly rotate your API keys
- Use OAuth scopes that grant minimum required permissions

## Troubleshooting

### "Configuration Required" Error

- Make sure you've set both `GOOGLE_CLIENT_ID` and `GOOGLE_API_KEY` in `google-drive-config.js`
- Verify the values are correct (no extra spaces)
- Check the browser console for detailed error messages

### Authentication Fails

- Verify your OAuth client is configured for web applications
- Check that your domain is in "Authorized JavaScript origins"
- Ensure the OAuth consent screen is configured
- Check if your account needs to be added as a test user

### Files Don't Upload

- Check browser console for errors
- Verify you've authorized the Google Drive API
- Ensure the folder ID (if used) is correct
- Check network requests in browser DevTools

### CORS Errors

- Make sure your domain is added to "Authorized JavaScript origins"
- Verify you're using HTTPS in production (or localhost for development)

## Production Deployment

For production, consider:

1. **Environment Variables**: Store credentials as environment variables
2. **Backend Proxy**: Use a backend service to handle API calls and keep credentials secure
3. **Restricted API Keys**: Restrict your API key to specific APIs and domains
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Error Logging**: Set up error logging to monitor issues

## Alternative: Using a Backend Service

For better security, consider creating a backend service (Node.js, Python, etc.) that:
- Stores credentials securely
- Handles OAuth flow server-side
- Processes file uploads to Google Drive
- Provides an API endpoint for your frontend

This keeps your credentials secure and prevents exposing them to the client.
