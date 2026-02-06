/**
 * In-memory session store for QR text sharing.
 * In production, you'd replace this with Redis or a database.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { nanoid } = require('nanoid');

export interface Session {
  id: string;
  text: string;
  createdAt: Date;
  listeners: Set<ReadableStreamDefaultController>;
}

interface CreateSessionResult {
  id: string;
  url: string;
}

const sessions = new Map<string, Session>();

/**
 * Creates a new session and returns its ID and URL
 */
export function createSession(baseUrl: string): CreateSessionResult {
  const id = nanoid(10); // 10-character ID is sufficient for QR codes

  const session: Session = {
    id,
    text: '',
    createdAt: new Date(),
    listeners: new Set(),
  };

  sessions.set(id, session);

  return {
    id,
    url: `${baseUrl}/session/${id}`,
  };
}

/**
 * Gets a session by ID, or returns undefined if not found
 */
export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

/**
 * Updates a session with new text and notifies all listeners
 */
export function updateSession(id: string, text: string): boolean {
  const session = sessions.get(id);
  if (!session) {
    return false;
  }

  session.text = text;

  // Notify all SSE listeners
  session.listeners.forEach((controller) => {
    try {
      controller.enqueue(`data: ${JSON.stringify({ text })}\n\n`);
    } catch {
      // Listener might be closed, remove it
      session.listeners.delete(controller);
    }
  });

  return true;
}

/**
 * Adds a new SSE listener to a session
 */
export function addListener(id: string, controller: ReadableStreamDefaultController): boolean {
  const session = sessions.get(id);
  if (!session) {
    return false;
  }

  session.listeners.add(controller);
  return true;
}

/**
 * Removes a listener from a session (cleanup on disconnect)
 */
export function removeListener(id: string, controller: ReadableStreamDefaultController): void {
  const session = sessions.get(id);
  if (session) {
    session.listeners.delete(controller);
  }
}

/**
 * Cleans up old sessions (optional enhancement)
 * Remove sessions older than the specified minutes
 */
export function cleanupOldSessions(maxAgeMinutes: number = 60): number {
  const now = new Date();
  let cleaned = 0;

  for (const [, session] of sessions.entries()) {
    const ageMinutes = (now.getTime() - session.createdAt.getTime()) / (1000 * 60);
    if (ageMinutes > maxAgeMinutes) {
      // Close all listeners
      session.listeners.forEach((controller) => {
        try {
          controller.close();
        } catch {
          // Ignore errors when closing
        }
      });
      sessions.delete(session.id);
      cleaned++;
    }
  }

  return cleaned;
}

// Run cleanup every 30 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cleanupOldSessions(60);
  }, 30 * 60 * 1000);
}
