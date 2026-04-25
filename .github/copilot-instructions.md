# Project Initialization Checklist

- [x] Verify copilot-instructions.md file in .github directory
- [x] Scaffold the React project with Vite and TypeScript
- [x] Customize project with OPC UA browsing and WebSocket components
- [x] Install dependencies
- [x] Compile and verify the project
- [x] Create and run development task
- [x] Launch the project
- [x] Ensure documentation is complete

## Project Overview

This is a React + TypeScript application for browsing and subscribing to OPC UA tags via a Node-RED backend using WebSocket communication.

## Key Features

- **OPC UA Tag Browser**: Browse and display OPC UA tags from the server
- **Interactive Selection**: Select tags for subscription with a tree view interface
- **Real-time Subscriptions**: Active subscription management with live value updates
- **WebSocket Communication**: Two-way WebSocket communication with Node-RED backend
- **Connection Status**: Visual connection status indicator
- **Error Handling**: Built-in error handling and user feedback

## Project Structure

- `/src/components`: React components for tag browser and subscription manager
- `/src/utils`: WebSocket client and communication utilities
- `/src/types`: TypeScript type definitions for OPC UA tags and messages
- `/src/App.tsx`: Main application component
- Config files: `vite.config.ts`, `tsconfig.json`, `package.json`

## Next Steps

1. Install dependencies: `npm install`
2. Configure WebSocket URL in `src/App.tsx` (default: `ws://localhost:8080`)
3. Run development server: `npm run dev`
4. Build for production: `npm run build`

## Backend Requirements

The Node-RED backend should:
- Listen for WebSocket connections on the configured URL
- Handle `browse` requests and return OPC UA tag structures
- Handle `subscribe` requests and send subscription confirmations
- Send subscription updates when tag values change
- Handle `unsubscribe` requests to stop sending updates
