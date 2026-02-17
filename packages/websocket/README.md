# WebSocket Package

Real-time WebSocket notification system for in-app notifications.

## Features

- **Real-time notifications** - Push notifications to connected clients instantly
- **Session-based authentication** - Integrates with existing auth system
- **Multi-instance support** - Scale horizontally with Redis pub/sub
- **Type-safe events** - Fully typed notification events
- **Publisher API** - Easy-to-use API for sending notifications from backend

## Event Types

### Status Change
Notifies users when an item's status changes:
```typescript
{
  type: 'status_change',
  data: {
    itemId: string,
    itemType: string,
    oldStatus: string,
    newStatus: string
  }
}
```

### Connection Request
Notifies users of new connection requests:
```typescript
{
  type: 'connection_request',
  data: {
    connectionId: string,
    fromUserId: string,
    fromUserName: string,
    message?: string
  }
}
```

### Item Update
Generic item update notification:
```typescript
{
  type: 'item_update',
  data: {
    itemId: string,
    itemType: string,
    action: 'created' | 'updated' | 'deleted',
    changes: Record<string, unknown>
  }
}
```

### Custom Events
For application-specific notifications:
```typescript
{
  type: 'custom',
  data: {
    subType: string,
    payload: Record<string, unknown>
  }
}
```

## Server-Side Usage

### Setup (apps/api/src/server.ts)

WebSocket server is automatically initialized when `WEBSOCKET_ENABLED=true`:

```typescript
import { initializeWebSocket } from './websocket/setup';

// After HTTP server starts
await initializeWebSocket(app.server);
```

### Publishing Notifications

```typescript
import { getNotificationPublisher } from './websocket/setup';

// Get publisher instance
const publisher = getNotificationPublisher();

// Publish status change
await publisher.publishStatusChange(userId, {
  itemId: '123',
  itemType: 'connection',
  oldStatus: 'pending',
  newStatus: 'approved'
});

// Publish connection request
await publisher.publishConnectionRequest(toUserId, {
  connectionId: 'conn_123',
  fromUserId: 'user_456',
  fromUserName: 'John Doe',
  message: 'Would like to connect'
});

// Publish item update
await publisher.publishItemUpdate(userId, {
  itemId: '789',
  itemType: 'document',
  action: 'updated',
  changes: { title: 'New Title' }
});

// Publish to multiple users
await publisher.publishToUsers([userId1, userId2], 'custom', {
  subType: 'announcement',
  payload: { message: 'System maintenance tonight' }
});
```

## Client-Side Usage

### Connect to WebSocket

```typescript
// Browser/Frontend
const ws = new WebSocket('ws://localhost:2742/ws');

ws.onopen = () => {
  console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  
  switch (notification.type) {
    case 'connected':
      console.log('Connection acknowledged:', notification.data);
      break;
      
    case 'status_change':
      handleStatusChange(notification);
      break;
      
    case 'connection_request':
      handleConnectionRequest(notification);
      break;
      
    case 'item_update':
      handleItemUpdate(notification);
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from WebSocket');
};
```

### Send Ping (Keep-Alive)

```typescript
// Send ping to keep connection alive
ws.send(JSON.stringify({ type: 'ping' }));

// Server responds with pong
// { type: 'pong', data: { timestamp: 1234567890 } }
```

## Environment Configuration

Add to your `.env` file:

```bash
# Enable WebSocket server
WEBSOCKET_ENABLED=true

# WebSocket endpoint path (default: /ws)
WEBSOCKET_PATH=/ws

# Redis URL for multi-instance scaling (optional)
REDIS_URL=redis://:password@localhost:6379
```

## API Endpoints

### GET /api/v1/websocket/ws-stats
Get WebSocket server statistics.

**Response:**
```json
{
  "connections": 42,
  "users": 35,
  "redisHealthy": true
}
```

### POST /api/v1/websocket/publish-notification
Manually publish a notification (for testing).

**Request:**
```json
{
  "userId": "user_123",
  "type": "custom",
  "data": {
    "subType": "test",
    "payload": { "message": "Hello!" }
  }
}
```

### POST /api/v1/websocket/example/connection-request
Example: Send connection request notification.

**Request:**
```json
{
  "toUserId": "user_789",
  "fromUserName": "Jane Smith",
  "message": "Let's connect!"
}
```

### POST /api/v1/websocket/example/status-change
Example: Send status change notification.

**Request:**
```json
{
  "userId": "user_123",
  "itemId": "item_456",
  "itemType": "request",
  "oldStatus": "pending",
  "newStatus": "approved"
}
```

## Architecture

### Single Instance Mode
- Direct delivery from publisher to WebSocket server
- No Redis required
- Best for development and small deployments

### Multi-Instance Mode (Redis)
- Publisher sends to Redis pub/sub
- All WebSocket instances receive and deliver to their connected clients
- Enables horizontal scaling
- Automatically enabled when `REDIS_URL` is configured

## Integration Example

Example of integrating WebSocket notifications in an API route:

```typescript
// In your route handler
import { getNotificationPublisher } from '../../websocket/setup';

async function updateItem(req, res) {
  // Update item in database
  const item = await db.items.update(...);
  
  // Send real-time notification
  try {
    const publisher = getNotificationPublisher();
    await publisher.publishItemUpdate(item.userId, {
      itemId: item.id,
      itemType: item.type,
      action: 'updated',
      changes: { status: item.status }
    });
  } catch (error) {
    // Log but don't fail the request
    console.error('Failed to send notification:', error);
  }
  
  return res.send({ item });
}
```

## Type Safety

All notification events are fully typed. Import types from the package:

```typescript
import type {
  NotificationEvent,
  StatusChangeEvent,
  ConnectionRequestEvent,
  ItemUpdateEvent,
  CustomEvent
} from 'websocket';
```

## Troubleshooting

### WebSocket not connecting
- Ensure `WEBSOCKET_ENABLED=true` in `.env`
- Check that WebSocket path matches (default: `/ws`)
- Verify authentication cookies are being sent

### Notifications not received
- Check if user is connected: `GET /api/v1/websocket/ws-stats`
- Verify Redis connection if using multi-instance mode
- Check server logs for errors

### Redis connection issues
- Verify `REDIS_URL` format: `redis://[:password@]host:port`
- Ensure Redis server is running
- Check Redis authentication

## Performance

- **Ping interval**: 30 seconds (configurable)
- **Connection timeout**: 1 minute (configurable)
- **Supports thousands of concurrent connections** per instance
- **Redis pub/sub** for horizontal scaling across multiple instances
