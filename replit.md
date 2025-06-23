# Task Management & Monitoring System (M&E)

## Overview

This is a web-based Task Management & Monitoring system built for project management and evaluation (M&E) purposes. The application provides a comprehensive solution for managing tasks with features like Kanban boards, calendar views, user authentication, and real-time collaboration. It uses Firebase Firestore as the backend database and implements a glassmorphism UI design.

## System Architecture

### Frontend Architecture
- **Technology Stack**: Vanilla JavaScript (ES6 modules), HTML5, CSS3
- **UI Framework**: Custom glassmorphism design with Inter font family
- **Module System**: ES6 modules with dynamic imports for Firebase services
- **External Libraries**: 
  - Lucide icons for UI elements
  - SheetJS (xlsx) for Excel export functionality
  - Firebase Web SDK v11.8.1

### Backend Architecture
- **Database**: Firebase Firestore (NoSQL document database)
- **Authentication**: Custom authentication system using SHA-256 password hashing
- **Real-time Updates**: Firebase onSnapshot listeners for live data synchronization
- **Data Storage**: Collections for users and tasks with real-time listeners

### Deployment Strategy
- **Web Server**: Python HTTP server (development)
- **Port Configuration**: Internal port 5000, external port 80
- **Module Support**: Node.js 20 environment with web modules

## Key Components

### 1. Authentication System (`js/users.js`)
- Custom user authentication with SHA-256 password hashing
- User roles and permissions management
- Profile picture upload functionality
- User blocking/unblocking system with grace periods

### 2. Task Management (`js/tasks.js`)
- CRUD operations for tasks with Firebase Firestore integration
- Real-time task synchronization across multiple users
- Task status management (todo, in-progress, done, overdue)
- Performance optimization with local caching and batch updates
- User blocking system preventing task operations when blocked

### 3. View Management (`js/task-views.js`)
- Multiple view types: Kanban board, calendar, table views
- Advanced filtering by user, priority, category, status, and date ranges
- Dynamic view switching with state preservation
- Export functionality for different time periods (weekly, monthly, quarterly, annual)

### 4. Kanban Board (`js/kanban.js`)
- Drag-and-drop task management between columns
- Real-time updates for task status changes
- Visual feedback during drag operations
- Cleanup mechanisms to prevent memory leaks

### 5. Overdue Management (`js/overdue-manager.js`)
- Business day calculation excluding weekends
- Grace period management for overdue tasks
- Automatic overdue status updates
- User blocking based on overdue task accumulation

### 6. Export System (`js/export-manager.js`)
- Excel export functionality with multiple sheets
- View-specific data export
- Summary and analytics sheets generation
- Timestamped file naming with view type identification

### 7. Profile Management (`js/profile.js`)
- Avatar upload with drag-and-drop support
- Profile picture management
- Integration with user blocking system

## Data Flow

### Task Operations
1. User performs task action (create, update, delete)
2. Authentication check validates user permissions and blocked status
3. Local cache updated immediately for responsive UI
4. Firebase Firestore operation executed
5. Real-time listeners update all connected clients
6. Overdue manager processes any status changes
7. UI re-renders with updated data

### User Authentication
1. User submits login credentials
2. Password hashed using SHA-256
3. Credentials verified against Firestore user collection
4. Session established with user data cached locally
5. UI updates to show authenticated state
6. Real-time listeners established for user-specific data

### Real-time Synchronization
1. Firebase onSnapshot listeners monitor task and user collections
2. Changes trigger immediate UI updates across all connected clients
3. Local cache synchronized with remote data
4. Conflict resolution handled by Firebase timestamps

## External Dependencies

### Firebase Services
- **Firestore**: Primary database for tasks and users
- **Configuration**: Environment-based config with fallback values
- **Security**: Client-side security rules (server-side rules should be configured in Firebase console)

### CDN Dependencies
- **Lucide Icons**: UI iconography system
- **SheetJS**: Excel file generation and export
- **Google Fonts**: Inter font family for typography

### Development Dependencies
- **Python HTTP Server**: Local development server
- **Node.js 20**: Runtime environment for build tools

## Deployment Strategy

### Development Environment
- Python HTTP server on port 5000
- Hot reload through browser refresh
- Firebase configuration with development credentials

### Production Considerations
- Environment variables for Firebase configuration
- HTTPS enforcement for security
- Firebase security rules implementation
- Performance optimization for large datasets
- CDN usage for static assets

### Environment Variables
- `FIREBASE_API_KEY`: Firebase project API key
- `FIREBASE_AUTH_DOMAIN`: Firebase authentication domain
- `FIREBASE_PROJECT_ID`: Firebase project identifier
- `FIREBASE_STORAGE_BUCKET`: Firebase storage bucket
- `FIREBASE_MESSAGING_SENDER_ID`: Firebase messaging sender ID
- `FIREBASE_APP_ID`: Firebase application ID

## Recent Changes
- June 23, 2025: Successfully migrated from Replit Agent to standard Replit environment
- June 23, 2025: Added dual theme system with dark and light glassmorphic themes
- June 23, 2025: Implemented theme toggle functionality with local storage persistence
- June 23, 2025: Positioned theme toggle button in bottom-right corner to avoid UI conflicts
- June 23, 2025: Enhanced white theme with improved contrast and readability
- June 23, 2025: Fixed calendar layout with proper text wrapping and column alignment
- June 23, 2025: Added priority-based color coding and status indicators for calendar tasks
- June 23, 2025: Implemented comprehensive drag and drop functionality for calendar task date management
- June 23, 2025: Enhanced report sections CSS styling for weekly, monthly, quarterly, and annual views
- June 23, 2025: Implemented enterprise-grade Microsoft Graph API integration for Outlook calendar synchronization
- June 23, 2025: Added corporate-compliant OAuth 2.0 authentication with PKCE security framework
- June 23, 2025: Created professional UI components for Microsoft 365 integration with admin controls
- June 23, 2025: Developed comprehensive corporate setup documentation and deployment guide
- June 23, 2025: Cleaned up demo components, ready for production Azure AD configuration
- June 23, 2025: Converted Microsoft Graph integration to vanilla JavaScript for FTP hosting compatibility
- June 23, 2025: Consolidated filters section into compact dropdown to save vertical space
- June 23, 2025: Fixed filters dropdown initialization and click handling - now fully functional
- June 23, 2025: Fixed period navigation skipping issue in all views (weekly, monthly, quarterly, annual)

## Theme System
The application now supports two glassmorphic themes:

### Dark Theme (Default)
- Dark blue gradient background (#00728d to #000000)
- Semi-transparent white glass elements
- Yellow accent colors for icons and highlights
- Optimized for low-light usage

### Light Theme 
- Light blue gradient background (#f0f9ff to #e0f2fe)
- Semi-transparent white glass elements with better opacity
- Blue accent colors throughout the interface
- Improved contrast for better readability
- All components fully styled and responsive

### Theme Toggle
- Located in bottom-right corner to avoid conflicts with user profile
- Sun/moon icons that change based on current theme
- Smooth animations and hover effects
- Saves theme preference to localStorage
- Integrates with existing notification system

## Changelog
- June 15, 2025: Initial setup
- June 23, 2025: Migration to Replit environment completed
- June 23, 2025: Dual theme system implementation completed

## User Preferences

Preferred communication style: Simple, everyday language.
Theme preference: Dual theme system with toggle functionality.
Feature request: Microsoft Outlook calendar integration with task synchronization.