# OPC UA Tag Browser - React UI

A modern React application for browsing and subscribing to OPC UA tags through a Node-RED backend via WebSocket communication.

## Overview

This project provides a user-friendly interface for:
- Browsing OPC UA tags from a server
- Selecting and subscribing to specific tags
- Viewing real-time tag value updates
- Managing active subscriptions

## Features

### 🌳 Tag Browser
- Hierarchical tree view of OPC UA tags and folders
- Expand/collapse navigation through tag structure
- Checkbox selection for subscriptions
- Type information display for each tag

### 📊 Subscription Manager
- View all active subscriptions in real-time
- Display current tag values and timestamps
- Monitor subscription status (active, inactive, error)
- Quick unsubscribe functionality
- Statistics dashboard (active count, error count)

### 🔌 WebSocket Communication
- Automatic connection management
- Auto-reconnection with configurable retry logic
- Request/response handling with unique request IDs
- Real-time subscription updates

### 🎨 UI/UX
- Responsive design (desktop and tablet)
- Connection status indicator
- Error notifications and handling
- Clean, professional interface

## Prerequisites

- Node.js 16+ and npm/yarn
- A running Node-RED instance with OPC UA server integration
- WebSocket server configured and accessible

## Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd BrokerBrowser
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

## Configuration

### WebSocket URLs

Update the WebSocket URLs in [src/App.tsx](src/App.tsx#L8) if needed:

```typescript
const [wsClient] = useState(() => new WebSocketClient({
  browse: 'ws://localhost:1880/ws/tags',
  subscribe: 'ws://localhost:1880/ws/tags/subscribe'
}));
```

- **Browse URL**: Used for tag browsing and discovery operations
- **Subscribe URL**: Used for subscription management (subscribe/unsubscribe)

Change the default URLs to match your Node-RED backend endpoints.

## Development

### Start Development Server

```bash
npm run dev
```

The application will open automatically at `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

Output files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

### Lint Code

```bash
npm run lint
```

## Backend Communication Protocol

### Message Structure

All messages follow this structure:

```typescript
{
  type: 'browse' | 'subscribe' | 'unsubscribe' | 'browse_result' | 'subscription_update',
  payload: any,
  requestId?: string  // For request/response correlation
}
```

### Workflow

1. **Browse Request** → Backend  
   ```json
   {
     "type": "browse",
     "payload": { "parentNodeId": "root" },
     "requestId": "123456"
   }
   ```

2. **Browse Result** → Frontend  
   ```json
   {
     "type": "browse_result",
     "payload": [
       {
         "id": "tag1",
         "name": "Temperature",
         "nodeId": "ns=2;s=Temperature",
         "type": "double",
         "children": []
       }
     ],
     "requestId": "123456"
   }
   ```

3. **Subscribe Request** → Backend  
   ```json
   {
     "type": "subscribe",
     "payload": { "tagIds": ["tag1", "tag2"] },
     "requestId": "789012"
   }
   ```

4. **Subscription Update** → Frontend (continuous)  
   ```json
   {
     "type": "subscription_update",
     "payload": {
       "tagId": "tag1",
       "tagName": "Temperature",
       "status": "active",
       "lastValue": 23.5,
       "timestamp": "2024-04-23T10:30:45Z"
     }
   }
   ```

## Project Structure

```
src/
├── components/
│   ├── TagBrowser.tsx        # Tag browsing and selection
│   ├── TagBrowser.css
│   ├── SubscriptionManager.tsx # Subscription display
│   └── SubscriptionManager.css
├── utils/
│   └── websocketClient.ts    # WebSocket communication client
├── types/
│   └── index.ts              # TypeScript type definitions
├── App.tsx                   # Main application component
├── App.css
├── main.tsx                  # React entry point
├── index.css                 # Global styles
```

## Key Type Definitions

### OpcUaTag

```typescript
interface OpcUaTag {
  id: string;
  name: string;
  nodeId: string;
  type: string;
  dataType: string;
  description?: string;
  children?: OpcUaTag[];
  isFolder?: boolean;
}
```

### Subscription

```typescript
interface Subscription {
  tagId: string;
  tagName: string;
  status: 'active' | 'inactive' | 'error';
  lastValue?: unknown;
  timestamp?: Date;
}
```

## API Reference

### WebSocketClient Class

#### Methods

- `connect(): Promise<void>` - Establish WebSocket connection
- `browseTags(parentNodeId?: string): Promise<unknown>` - Request tag list
- `subscribe(tagIds: string[]): Promise<unknown>` - Subscribe to tags
- `unsubscribe(tagIds: string[]): Promise<unknown>` - Unsubscribe from tags
- `onSubscriptionUpdate(handler: Function): void` - Register subscription update handler
- `disconnect(): void` - Close WebSocket connection
- `isConnected(): boolean` - Check connection status

## WebSocket Reconnection

The client automatically attempts to reconnect on disconnection:
- Maximum 5 reconnection attempts
- 3-second delay between attempts
- Console logging for debugging

## Error Handling

Errors are displayed in an error banner at the top of the application. Users can dismiss notifications by clicking the ✕ button.

Common error scenarios:
- Connection failures
- WebSocket timeout (5 seconds per request)
- Invalid tag selections
- Subscription failures

## Browser Compatibility

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Considerations

- Lazy loading of tag tree (expand on demand)
- Efficient re-rendering with React hooks
- WebSocket message batching for multiple subscriptions
- Auto-cleanup on component unmount

## Troubleshooting

### WebSocket Connection Fails

1. Verify Node-RED backend is running
2. Check WebSocket URL in configuration
3. Ensure firewall allows WebSocket connections
4. Check browser console for specific error messages

### No Tags Displayed

1. Verify backend is returning tags from OPC UA server
2. Check message format matches expected structure
3. Review browser developer tools Network tab
4. Check backend logs for errors

### Subscription Updates Not Received

1. Confirm subscription confirmation received
2. Verify backend is sending subscription_update messages
3. Check tag values are being updated in OPC UA server
4. Review WebSocket frame inspector in DevTools

## License

MIT

## Support

For issues or questions:
1. Check Node-RED backend logs
2. Review browser console for errors
3. Verify message formats in DevTools Network tab
4. Check WebSocket connection status

## Future Enhancements

- [ ] Historical data visualization
- [ ] Advanced tag filtering and search
- [ ] Bulk operations (subscribe/unsubscribe multiple)
- [ ] Tag value logging and export
- [ ] Multi-language support
- [ ] Dark mode theme
