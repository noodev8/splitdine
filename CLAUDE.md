# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SplitDine is a web application for managing restaurant bill splitting and group dining events. The application allows hosts to create dining events, invite guests via codes, track individual bills and deposits, and manage payments.

## Architecture

### Technology Stack
- **Framework**: Next.js 15.5.4 (App Router)
- **Runtime**: React 19.1.0
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Data Persistence**: localStorage (client-side only)

### Project Structure
- `splitdine-web/`: Main Next.js application
  - `app/`: Next.js App Router directory
    - `page.tsx`: Main application logic (single-page app)
    - `layout.tsx`: Root layout with Geist fonts
    - `globals.css`: Global styles
  - `package.json`: Dependencies and scripts
  - `tsconfig.json`: TypeScript configuration with `@/*` path alias

## Key Commands

### Development
```bash
cd splitdine-web
npm run dev       # Start development server on localhost:3000
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

## Application Structure

### Data Model

The application is entirely client-side with localStorage persistence. Key interfaces:

- **Event**: Contains event name, host/guest codes, guests list, creation timestamp
- **Guest**: Contains name, amount owed, deposit, items ordered, notes, payment status
- **UserEventMembership**: Tracks which events a user has joined and their role (host/guest)

### State Management

All state is managed via React useState hooks in `app/page.tsx`. No external state management library is used. Data persistence happens through localStorage with keys:
- `splitdine_events`: All events
- `splitdine_memberships`: User's event memberships
- `splitdine_current_event`: Currently active event

### User Roles

- **Host**: Can create events, add/remove guests, edit amounts, mark as paid, delete events, share guest codes
- **Guest**: Can view event details, see guest list and amounts (read-only for financial data)

### Event System

Events use two 6-character codes:
- **Host Code**: For hosts to rejoin on other devices (has full edit permissions)
- **Guest Code**: Shared with guests for read-only access

## Current Implementation Status

The application is currently a single-page React component (`app/page.tsx`) with:
- Complete UI for event management
- Full guest tracking functionality
- Payment tracking with deposits
- Item/order tracking per guest
- Toast notifications
- Modal dialogs for various actions
- Responsive design for mobile and desktop

### Notable Features
- Dark mode support
- Keyboard shortcuts (Enter, Escape)
- Auto-focus on inputs for better UX
- Visual feedback when bills are fully paid
- Bank details hardcoded for "Brookfield Comfort - Trading as Brookfield Socials"

## Development Notes

### TypeScript Configuration
- Path alias `@/*` maps to the root directory
- Strict mode enabled
- Target: ES2017

### Styling
- Uses Tailwind CSS v4 with Tailwind PostCSS
- Custom fonts: Geist Sans and Geist Mono
- Dark mode classes throughout

### Client-Side Only
The entire app runs client-side with 'use client' directive. No server components or API routes are currently implemented.
- Never use toast notifications