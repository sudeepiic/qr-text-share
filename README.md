# QR Text Share

A simple Next.js application that allows sharing text between desktop and mobile devices via QR code scanning with real-time sync. No apps required - works with any smartphone camera app.

## Features

- **QR Code Sharing**: Generate a QR code on desktop and scan with your phone
- **Real-time Sync**: Text appears instantly on desktop when submitted from mobile (using Server-Sent Events)
- **No Login Required**: Completely anonymous, no authentication needed
- **Works Offline**: Once the page is loaded, no internet connection required
- **Session Isolation**: Each QR code creates a unique session
- **Responsive Design**: Mobile-optimized input interface

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **QR Generation**: `qrcode` library
- **ID Generation**: `nanoid`
- **Real-time Sync**: Server-Sent Events (SSE)
- **Storage**: In-memory Map (sessions persist while server is running)

## Architecture

### Data Flow

```
Desktop                    Server                     Mobile
   |                          |                          |
   |-- 1. Create session ---> |                          |
   |                          |                          |
   |<-- 2. QR code + ID ------|                          |
   |                          |                          |
   |                          |<-- 3. Scan QR, connect --|
   |                          |                          |
   |                          |<-- 4. Subscribe to SSE --|
   |                          |                          |
   |                          |<-- 5. Submit text -------|
   |                          |                          |
   |<-- 6. Receive text (SSE) |                          |
```

### Key Components

1. **In-Memory Store** (`lib/session-store.ts`)
   - Map of sessionId -> { text, createdAt, listeners[] }
   - Methods: createSession(), getSession(), updateSession(), addListener()

2. **Desktop Page** (`app/page.tsx`)
   - Button to generate new session
   - Display QR code containing the session URL
   - SSE connection to listen for incoming text
   - Display received text with copy-to-clipboard button

3. **Mobile/Input Page** (`app/session/[id]/page.tsx`)
   - Rendered when QR code is scanned
   - Textarea for input
   - Submit button that POSTs to API
   - Success/error feedback

4. **API Routes**
   - `POST /api/session` - Create new session
   - `GET /api/session/[id]/stream` - SSE endpoint for real-time updates
   - `POST /api/session/[id]` - Submit text to session
   - `GET /api/session/[id]` - Check if session exists

## Installation

```bash
cd repos/qr-text-share
npm install
```

## Usage

### Development Mode

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

**Note**: In development mode, Next.js hot-reloads on file changes which clears the in-memory session store. Sessions will only persist while the server is running without restarts.

### Production Mode

```bash
npm run build
npm start
```

Production mode runs the optimized build without hot-reloading, so sessions persist properly.

## How to Use

1. **Desktop**: Open the app and click "Generate QR Code"
2. **Mobile**: Scan the QR code with your phone's camera app
3. **Mobile**: Enter text in the form and tap "Send to Desktop"
4. **Desktop**: Text appears instantly! Click "Copy" to copy to clipboard

## Project Structure

```
repos/qr-text-share/
├── app/
│   ├── page.tsx                 # Desktop QR display page
│   ├── session/
│   │   └── [id]/
│   │       └── page.tsx         # Mobile input page
│   ├── api/
│   │   ├── session/
│   │   │   ├── route.ts         # POST: Create session, GET: Service info
│   │   │   └── [id]/
│   │   │       ├── route.ts     # POST: Update session, GET: Check session
│   │   │       └── stream/
│   │   │           └── route.ts # GET: SSE stream for real-time updates
│   ├── layout.tsx               # Root layout with metadata
│   └── globals.css              # Tailwind styles and custom CSS
├── lib/
│   ├── session-store.ts         # In-memory session management
│   └── qr-utils.ts              # QR code generation utilities
├── .gitignore
├── eslint.config.js
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
└── tsconfig.json
```

## API Endpoints

### POST /api/session

Creates a new sharing session.

**Request:**
```json
{
  "baseUrl": "http://localhost:3000"  // optional, defaults to request origin
}
```

**Response:**
```json
{
  "sessionId": "RAtT4awJyH",
  "sessionUrl": "http://localhost:3000/session/RAtT4awJyH",
  "qrUrl": "http://localhost:3000/session/RAtT4awJyH"
}
```

### GET /api/session/[id]

Check if a session exists.

**Response (200):**
```json
{
  "exists": true,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "hasText": false
}
```

**Response (404):**
```json
{
  "exists": false
}
```

### POST /api/session/[id]

Submit text to a session.

**Request:**
```json
{
  "text": "Hello from mobile!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Text shared successfully"
}
```

**Response (400):**
```json
{
  "success": false,
  "message": "Text is required"
}
```

**Response (404):**
```json
{
  "success": false,
  "message": "Session not found"
}
```

### GET /api/session/[id]/stream

Server-Sent Events endpoint for real-time text updates.

**Response:** `text/event-stream` stream

```javascript
// Initial connection message
data: {"type":"connected","sessionId":"RAtT4awJyH"}

// Text update message
data: {"type":"text","text":"Hello from mobile!"}

// Keepalive (every 15 seconds)
: keepalive
```

## Design Decisions

| Choice | Rationale |
|--------|-----------|
| SSE over WebSockets | Simpler for server-to-client only updates, built into Next.js API routes |
| In-Memory Storage | Sufficient for demo, no database setup required |
| App Router | Modern Next.js, better support for streaming responses |
| QR Library: `qrcode` | Specifically for generating QR codes (zxing is for reading) |
| Nanoid | Shorter, URL-safe IDs vs UUID - easier to scan in QR codes |

## Future Enhancements

- [ ] Session persistence with Redis or a database
- [ ] Session expiration with cleanup
- [ ] Multi-directional sharing (desktop to mobile)
- [ ] History of shared text per session
- [ ] Multiple text submissions per session
- [ ] WebSocket support for true bidirectional sync
- [ ] End-to-end encryption for sensitive text
- [ ] Rate limiting to prevent abuse
- [ ] Analytics dashboard

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
