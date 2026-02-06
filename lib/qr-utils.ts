/**
 * QR Code generation utilities
 * Uses the 'qrcode' library to generate QR codes as Data URLs
 */

import QRCode from 'qrcode';

/**
 * Generates a QR code as a Data URL for the given text
 * @param text - The text to encode in the QR code (usually a URL)
 * @param size - The size of the QR code image in pixels (default: 300)
 * @returns A Data URL containing the QR code image
 */
export async function generateQRCodeDataURL(
  text: string,
  size: number = 300
): Promise<string> {
  try {
    const dataURL = await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return dataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generates the session URL that will be encoded in the QR code
 * @param baseUrl - The base URL of the application (e.g., 'http://localhost:3000')
 * @param sessionId - The session ID
 * @returns The full URL to the session page
 */
export function generateSessionUrl(baseUrl: string, sessionId: string): string {
  // Remove trailing slash from baseUrl if present
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  return `${cleanBaseUrl}/session/${sessionId}`;
}

/**
 * Validates if a session ID is in the correct format
 * Session IDs should be alphanumeric with dashes and underscores
 */
export function isValidSessionId(id: string): boolean {
  // Nanoid generates URL-safe strings: [A-Za-z0-9_-]
  return /^[A-Za-z0-9_-]{10,}$/.test(id);
}
