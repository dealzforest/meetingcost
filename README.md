# Meeting Cost Tracker

A Teams app for tracking meeting costs in real-time using Azure Functions architecture.

## Features

- 💰 **Dual Cost Estimates** - Shows 30-minute and 1-hour meeting cost projections
- 👥 **Real-time Participant Tracking** - See who's joined with polling-based updates
- ☁️ **Serverless Architecture** - Azure Functions backend with HTTP polling
- 📊 **Cost Analytics** - View individual costs, averages, and totals
- ⚡ **Simplified Setup** - No WebSocket dependencies, serverless-friendly

## Prerequisites

- Node.js 18 or higher
- Azure Functions Core Tools: `npm install -g azure-functions-core-tools@4 --unsafe-perm true`
- Microsoft Teams account with admin privileges
- Azure App Registration

## Project Structure

```
├── frontend/          # React app (Vite + TypeScript)
├── backend/           # Azure Functions (joinMeeting, updateRate, getMeetingData)
├── appPackage/        # Teams app manifest
└── package.json       # Root workspace configuration
```

## Setup & Development

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

2. **Start development environment:**
   ```bash
   npm run dev
   ```
   This runs both frontend (port 3000) and backend (port 7071) concurrently.

3. **Environment Configuration:**
   - Frontend uses `VITE_API_BASE_URL=http://localhost:7071/api` (already configured in `frontend/.env`)
   - Backend uses Azure Functions configuration in `backend/local.settings.json`

4. **Set up ngrok tunnel for Teams:**
   ```bash
   ngrok http 3000
   ```
   Copy the HTTPS URL for the Teams manifest.

### 3. Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com) → **App registrations**
2. Click **"New registration"**
3. Configure:
   - **Name**: `Meeting-Cost-Tracker`
   - **Supported account types**: `Accounts in any organizational directory (Any Azure AD directory - Multitenant)`
   - **Redirect URI**: Leave blank for now
4. Copy the **Application (client) ID** - you'll need this for the manifest

#### Add API Permissions (Optional)

The app now works without special API permissions, but you can optionally add basic permissions:

1. Go to **API permissions** → **Add a permission**
2. Select **Microsoft Graph** → **Delegated permissions**
3. Add these permissions (optional):
   - `User.Read` (basic user info)
4. Click **Grant admin consent for [Your Organization]**

### 4. Update App Manifest

Edit `appPackage/manifest.json`:

```json
{
  "webApplicationInfo": {
    "id": "YOUR_AZURE_APP_CLIENT_ID"
  },
  "developer": {
    "websiteUrl": "https://your-ngrok-url.ngrok-free.app",
    "privacyUrl": "https://your-ngrok-url.ngrok-free.app/privacy",
    "termsOfUseUrl": "https://your-ngrok-url.ngrok-free.app/terms"
  },
  "configurableTabs": [
    {
      "configurationUrl": "https://your-ngrok-url.ngrok-free.app/config"
    }
  ],
  "validDomains": [
    "your-ngrok-url.ngrok-free.app"
  ]
}
```

## Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:frontend` - Start only the React frontend (port 3000)
- `npm run dev:backend` - Start only the Azure Functions backend (port 7071)
- `npm run build` - Build both frontend and backend for production
- `npm run install:all` - Install dependencies for all projects

### 6. Create Teams App Package

```bash
cd appPackage
zip -r MeetingCostTracker-v1.0.28.zip manifest.json color.png outline.png
```

### 7. Deploy to Teams

