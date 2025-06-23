/**
 * Microsoft Graph API Integration for Enterprise Task Management
 * Provides secure OAuth 2.0 authentication and calendar synchronization
 * Compliant with corporate security standards and Microsoft Graph best practices
 */

class MicrosoftGraphIntegration {
    constructor() {
        this.clientId = this.getEnvironmentConfig(); // Will be configured through environment variables
        this.authority = 'https://login.microsoftonline.com/common';
        this.scopes = [
            'https://graph.microsoft.com/Calendars.Read',
            'https://graph.microsoft.com/Calendars.ReadWrite',
            'https://graph.microsoft.com/User.Read'
        ];
        this.msalInstance = null;
        this.isAuthenticated = false;
        this.accessToken = null;
        this.userProfile = null;
        this.syncEnabled = false;
    }

    /**
     * Initialize Microsoft Authentication Library (MSAL)
     * Implements PKCE flow for enhanced security
     */
    async initialize() {
        try {
            // Check if MSAL is available
            if (typeof msal === 'undefined') {
                throw new Error('Microsoft Authentication Library (MSAL) not loaded');
            }

            // Validate environment configuration
            if (!this.clientId) {
                console.warn('Microsoft Graph integration not configured. Please contact IT administrator.');
                return false;
            }

            // Configure MSAL with corporate-grade security settings
            const msalConfig = {
                auth: {
                    clientId: this.clientId,
                    authority: this.authority,
                    redirectUri: window.location.origin,
                    postLogoutRedirectUri: window.location.origin
                },
                cache: {
                    cacheLocation: 'sessionStorage', // More secure for enterprise
                    storeAuthStateInCookie: true // Support for IE11 if needed
                },
                system: {
                    loggerOptions: {
                        loggerCallback: this.handleMSALLogs.bind(this),
                        logLevel: msal.LogLevel.Warning // Production logging level
                    }
                }
            };

            this.msalInstance = new msal.PublicClientApplication(msalConfig);
            await this.msalInstance.initialize();

            // Check for existing authentication
            await this.checkExistingAuth();
            
            console.log('Microsoft Graph integration initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize Microsoft Graph integration:', error);
            this.showNotification('Microsoft integration unavailable. Contact IT support.', 'warning');
            return false;
        }
    }

    /**
     * Handle MSAL logging with enterprise security considerations
     */
    handleMSALLogs(level, message, containsPii) {
        if (containsPii) {
            // Never log PII in corporate environments
            return;
        }
        
        switch (level) {
            case msal.LogLevel.Error:
                console.error('MSAL Error:', message);
                break;
            case msal.LogLevel.Warning:
                console.warn('MSAL Warning:', message);
                break;
            default:
                // Suppress verbose logs in production
                break;
        }
    }

    /**
     * Check for existing authentication state
     */
    async checkExistingAuth() {
        try {
            const accounts = this.msalInstance.getAllAccounts();
            if (accounts.length > 0) {
                const account = accounts[0];
                this.msalInstance.setActiveAccount(account);
                
                // Silently acquire token to verify authentication
                const tokenRequest = {
                    scopes: this.scopes,
                    account: account,
                    forceRefresh: false
                };

                const response = await this.msalInstance.acquireTokenSilent(tokenRequest);
                this.handleAuthSuccess(response);
            }
        } catch (error) {
            console.log('No existing authentication found');
        }
    }

    /**
     * Initiate corporate-compliant OAuth authentication
     */
    async authenticateUser() {
        try {
            if (!this.msalInstance) {
                throw new Error('Microsoft Graph not initialized');
            }

            const loginRequest = {
                scopes: this.scopes,
                prompt: 'select_account' // Allow account selection for multi-tenant scenarios
            };

            const response = await this.msalInstance.loginPopup(loginRequest);
            this.handleAuthSuccess(response);

        } catch (error) {
            this.handleAuthError(error);
        }
    }

    /**
     * Handle successful authentication
     */
    async handleAuthSuccess(response) {
        try {
            this.accessToken = response.accessToken;
            this.isAuthenticated = true;
            
            // Get user profile information
            this.userProfile = await this.getUserProfile();
            
            this.showNotification(`Connected to Microsoft 365 as ${this.userProfile.displayName}`, 'success');
            this.updateUIState(true);
            
            // Auto-sync if enabled
            if (this.syncEnabled) {
                await this.syncCalendarEvents();
            }

        } catch (error) {
            console.error('Post-authentication setup failed:', error);
            this.handleAuthError(error);
        }
    }

