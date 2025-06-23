/**
 * Microsoft Graph API Integration - Vanilla JavaScript
 * Compatible with all hosting environments including FTP
 * No ES6 classes, no imports, no modern syntax
 */

// Microsoft Graph Integration using vanilla JavaScript
(function() {
    'use strict';
    
    // Main integration object
    var MicrosoftGraphIntegration = {
        // Configuration
        clientId: null,
        authority: 'https://login.microsoftonline.com/common',
        scopes: [
            'https://graph.microsoft.com/Calendars.Read',
            'https://graph.microsoft.com/Calendars.ReadWrite',
            'https://graph.microsoft.com/User.Read'
        ],
        msalInstance: null,
        isAuthenticated: false,
        accessToken: null,
        userProfile: null,
        syncEnabled: false,

        // Initialize the integration
        init: function() {
            this.clientId = this.getEnvironmentConfig();
            return this.initialize();
        },

        // Get configuration from environment
        getEnvironmentConfig: function() {
            var clientId = window.MICROSOFT_CLIENT_ID || null;
            
            if (!clientId) {
                console.info('Microsoft Graph integration available but not configured.');
                console.info('Contact your IT administrator to enable Microsoft 365 calendar integration.');
            }
            
            return clientId;
        },

        // Initialize MSAL
        initialize: function() {
            var self = this;
            
            try {
                if (typeof msal === 'undefined') {
                    throw new Error('Microsoft Authentication Library (MSAL) not loaded');
                }

                if (!this.clientId) {
                    console.warn('Microsoft Graph integration not configured. Please contact IT administrator.');
                    return Promise.resolve(false);
                }

                var msalConfig = {
                    auth: {
                        clientId: this.clientId,
                        authority: this.authority,
                        redirectUri: window.location.origin,
                        postLogoutRedirectUri: window.location.origin
                    },
                    cache: {
                        cacheLocation: 'sessionStorage',
                        storeAuthStateInCookie: true
                    },
                    system: {
                        loggerOptions: {
                            loggerCallback: function(level, message, containsPii) {
                                self.handleMSALLogs(level, message, containsPii);
                            },
                            logLevel: msal.LogLevel.Warning
                        }
                    }
                };

                this.msalInstance = new msal.PublicClientApplication(msalConfig);
                
                return this.msalInstance.initialize().then(function() {
                    return self.checkExistingAuth();
                }).then(function() {
                    console.log('Microsoft Graph integration initialized successfully');
                    return true;
                });

            } catch (error) {
                console.error('Failed to initialize Microsoft Graph integration:', error);
                this.showNotification('Microsoft integration unavailable. Contact IT support.', 'warning');
                return Promise.resolve(false);
            }
        },

        // Handle MSAL logging
        handleMSALLogs: function(level, message, containsPii) {
            if (containsPii) {
                return;
            }
            
            if (level === msal.LogLevel.Error) {
                console.error('MSAL Error:', message);
            } else if (level === msal.LogLevel.Warning) {
                console.warn('MSAL Warning:', message);
            }
        },

        // Check for existing authentication
        checkExistingAuth: function() {
            var self = this;
            
            try {
                var accounts = this.msalInstance.getAllAccounts();
                if (accounts.length > 0) {
                    var account = accounts[0];
                    this.msalInstance.setActiveAccount(account);
                    
                    var tokenRequest = {
                        scopes: this.scopes,
                        account: account,
                        forceRefresh: false
                    };

                    return this.msalInstance.acquireTokenSilent(tokenRequest).then(function(response) {
                        self.handleAuthSuccess(response);
                        return true;
                    }).catch(function(error) {
                        console.log('No existing authentication found');
                        return false;
                    });
                }
                return Promise.resolve(false);
            } catch (error) {
                console.log('No existing authentication found');
                return Promise.resolve(false);
            }
        },

        // Authenticate user
        authenticateUser: function() {
            var self = this;
            
            if (!this.msalInstance) {
                throw new Error('Microsoft Graph not initialized');
            }

            var loginRequest = {
                scopes: this.scopes,
                prompt: 'select_account'
            };

            return this.msalInstance.loginPopup(loginRequest).then(function(response) {
                self.handleAuthSuccess(response);
                return true;
            }).catch(function(error) {
                self.handleAuthError(error);
                return false;
            });
        },

        // Handle successful authentication
        handleAuthSuccess: function(response) {
            var self = this;
            
            try {
                this.accessToken = response.accessToken;
                this.isAuthenticated = true;
                
                this.getUserProfile().then(function(profile) {
                    self.userProfile = profile;
                    self.showNotification('Connected to Microsoft 365 as ' + profile.displayName, 'success');
                    self.updateUIState(true);
                    
                    if (self.syncEnabled) {
                        self.syncCalendarEvents();
                    }
                }).catch(function(error) {
                    console.error('Post-authentication setup failed:', error);
                    self.handleAuthError(error);
                });

            } catch (error) {
                console.error('Post-authentication setup failed:', error);
                this.handleAuthError(error);
            }
        },

        // Handle authentication errors
        handleAuthError: function(error) {
            var userMessage = 'Authentication failed. ';
            
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
        },

        // Get user profile
        getUserProfile: function() {
            var self = this;
            
            return new Promise(function(resolve, reject) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', 'https://graph.microsoft.com/v1.0/me', true);
                xhr.setRequestHeader('Authorization', 'Bearer ' + self.accessToken);
                xhr.setRequestHeader('Content-Type', 'application/json');
                
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            resolve(JSON.parse(xhr.responseText));
                        } else {
                            reject(new Error('HTTP ' + xhr.status + ': ' + xhr.statusText));
                        }
                    }
                };
                
                xhr.send();
            });
        },

        // Sync calendar events
        syncCalendarEvents: function(startDate, endDate) {
            var self = this;
            
            if (!this.isAuthenticated) {
                throw new Error('Not authenticated with Microsoft Graph');
            }

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

            var startDateTime = startDate.toISOString();
            var endDateTime = endDate.toISOString();

            var calendarUrl = 'https://graph.microsoft.com/v1.0/me/calendar/events' +
                '?$filter=start/dateTime ge \'' + startDateTime + '\' and end/dateTime le \'' + endDateTime + '\'' +
                '&$select=id,subject,start,end,location,attendees,isAllDay,sensitivity,showAs' +
                '&$orderby=start/dateTime' +
                '&$top=500';

            return new Promise(function(resolve, reject) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', calendarUrl, true);
                xhr.setRequestHeader('Authorization', 'Bearer ' + self.accessToken);
                xhr.setRequestHeader('Content-Type', 'application/json');
                
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            var data = JSON.parse(xhr.responseText);
                            var events = self.filterAndProcessEvents(data.value);
                            
                            self.updateCalendarWithEvents(events);
                            self.showNotification('Synced ' + events.length + ' calendar events', 'success');
                            resolve(events);
                        } else {
                            var error = new Error('HTTP ' + xhr.status + ': ' + xhr.statusText);
                            console.error('Calendar sync failed:', error);
                            self.showNotification('Calendar sync failed. Please try again.', 'error');
                            reject(error);
                        }
                    }
                };
                
                xhr.send();
            });
        },

        // Filter and process events
        filterAndProcessEvents: function(rawEvents) {
            var self = this;
            
            return rawEvents
                .filter(function(event) {
                    return event.sensitivity === 'normal' || event.sensitivity === 'personal';
                })
                .map(function(event) {
                    return {
                        id: 'outlook-' + event.id,
                        title: event.subject || 'No Subject',
                        start: new Date(event.start.dateTime || event.start.date),
                        end: new Date(event.end.dateTime || event.end.date),
                        isAllDay: event.isAllDay,
                        location: event.location ? event.location.displayName || '' : '',
                        attendees: event.attendees ? event.attendees.length || 0 : 0,
                        type: 'outlook-event',
                        status: self.mapOutlookStatus(event.showAs),
                        canEdit: false
                    };
                });
        },

        // Map Outlook status
        mapOutlookStatus: function(outlookStatus) {
            var statusMap = {
                'free': 'available',
                'busy': 'busy',
                'tentative': 'tentative',
                'outOfOffice': 'out-of-office',
                'workingElsewhere': 'remote'
            };
            return statusMap[outlookStatus] || 'busy';
        },

        // Update calendar with events
        updateCalendarWithEvents: function(events) {
            if (window.taskViews && window.taskViews.currentFilter === 'calendar') {
                var calendarContainer = document.querySelector('.calendar-container');
                if (calendarContainer) {
                    this.renderOutlookEvents(events, calendarContainer);
                }
            }
        },

        // Render Outlook events
        renderOutlookEvents: function(events, container) {
            var self = this;
            
            // Remove existing Outlook events
            var existingEvents = container.querySelectorAll('.outlook-event');
            for (var i = 0; i < existingEvents.length; i++) {
                existingEvents[i].remove();
            }

            events.forEach(function(event) {
                var eventElement = self.createEventElement(event);
                var dateCell = self.findCalendarDateCell(event.start, container);
                
                if (dateCell) {
                    dateCell.appendChild(eventElement);
                }
            });
        },

        // Create event element
        createEventElement: function(event) {
            var eventEl = document.createElement('div');
            eventEl.className = 'outlook-event';
            
            var innerHTML = '<div class="event-title">' + this.escapeHtml(event.title) + '</div>' +
                          '<div class="event-time">' + this.formatEventTime(event) + '</div>';
            
            if (event.location) {
                innerHTML += '<div class="event-location">' + this.escapeHtml(event.location) + '</div>';
            }
            
            eventEl.innerHTML = innerHTML;
            
            eventEl.style.cssText = 
                'background: linear-gradient(135deg, #0078d4, #106ebe);' +
                'color: white;' +
                'padding: 4px 8px;' +
                'margin: 2px 0;' +
                'border-radius: 4px;' +
                'font-size: 12px;' +
                'border-left: 3px solid #005a9e;';

            return eventEl;
        },

        // Sign out
        signOut: function() {
            var self = this;
            
            if (this.msalInstance) {
                return this.msalInstance.logoutPopup().then(function() {
                    self.isAuthenticated = false;
                    self.accessToken = null;
                    self.userProfile = null;
                    
                    self.updateUIState(false);
                    self.showNotification('Signed out from Microsoft 365', 'info');
                }).catch(function(error) {
                    console.error('Sign out failed:', error);
                });
            }
            
            this.isAuthenticated = false;
            this.accessToken = null;
            this.userProfile = null;
            this.updateUIState(false);
            
            return Promise.resolve();
        },

        // Update UI state
        updateUIState: function(isAuthenticated) {
            var connectButton = document.getElementById('outlook-connect-btn');
            var disconnectButton = document.getElementById('outlook-disconnect-btn');
            var syncButton = document.getElementById('outlook-sync-btn');
            var statusIndicator = document.getElementById('outlook-status');

            if (connectButton) {
                connectButton.style.display = isAuthenticated ? 'none' : 'block';
            }
            if (disconnectButton) {
                disconnectButton.style.display = isAuthenticated ? 'block' : 'none';
            }
            if (syncButton) {
                syncButton.disabled = !isAuthenticated;
            }
            
            if (statusIndicator) {
                statusIndicator.textContent = isAuthenticated 
                    ? 'Connected as ' + (this.userProfile ? this.userProfile.displayName || 'User' : 'User')
                    : 'Not connected';
                statusIndicator.className = 'status-indicator ' + (isAuthenticated ? 'connected' : 'disconnected');
            }
        },

        // Utility functions
        escapeHtml: function(text) {
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        formatEventTime: function(event) {
            if (event.isAllDay) {
                return 'All day';
            }
            
            var start = event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            var end = event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return start + ' - ' + end;
        },

        findCalendarDateCell: function(date, container) {
            var dateStr = date.toDateString();
            return container.querySelector('[data-date="' + dateStr + '"]');
        },

        showNotification: function(message, type) {
            if (window.showNotification) {
                window.showNotification(message, type);
            } else {
                console.log(type.toUpperCase() + ': ' + message);
            }
        }
    };

    // Initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.microsoftGraphIntegration = MicrosoftGraphIntegration;
            MicrosoftGraphIntegration.init();
        });
    } else {
        window.microsoftGraphIntegration = MicrosoftGraphIntegration;
        MicrosoftGraphIntegration.init();
    }

})();