// Microsoft Outlook Calendar Integration
// Handles OAuth authentication and calendar sync with Microsoft Graph API

class OutlookIntegration {
    constructor() {
        this.accessToken = null;
        this.isAuthenticated = false;
        this.clientId = null; // Will be set from environment or user input
        this.redirectUri = `${window.location.origin}/auth/callback`;
        this.scopes = 'https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/User.Read';
        this.authEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
        this.tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
        
        this.init();
    }

    async init() {
        console.log('Initializing Outlook integration...');
        
        // Check if we have a stored access token
        const storedToken = localStorage.getItem('outlook_access_token');
        const tokenExpiry = localStorage.getItem('outlook_token_expiry');
        
        if (storedToken && tokenExpiry && new Date() < new Date(tokenExpiry)) {
            this.accessToken = storedToken;
            this.isAuthenticated = true;
            console.log('Using stored Outlook access token');
        }
        
        // Check for auth callback
        this.handleAuthCallback();
    }

    async authenticate() {
        if (!this.clientId) {
            throw new Error('Microsoft Graph Client ID not configured. Please set MICROSOFT_CLIENT_ID environment variable.');
        }

        const authUrl = `${this.authEndpoint}?client_id=${this.clientId}&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${encodeURIComponent(this.scopes)}&response_mode=query`;
        
        // Open auth window
        window.location.href = authUrl;
    }

    handleAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
            this.exchangeCodeForToken(code);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    async exchangeCodeForToken(code) {
        try {
            const response = await fetch(this.tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    scope: this.scopes,
                    code: code,
                    redirect_uri: this.redirectUri,
                    grant_type: 'authorization_code'
                })
            });

            const data = await response.json();
            
            if (data.access_token) {
                this.accessToken = data.access_token;
                this.isAuthenticated = true;
                
                // Store token and expiry
                const expiryTime = new Date(Date.now() + (data.expires_in * 1000));
                localStorage.setItem('outlook_access_token', data.access_token);
                localStorage.setItem('outlook_token_expiry', expiryTime.toISOString());
                
                console.log('Outlook authentication successful');
                window.notificationManager?.show('Outlook calendar connected successfully!', 'success');
                
                // Trigger calendar refresh
                this.syncCalendarEvents();
            } else {
                throw new Error('Failed to get access token');
            }
        } catch (error) {
            console.error('Token exchange failed:', error);
            window.notificationManager?.show('Failed to connect to Outlook calendar', 'error');
        }
    }

    async getCalendarEvents(startDate = null, endDate = null) {
        if (!this.isAuthenticated) {
            return [];
        }

        try {
            // Default to current month if no dates provided
            if (!startDate) {
                startDate = new Date();
                startDate.setDate(1);
            }
            if (!endDate) {
                endDate = new Date();
                endDate.setMonth(endDate.getMonth() + 1);
                endDate.setDate(0);
            }

            const startISO = startDate.toISOString();
            const endISO = endDate.toISOString();
            
            const url = `https://graph.microsoft.com/v1.0/me/events?$filter=start/dateTime ge '${startISO}' and end/dateTime le '${endISO}'&$orderby=start/dateTime&$top=100`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired
                    this.logout();
                    return [];
                }
                throw new Error(`Failed to fetch events: ${response.status}`);
            }

            const data = await response.json();
            return data.value || [];
        } catch (error) {
            console.error('Error fetching Outlook events:', error);
            return [];
        }
    }

    async syncCalendarEvents() {
        if (!this.isAuthenticated) {
            return;
        }

        try {
            const events = await this.getCalendarEvents();
            
            // Convert Outlook events to tasks
            const outlookTasks = await this.convertEventsToTasks(events);
            
            // Update the calendar view
            if (window.taskViews && typeof window.taskViews.refreshCalendar === 'function') {
                window.taskViews.refreshCalendar();
            }
            
            console.log(`Synced ${outlookTasks.length} Outlook events as tasks`);
            
        } catch (error) {
            console.error('Error syncing Outlook events:', error);
        }
    }

    async convertEventsToTasks(events) {
        const outlookTasks = [];
        
        for (const event of events) {
            // Check if we already have a task for this event
            const existingTaskId = `outlook_${event.id}`;
            
            // Create task object
            const task = {
                id: existingTaskId,
                title: event.subject || 'Untitled Meeting',
                description: this.formatEventDescription(event),
                dueDate: event.start.dateTime ? new Date(event.start.dateTime).toISOString().split('T')[0] : null,
                priority: 'medium',
                category: 'meeting',
                status: new Date(event.end.dateTime) < new Date() ? 'done' : 'todo',
                assignedTo: window.currentUser?.name || 'Unknown',
                createdAt: new Date().toISOString(),
                isOutlookEvent: true,
                outlookEventId: event.id,
                startTime: event.start.dateTime,
                endTime: event.end.dateTime,
                location: event.location?.displayName || '',
                attendees: event.attendees?.map(a => a.emailAddress.name).join(', ') || ''
            };
            
            outlookTasks.push(task);
            
            // Add to tasks collection if not already exists
            if (window.tasksData && !window.tasksData.find(t => t.id === existingTaskId)) {
                window.tasksData.push(task);
            }
        }
        
        return outlookTasks;
    }

    formatEventDescription(event) {
        let description = [];
        
        if (event.bodyPreview) {
            description.push(`Description: ${event.bodyPreview}`);
        }
        
        if (event.location?.displayName) {
            description.push(`Location: ${event.location.displayName}`);
        }
        
        if (event.attendees && event.attendees.length > 0) {
            const attendeeNames = event.attendees.map(a => a.emailAddress.name).join(', ');
            description.push(`Attendees: ${attendeeNames}`);
        }
        
        if (event.organizer) {
            description.push(`Organizer: ${event.organizer.emailAddress.name}`);
        }
        
        const startTime = new Date(event.start.dateTime).toLocaleString();
        const endTime = new Date(event.end.dateTime).toLocaleString();
        description.push(`Time: ${startTime} - ${endTime}`);
        
        if (event.webLink) {
            description.push(`Outlook Link: ${event.webLink}`);
        }
        
        return description.join('\n\n');
    }

    logout() {
        this.accessToken = null;
        this.isAuthenticated = false;
        localStorage.removeItem('outlook_access_token');
        localStorage.removeItem('outlook_token_expiry');
        console.log('Logged out of Outlook');
    }

    setClientId(clientId) {
        this.clientId = clientId;
    }

    getAuthStatus() {
        return {
            isAuthenticated: this.isAuthenticated,
            hasClientId: !!this.clientId
        };
    }
}

// Global instance
window.outlookIntegration = new OutlookIntegration();

export default OutlookIntegration;