import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession } from '@/lib/session-store';

/**
 * POST /api/session/[id]
 * Updates a session with new text from the mobile device
 *
 * Request body:
 * {
 *   "text": string  // The text to share
 * }
 *
 * Response:
 * {
 *   "success": boolean,
 *   "message": string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Text is required' },
        { status: 400 }
      );
    }

    const session = getSession(id);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Session not found' },
        { status: 404 }
      );
    }

    const trimmedText = body.text.trim();
    if (!trimmedText) {
      return NextResponse.json(
        { success: false, message: 'Text cannot be empty' },
        { status: 400 }
      );
    }

    updateSession(id, trimmedText);

    return NextResponse.json({
      success: true,
      message: 'Text shared successfully',
    });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/session/[id]
 * Checks if a session exists
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getSession(id);

    if (!session) {
      return NextResponse.json(
        { exists: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      exists: true,
      createdAt: session.createdAt,
      hasText: session.text.length > 0,
    });
  } catch (error) {
    console.error('Error checking session:', error);
    return NextResponse.json(
      { exists: false },
      { status: 500 }
    );
  }
}
