# Microsoft 365 Integration - Quick Setup

## For IT Administrators

### Step 1: Azure AD App Registration
1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Click "New registration"
3. Fill in:
   - **Name**: Task Management Calendar Integration
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: Web → `https://your-replit-domain.replit.app`
4. Click "Register"

### Step 2: Configure Permissions
1. In your new app, go to "API permissions"
2. Click "Add a permission" → Microsoft Graph → Delegated permissions
3. Add these permissions:
   - `Calendars.Read`
   - `Calendars.ReadWrite`
   - `User.Read`
4. Click "Grant admin consent" (if you have admin rights)

### Step 3: Configure Environment
1. Copy the "Application (client) ID" from the app overview
2. Add it to your Replit environment variables:
   - Variable name: `MICROSOFT_CLIENT_ID`
   - Value: [your-client-id]

### Step 4: Test Connection
1. Refresh the task management application
2. You should see the Microsoft 365 integration panel
3. Click "Connect to Microsoft 365" to test

---

## For End Users (After IT Setup)

Once IT has configured the integration:

1. **Look for the Integration Panel**: You'll see a "Microsoft 365 Integration" section in your task management interface
2. **Click "Connect to Microsoft 365"**: This opens a secure Microsoft login popup
3. **Sign in with your work account**: Use your normal Microsoft 365 credentials
4. **Grant permissions**: You'll see a consent screen asking for calendar read permissions
5. **Start syncing**: Once connected, click "Sync Calendar" to import your events

The integration will show your Outlook calendar events alongside your tasks, helping you see your complete schedule in one place.