    /**
     * Handle authentication errors with user-friendly messages
     */
    handleAuthError(error) {
        let userMessage = 'Authentication failed. ';
        
        if (error.errorCode === 'consent_required') {
            userMessage += 'Please contact your IT administrator for required permissions.';
        } else if (error.errorCode === 'login_required') {
            userMessage += 'Please sign in to continue.';
        } else if (error.errorCode === 'interaction_required') {
            userMessage += 'Additional authentication required.';
        } else {
            userMessage += 'Please try again or contact IT support.';
        }

        this.showNotification(userMessage, 'error');
        console.error('Microsoft Graph authentication error:', error);
    }

    /**
     * Get authenticated user's profile
     */
    async getUserProfile() {
        try {
            const response = await fetch('https://graph.microsoft.com/v1.0/me', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get user profile:', error);
            throw error;
        }
    }

    /**
     * Sync calendar events with corporate-appropriate filtering
     */
    async syncCalendarEvents(startDate = null, endDate = null) {
        try {
            if (!this.isAuthenticated) {
                throw new Error('Not authenticated with Microsoft Graph');
            }

            // Default to current month if no dates specified
            if (!startDate) {
                startDate = new Date();
                startDate.setDate(1);
                startDate.setHours(0, 0, 0, 0);
            }
            
            if (!endDate) {
                endDate = new Date();
                endDate.setMonth(endDate.getMonth() + 1);
                endDate.setDate(0);
                endDate.setHours(23, 59, 59, 999);
            }

            const startDateTime = startDate.toISOString();
            const endDateTime = endDate.toISOString();

            // Query calendar events with appropriate filters
            const calendarUrl = `https://graph.microsoft.com/v1.0/me/calendar/events` +
                `?$filter=start/dateTime ge '${startDateTime}' and end/dateTime le '${endDateTime}'` +
                `&$select=id,subject,start,end,location,attendees,isAllDay,sensitivity,showAs` +
                `&$orderby=start/dateTime` +
                `&$top=500`;

            const response = await fetch(calendarUrl, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const events = this.filterAndProcessEvents(data.value);
            
            // Update calendar view with Outlook events
            this.updateCalendarWithEvents(events);
            
            this.showNotification(`Synced ${events.length} calendar events`, 'success');
            return events;

        } catch (error) {
            console.error('Calendar sync failed:', error);
            this.showNotification('Calendar sync failed. Please try again.', 'error');
            throw error;
        }
    }

    /**
     * Filter events based on corporate security policies
     */
    filterAndProcessEvents(rawEvents) {
        return rawEvents
            .filter(event => {
                // Respect sensitivity settings
                return event.sensitivity === 'normal' || event.sensitivity === 'personal';
            })
            .map(event => ({
                id: `outlook-${event.id}`,
                title: event.subject || 'No Subject',
                start: new Date(event.start.dateTime || event.start.date),
                end: new Date(event.end.dateTime || event.end.date),
                isAllDay: event.isAllDay,
                location: event.location?.displayName || '',
                attendees: event.attendees?.length || 0,
                type: 'outlook-event',
                status: this.mapOutlookStatus(event.showAs),
                canEdit: false // Outlook events are read-only in task system
            }));
    }

    /**
     * Map Outlook status to task system status
     */
    mapOutlookStatus(outlookStatus) {
        const statusMap = {
            'free': 'available',
            'busy': 'busy',
            'tentative': 'tentative',
            'outOfOffice': 'out-of-office',
            'workingElsewhere': 'remote'
        };
        return statusMap[outlookStatus] || 'busy';
    }

    /**
     * Update calendar view with Outlook events
     */
    updateCalendarWithEvents(events) {
        // Integration with existing calendar view
        if (window.taskViews && window.taskViews.currentFilter === 'calendar') {
            const calendarContainer = document.querySelector('.calendar-container');
            if (calendarContainer) {
                this.renderOutlookEvents(events, calendarContainer);
            }
        }
    }

    /**
     * Render Outlook events in calendar view
     */
    renderOutlookEvents(events, container) {
        // Remove existing Outlook events
        container.querySelectorAll('.outlook-event').forEach(el => el.remove());

        events.forEach(event => {
            const eventElement = this.createEventElement(event);
            const dateCell = this.findCalendarDateCell(event.start, container);
            
            if (dateCell) {
                dateCell.appendChild(eventElement);
            }
        });
    }

    /**
     * Create visual element for Outlook event
     */
    createEventElement(event) {
        const eventEl = document.createElement('div');
        eventEl.className = 'outlook-event';
        eventEl.innerHTML = `
            <div class="event-title">${this.escapeHtml(event.title)}</div>
            <div class="event-time">${this.formatEventTime(event)}</div>
            ${event.location ? `<div class="event-location">${this.escapeHtml(event.location)}</div>` : ''}
        `;
        
        eventEl.style.cssText = `
            background: linear-gradient(135deg, #0078d4, #106ebe);
            color: white;
            padding: 4px 8px;
            margin: 2px 0;
            border-radius: 4px;
            font-size: 12px;
            border-left: 3px solid #005a9e;
        `;

        return eventEl;
    }

    /**
     * Sign out from Microsoft Graph
     */
    async signOut() {
        try {
            if (this.msalInstance) {
                await this.msalInstance.logoutPopup();
            }
            
            this.isAuthenticated = false;
            this.accessToken = null;
            this.userProfile = null;
            
            this.updateUIState(false);
            this.showNotification('Signed out from Microsoft 365', 'info');

        } catch (error) {
            console.error('Sign out failed:', error);
        }
    }

    /**
     * Update UI based on authentication state
     */
    updateUIState(isAuthenticated) {
        const connectButton = document.getElementById('outlook-connect-btn');
        const disconnectButton = document.getElementById('outlook-disconnect-btn');
        const syncButton = document.getElementById('outlook-sync-btn');
        const statusIndicator = document.getElementById('outlook-status');

        if (connectButton) connectButton.style.display = isAuthenticated ? 'none' : 'block';
        if (disconnectButton) disconnectButton.style.display = isAuthenticated ? 'block' : 'none';
        if (syncButton) syncButton.disabled = !isAuthenticated;
        
        if (statusIndicator) {
            statusIndicator.textContent = isAuthenticated 
                ? `Connected as ${this.userProfile?.displayName || 'User'}`
                : 'Not connected';
            statusIndicator.className = `status-indicator ${isAuthenticated ? 'connected' : 'disconnected'}`;
        }
    }

    /**
     * Get Microsoft Graph configuration from environment
     */
    getEnvironmentConfig() {
        // In production, this would come from server-side environment variables
        const clientId = window.MICROSOFT_CLIENT_ID || null;
        
        if (!clientId || clientId === 'demo-client-id-not-configured') {
            console.info('Microsoft Graph integration available but not configured.');
            console.info('See MICROSOFT_SETUP.md for configuration instructions.');
            
            // Enable demo mode if available
            if (window.DEMO_MODE && window.DEMO_OUTLOOK_EVENTS) {
                console.info('Demo mode available - showing sample calendar events.');
                setTimeout(() => this.loadDemoEvents(), 2000);
            }
            
            return null;
        }
        
        return clientId;
    }

    /**
     * Load demo events for demonstration purposes
     */
    loadDemoEvents() {
        if (!window.DEMO_MODE || !window.DEMO_OUTLOOK_EVENTS) return;
        
        console.log('Loading demo Outlook events...');
        this.updateCalendarWithEvents(window.DEMO_OUTLOOK_EVENTS);
        
        // Update UI to show demo state
        const connectBtn = document.getElementById('outlook-connect-btn');
        const statusText = document.getElementById('outlook-status-text');
        const statusIndicator = document.getElementById('outlook-status-indicator');
        
        if (connectBtn) {
            connectBtn.innerHTML = '<i data-lucide="eye"></i> View Demo';
            connectBtn.onclick = () => {
                this.showNotification('Demo mode active. See MICROSOFT_SETUP.md for real integration setup.', 'info');
            };
        }
        
        if (statusText) statusText.textContent = 'Demo mode - Sample events loaded';
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator connected';
            statusIndicator.style.background = '#FF9800'; // Orange for demo
        }
        
        // Show demo events count
        const eventsCount = document.getElementById('events-count');
        if (eventsCount) eventsCount.textContent = window.DEMO_OUTLOOK_EVENTS.length;
        
        const syncStatus = document.getElementById('sync-status');
        if (syncStatus) syncStatus.style.display = 'block';
        
        this.showNotification(`Demo: Loaded ${window.DEMO_OUTLOOK_EVENTS.length} sample calendar events`, 'info');
    }

    /**
     * Utility functions
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatEventTime(event) {
        if (event.isAllDay) {
            return 'All day';
        }
        
        const start = event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const end = event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${start} - ${end}`;
    }

    findCalendarDateCell(date, container) {
        const dateStr = date.toDateString();
        return container.querySelector(`[data-date="${dateStr}"]`);
    }

    showNotification(message, type) {
        // Integration with existing notification system
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Initialize Microsoft Graph integration
window.microsoftGraphIntegration = new MicrosoftGraphIntegration();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MicrosoftGraphIntegration;
}