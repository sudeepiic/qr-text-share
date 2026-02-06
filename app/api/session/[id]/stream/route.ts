import { NextRequest } from 'next/server';
import { getSession, addListener, removeListener } from '@/lib/session-store';

/**
 * GET /api/session/[id]/stream
 * Server-Sent Events (SSE) endpoint for real-time text updates
 *
 * This endpoint keeps the connection open and pushes updates whenever
 * text is submitted to the session.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Check if session exists
  const session = getSession(id);
  if (!session) {
    return new Response('Session not found', { status: 404 });
  }

  // Create a readable stream for SSE
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: 'connected', sessionId: id })}\n\n`;
      controller.enqueue(encoder.encode(data));

      // If there's already text in the session, send it immediately
      if (session.text) {
        const textData = `data: ${JSON.stringify({ type: 'text', text: session.text })}\n\n`;
        controller.enqueue(encoder.encode(textData));
      }

      // Add this controller to the session's listeners
      addListener(id, controller);

      // Send a keepalive comment every 15 seconds to prevent timeout
      const keepaliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch {
          // Connection likely closed
          clearInterval(keepaliveInterval);
        }
      }, 15000);

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(keepaliveInterval);
        removeListener(id, controller);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
    cancel() {
      // Cleanup when stream is cancelled
      removeListener(id, stream as unknown as ReadableStreamDefaultController);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
