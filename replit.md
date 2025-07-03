# replit.md

## Overview

Yura Yura STUDIO is a comprehensive project management platform designed for small businesses in the Chiba Prefecture area. The application connects local creators with business owners, facilitating web development, marketing support, and project collaboration through an intuitive project management system.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom plugins for theme management and error handling
- **UI Library**: Radix UI components with custom shadcn/ui styling
- **Styling**: Tailwind CSS with custom theme configuration
- **State Management**: React Query (TanStack Query) for server state management
- **Routing**: Wouter for client-side routing
- **Mobile Support**: Capacitor for hybrid mobile app development

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and session management
- **Database**: PostgreSQL with Drizzle ORM
- **Session Storage**: PostgreSQL-backed session store
- **File Uploads**: express-fileupload middleware
- **Email Services**: Nodemailer with optional EmailJS integration

### Database Architecture
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Shared TypeScript schema definitions for type safety
- **Connection**: Neon serverless PostgreSQL with connection pooling
- **Migrations**: Drizzle Kit for schema migrations

## Key Components

### User Management
- Multi-role system (Admin, Director, Sales, Creator)
- Registration request system with admin approval
- Profile management with avatars and bio
- Skill tracking and categorization

### Project Management
- Project lifecycle management (Not Started, In Progress, Completed, On Hold)
- Task assignment and progress tracking
- Comment system with @mentions
- File upload and attachment support
- Reward distribution system based on contributions

### Communication Features
- Direct messaging between users
- Timeline/feed for project updates
- Notification system with email integration
- Real-time comment threads on projects

### Portfolio System
- Automatic portfolio generation from completed projects
- File upload support for project assets
- OGP metadata extraction for web links
- Portfolio sharing capabilities

### Mobile App Support
- Capacitor integration for iOS/Android deployment
- Splash screen configuration
- Native mobile features support

## Data Flow

### Authentication Flow
1. User submits registration request
2. Admin reviews and approves/rejects requests
3. Approved users receive credentials
4. Session-based authentication with secure cookies
5. Role-based access control for protected routes

### Project Workflow
1. Projects created by Directors/Admins
2. Team members assigned to projects
3. Progress tracking through status updates
4. Comments and file sharing for collaboration
5. Completion triggers portfolio generation
6. Reward distribution calculation

### Notification System
1. System events trigger notifications
2. In-app notifications with badge counters
3. Email notifications based on user preferences
4. Real-time updates through polling

## External Dependencies

### Database
- **Neon Serverless PostgreSQL**: Primary database provider
- **Connection Pooling**: Managed through Neon's infrastructure

### Email Services
- **Nodemailer**: Server-side email sending
- **EmailJS**: Client-side email integration (optional)
- **SMTP Configuration**: Flexible provider support

### File Storage
- **Local Storage**: File uploads stored in public/uploads directory
- **Static Serving**: Express static middleware for file access

### Mobile Platform
- **Capacitor**: Cross-platform mobile app framework
- **Android Studio**: Required for Android builds
- **Java/Kotlin**: Android development environment

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with HMR
- **Database**: Local PostgreSQL or Neon development instance
- **Port Configuration**: 5000 for development server

### Production Deployment
- **Replit Deployment**: Optimized for Replit's hosting environment
- **Build Process**: Vite build for frontend, esbuild for backend
- **Environment Variables**: Secure configuration management
- **Database**: Neon production instance with SSL

### Mobile Deployment
- **Android**: Google Play Store distribution
- **Build Configuration**: Gradle-based Android builds
- **Code Signing**: Release APK signing for distribution

## Changelog

```
Changelog:
- July 03, 2025. Initial setup
- July 03, 2025. Object Storage検討 - Replit Object Storageの実装を準備したが、バケット作成が必要なため一旦保留
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```