1. Go to [Teams Admin Center](https://admin.teams.microsoft.com)
2. Navigate to **Teams apps** → **Manage apps**
3. Click **Upload new app** → Upload your zip file
4. The app requires no special permissions and should work immediately

## Teams Configuration

The app now uses a simplified approach and requires no special Teams configuration or RSC permissions. Simply upload and use!

### Add App to Meeting

1. **Schedule a meeting** in Teams or use "Meet Now"
2. In the meeting, click **Apps** → **Meeting Cost Tracker**
3. The app will appear in the side panel and show 30min/1hr cost estimates

## Architecture

- **Frontend**: React app with polling-based real-time updates (every 5 seconds)
- **Backend**: Azure Functions with HTTP triggers (`joinMeeting`, `updateRate`, `getMeetingData`)
- **Storage**: In-memory storage with automatic 24-hour cleanup (`functionAppScaleLimit: 1` for consistency)
- **Communication**: HTTP REST API with 5-second polling for real-time feel
- **Data Management**: Meetings auto-deleted after 24 hours, single function instance prevents data inconsistency

## Deployment

1. **Frontend**: Deploy to Azure Static Web Apps or any static hosting
2. **Backend**: Deploy to Azure Functions
3. **Teams App**: Upload manifest from `appPackage/` to Teams Admin Center

## Troubleshooting

### Common Issues

#### No Common Issues
- **The app now uses a simplified approach with no complex API dependencies**
- **No RSC permissions required**
- **Works in both scheduled meetings and "Meet Now" scenarios**

#### Azure Functions Not Responding
- **Cause**: Backend not running or wrong port
- **Solution**: Start backend with `npm run dev:backend` (should run on port 7071)

#### App Not Loading in Teams
- **Cause**: ngrok URL changed or manifest not updated
- **Solution**: 
  1. Update manifest with current ngrok URL
  2. Re-zip and re-upload the app package

### Debug Console Logs

The app should work without console errors. If you see API connection issues:
1. Ensure Azure Functions backend is running on port 7071
2. Check that all three functions are loaded: `joinMeeting`, `updateRate`, `getMeetingData`
3. Verify frontend can reach `http://localhost:7071/api`

## API Reference

### Teams SDK APIs Used

- `microsoftTeams.app.initialize()` - Initialize Teams context
- `microsoftTeams.app.getContext()` - Get meeting/user context

### Azure Functions API Endpoints

- `POST /api/meeting/join` - Join meeting and add participant
- `POST /api/meeting/update-rate` - Update participant hourly rate
- `GET /api/meeting/{meetingId}` - Get meeting data and participants

### Polling Mechanism

- Frontend polls backend every 5 seconds for real-time updates
- No WebSocket connections needed
- Serverless-friendly architecture

## Production Deployment

### 1. Deploy Frontend

Deploy the React app to any hosting service:
- **Azure Static Web Apps**
- **Vercel**
- **Netlify**
- **GitHub Pages**

### 2. Deploy Backend

Deploy the Azure Functions:
- **Azure Functions** (recommended)
- **Azure Container Instances**
- Set `functionAppScaleLimit: 1` in production host.json for data consistency

### 3. Update Manifest

Update `appPackage/manifest.json` with production URLs and redeploy to Teams Admin Center.

### 4. Multi-tenant Considerations

For multi-tenant deployment:
- Set Azure App Registration to **multi-tenant**
- Implement tenant-specific configuration
- Add proper error handling for different tenant policies

## Design Decisions

### Simplified Cost Estimation Approach

The app shows **30-minute and 1-hour cost estimates** instead of attempting automatic meeting duration detection because:
- The `getMeetingDetails()` API is Microsoft-internal only
- No complex RSC permissions or backend services required
- Works reliably across all meeting types (scheduled, "Meet Now", ad-hoc)
- Provides immediate value without permission barriers

### In-Memory Storage with Single Instance

- Uses `global.meetings = {}` for simplicity and zero cost
- `functionAppScaleLimit: 1` prevents data inconsistency across instances
- Automatic 24-hour cleanup prevents memory bloat
- Acceptable data loss trade-off for meeting cost tracking use case

### HTTP Polling vs WebSocket

- 5-second polling provides near real-time experience
- Serverless-friendly (no persistent connections)
- Works with Azure Functions scaling and cold starts
- Simpler than Azure SignalR Service integration

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Teams app development documentation
3. Check console logs for debugging information

---

**Note**: This app now works without special Teams admin privileges or complex configuration. Simply upload and use!