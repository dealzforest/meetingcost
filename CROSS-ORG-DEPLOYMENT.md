# Teams App Cross-Organization Deployment Guide

How to use a Microsoft Teams app built for one organization in another organization.

## Method 1: Sideloading (Manual Installation)

### Step 1: Package Your App

Create a .zip file containing:
- `manifest.json`
- `color.png` (app icon)
- `outline.png` (app outline icon)

```bash
cd appPackage/
zip -r ../meeting-cost-tracker-app.zip ./*
```

### Step 2: Share the Package

Send the `.zip` file to the target organization along with installation instructions.

### Step 3: Target Organization Setup

**Admin Requirements:**
1. Go to **Teams Admin Center**
2. Navigate to **Teams apps** → **Setup policies**
3. Enable **"Allow uploading custom apps"**
4. Assign policy to users who need the app

### Step 4: Install in Target Organization

**For End Users:**
1. Open Microsoft Teams
2. Go to **Apps** (left sidebar)
3. Click **Upload a custom app**
4. Select **Upload for me** or **Upload for [team name]**
5. Choose the `.zip` file
6. Click **Add** to install

### Step 5: Configure for New Organization

**IMPORTANT: Update the manifest.json placeholders before packaging:**

The manifest.json contains placeholders that must be replaced:

```json
{
  "id": "{{YOUR_APP_ID}}",
  "developer": {
    "name": "{{YOUR_COMPANY_NAME}}",
    "websiteUrl": "{{YOUR_WEBSITE_URL}}",
    "privacyUrl": "{{YOUR_WEBSITE_URL}}/privacy",
    "termsOfUseUrl": "{{YOUR_WEBSITE_URL}}/terms"
  },
  "configurableTabs": [
    {
      "configurationUrl": "{{YOUR_BASE_URL}}/config"
    }
  ],
  "validDomains": [
    "{{YOUR_DOMAIN}}"
  ],
  "webApplicationInfo": {
    "id": "{{YOUR_AZURE_APP_ID}}"
  }
}
```

**Replace these placeholders:**

1. **{{YOUR_APP_ID}}** → Generate a new GUID/Or Remove Id (e.g., `7381a343-bd78-40c0-89b5-de67fa9bd419`)
2. **{{YOUR_COMPANY_NAME}}** → Your organization name (e.g., `"innoview"`)
3. **{{YOUR_WEBSITE_URL}}** → Your website (e.g., `"https://www.acme.com"`)
4. **{{YOUR_BASE_URL}}** → Your app URL (e.g., `"https://meeting-cost-tracker-app.accesspearl.in"`)
5. **{{YOUR_DOMAIN}}** → Your domain (e.g., `"meeting-cost-tracker-app.accesspearl.in"`)
6. **{{YOUR_AZURE_APP_ID}}** → Your Azure AD App ID (e.g., `"7ac87d4b-dfe8-429e-a79c-04f2349a9f84"`)
