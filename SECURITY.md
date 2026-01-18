# Security Guide for Google Drive Upload Feature

## Overview

This document explains how to securely deploy the Google Drive upload feature on GitHub Pages.

## Important Security Notes

⚠️ **Client-Side API Keys**: Since this is a client-side application, the Google API key will be visible in the browser. This is expected and acceptable for client-side applications, but you MUST restrict the API key in Google Cloud Console.

## Security Best Practices

### 1. Restrict API Key in Google Cloud Console

**CRITICAL**: Restrict your API key to prevent unauthorized use:

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials?project=umeshg17)
2. Click on your API key
3. Under "API restrictions":
   - Select "Restrict key"
   - Choose "Google Drive API" only
4. Under "Application restrictions":
   - Select "HTTP referrers (web sites)"
   - Add your domains:
     - `http://localhost:8000/*` (for local development)
     - `https://umesh.eqclip.in/*` (for production)
     - `https://*.github.io/*` (if using GitHub Pages default domain)
5. Click "Save"

### 2. OAuth Client ID Restrictions

The OAuth Client ID is meant to be public, but you should still restrict it:

1. Go to your OAuth 2.0 Client ID settings
2. Under "Authorized JavaScript origins", add:
   - `http://localhost:8000`
   - `https://umesh.eqclip.in`
3. Under "Authorized redirect URIs", add:
   - `http://localhost:8000`
   - `https://umesh.eqclip.in`

### 3. Using GitHub Secrets

For deployment, use GitHub Secrets to store credentials:

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `GOOGLE_CLIENT_ID`: Your OAuth Client ID
   - `GOOGLE_API_KEY`: Your API Key
   - `GOOGLE_DRIVE_DEFAULT_FOLDER_ID`: Your default folder ID (optional)

The GitHub Actions workflow will automatically inject these during deployment.

### 4. Local Development

For local development:

1. Copy `google-drive-config.js.template` to `google-drive-config.js`
2. Fill in your credentials
3. `google-drive-config.js` is in `.gitignore` and won't be committed

### 5. Folder Permissions

- Share your Google Drive folder with appropriate permissions
- For public uploads: Share with "Anyone with the link" → "Editor"
- For restricted uploads: Add specific email addresses

## What's Safe to Commit

✅ **Safe to commit:**
- `google-drive-config.js.template` (template file)
- All other source files
- `.gitignore` (which excludes the actual config file)

❌ **Never commit:**
- `google-drive-config.js` (actual config with credentials)
- Any files containing API keys or secrets

## Monitoring and Alerts

1. **Monitor API Usage**: Check Google Cloud Console regularly for unusual API usage
2. **Set Up Quotas**: Set daily/monthly quotas for your API key
3. **Review Access Logs**: Regularly review who has access to your Google Drive folder

## If Your API Key is Compromised

If you suspect your API key has been compromised:

1. **Immediately revoke the key** in Google Cloud Console
2. Create a new API key
3. Update the GitHub Secret
4. Redeploy your site

## Additional Security Measures

- Use separate API keys for development and production
- Regularly rotate API keys (every 90 days recommended)
- Enable Google Cloud audit logs
- Set up billing alerts in Google Cloud Console

## Questions?

Refer to:
- [Google Cloud API Key Security](https://cloud.google.com/docs/authentication/api-keys)
- [OAuth 2.0 Best Practices](https://oauth.net/2/)
