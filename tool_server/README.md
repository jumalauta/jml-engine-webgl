# JML Engine Tool Server

Tool server contains additional features for demo development. Tool server is used only for development and not when playing the demo.

## Running

Should run automatically via Vite dev server. To run manually: `node tool_server/src/server.js | npx pino-pretty`

## Features

- **File Monitoring**: Watches files for changes and notifies clients with content and diffs
- **Video Capture**: Records demo output to video using FFmpeg

## JSON-RPC 2.0 Protocol

The tool server uses JSON-RPC 2.0 specification for WebSocket communication. All messages are JSON-encoded and follow the JSON-RPC 2.0 format.

### Message Types

- **Request**: Has `id` field, expects a response
- **Notification**: No `id` field, no response expected
- **Response**: Contains `id` matching the request, with `result` or `error`

### Connection

#### connect

**Type:** Request  
**Purpose:** Initial handshake to establish connection

```json
{
  "jsonrpc": "2.0",
  "method": "connect",
  "id": 1
}
```

#### hello

**Type:** Notification (Server → Client)  
**Purpose:** Acknowledgment of successful connection

```json
{
  "jsonrpc": "2.0",
  "method": "hello"
}
```

#### settings

**Type:** Request/Notification  
**Purpose:** Synchronize client settings with server

```json
{
  "jsonrpc": "2.0",
  "method": "settings",
  "params": {
    "settings": { ... }
  },
  "id": 2
}
```

### File System Methods

#### fs.monitorFile

**Type:** Request  
**Purpose:** Start monitoring a file for changes

```json
{
  "jsonrpc": "2.0",
  "method": "fs.monitorFile",
  "params": {
    "path": "relative/path/to/file"
  },
  "id": 3
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "status": "monitoring",
    "path": "relative/path/to/file"
  }
}
```

#### fs.fileChanged

**Type:** Notification (Server → Client)  
**Purpose:** Notify client when a monitored file changes

```json
{
  "jsonrpc": "2.0",
  "method": "fs.fileChanged",
  "params": {
    "path": "relative/path/to/file",
    "mtimeMs": 1692345678901,
    "eventType": "change",
    "content": "base64EncodedContent",
    "diffContent": "unified diff patch (optional)"
  }
}
```

**Notes:**

- `diffContent` only included for text files (.js, .vs, .fs, .txt, .json)
  - Diffs ignore whitespace changes.
- `content` is base64-encoded for all file types (text and binary)

#### fs.stopWatch

**Type:** Request  
**Purpose:** Stop monitoring all files

```json
{
  "jsonrpc": "2.0",
  "method": "fs.stopWatch",
  "id": 4
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "status": "stopped"
  }
}
```

#### fs.stat

**Type:** Request  
**Purpose:** Get file statistics

```json
{
  "jsonrpc": "2.0",
  "method": "fs.stat",
  "params": {
    "path": "relative/path/to/file"
  },
  "id": 5
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "stats": { ... }
  }
}
```

#### fs.readFile

**Type:** Request  
**Purpose:** Read file contents

```json
{
  "jsonrpc": "2.0",
  "method": "fs.readFile",
  "params": {
    "path": "relative/path/to/file"
  },
  "id": 6
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {
    "content": "base64EncodedContent"
  }
}
```

### Video Capture Methods

#### capture.start

**Type:** Request  
**Purpose:** Start video capture session

```json
{
  "jsonrpc": "2.0",
  "method": "capture.start",
  "params": {
    "fps": 60,
    "width": 1920,
    "height": 1080
  },
  "id": 7
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "status": "started"
  }
}
```

#### capture.writeReady

**Type:** Notification (Server → Client)  
**Purpose:** Notify client that capture is ready to receive frames

```json
{
  "jsonrpc": "2.0",
  "method": "capture.writeReady"
}
```

#### capture.frame

**Type:** Request  
**Purpose:** Send a frame for video encoding

```json
{
  "jsonrpc": "2.0",
  "method": "capture.frame",
  "params": {
    "frame": 0,
    "time": 0.0,
    "dataUrl": "data:image/png;base64,..."
  },
  "id": 8
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "result": {
    "frame": 0,
    "status": "written"
  }
}
```

#### capture.stop

**Type:** Request  
**Purpose:** Stop video capture and finalize output

```json
{
  "jsonrpc": "2.0",
  "method": "capture.stop",
  "id": 9
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "result": {
    "status": "stopped"
  }
}
```

#### capture.success / capture.error

**Type:** Notification (Server → Client)  
**Purpose:** Notify capture completion status

```json
{
  "jsonrpc": "2.0",
  "method": "capture.success",
  "params": {
    "capture": { ... }
  }
}
```

### Error Handling

JSON-RPC 2.0 error responses follow the standard format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "Invalid Request",
    "data": "Additional error info (optional)"
  }
}
```

**Standard Error Codes:**

- `-32600`: Invalid Request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error
