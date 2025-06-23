/**
 * Demo Configuration for Microsoft Graph Integration
 * This file demonstrates how the integration would work once properly configured
 */

// For demonstration purposes, you can temporarily set a demo client ID
// In production, this MUST come from secure environment variables
window.DEMO_MODE = true;

// Demo Microsoft Graph configuration
// Replace with your actual Azure AD app registration client ID
window.MICROSOFT_CLIENT_ID = 'demo-client-id-not-configured';

// Demo event data to show what the integration would look like
window.DEMO_OUTLOOK_EVENTS = [
    {
        id: 'demo-1',
        title: 'Weekly Team Meeting',
        start: new Date(2025, 5, 24, 9, 0), // June 24, 2025, 9:00 AM
        end: new Date(2025, 5, 24, 10, 0),
        location: 'Conference Room A',
        attendees: 5,
        type: 'outlook-event',
        isAllDay: false
    },
    {
        id: 'demo-2',
        title: 'Project Review',
        start: new Date(2025, 5, 24, 14, 0), // June 24, 2025, 2:00 PM
        end: new Date(2025, 5, 24, 15, 30),
        location: 'Room 205',
        attendees: 3,
        type: 'outlook-event',
        isAllDay: false
    },
    {
        id: 'demo-3',
        title: 'All Hands Meeting',
        start: new Date(2025, 5, 25, 0, 0), // June 25, 2025, all day
        end: new Date(2025, 5, 25, 23, 59),
        location: 'Main Auditorium',
        attendees: 50,
        type: 'outlook-event',
        isAllDay: true
    }
];

console.log('Demo configuration loaded. In production, configure MICROSOFT_CLIENT_ID environment variable.');