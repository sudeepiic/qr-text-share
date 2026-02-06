import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/session-store';
import { generateQRCodeDataURL } from '@/lib/qr-utils';

/**
 * POST /api/session
 * Creates a new session for QR text sharing
 *
 * Request body: (optional)
 * {
 *   "baseUrl": string  // Defaults to request origin
 * }
 *
 * Response:
 * {
 *   "sessionId": string,
 *   "qrCodeDataUrl": string,  // base64 encoded QR code image
 *   "sessionUrl": string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = body.baseUrl || `${protocol}://${host}`;

    const result = createSession(baseUrl);

    // Generate the actual QR code image as a data URL
    const qrCodeDataUrl = await generateQRCodeDataURL(result.url, 300);

    return NextResponse.json({
      sessionId: result.id,
      sessionUrl: result.url,
      qrCodeDataUrl,  // This is the actual base64 image data
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/session
 * Returns information about the session service
 */
export async function GET() {
  return NextResponse.json({
    service: 'QR Text Share',
    version: '1.0.0',
    endpoints: {
      createSession: 'POST /api/session',
      updateSession: 'POST /api/session/[id]',
      streamSession: 'GET /api/session/[id]/stream',
    },
  });
}
