'use client';

import { useState, useRef, useEffect } from 'react';

interface SessionInfo {
  sessionId: string;
  sessionUrl: string;
  qrCodeDataUrl: string;
}

export default function HomePage() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [receivedText, setReceivedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Auto-generate QR code on mount
  useEffect(() => {
    generateQRCode();
  }, []);

  const generateQRCode = async () => {
    setIsLoading(true);
    setError('');
    setReceivedText('');

    // Close any existing EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const baseUrl = `${window.location.protocol}//${window.location.host}`;

      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      setSessionInfo(data);

      // Connect to SSE stream for real-time updates
      connectToStream(data.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const connectToStream = (sessionId: string) => {
    setIsListening(true);

    const eventSource = new EventSource(`/api/session/${sessionId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          console.log('Connected to session:', data.sessionId);
        } else if (data.type === 'text' || data.text) {
          setReceivedText(data.text);
          // Optional: Show a notification or highlight the text
        }
      } catch {
        console.error('Error parsing SSE message');
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      setIsListening(false);
      eventSource.close();
    };

    eventSourceRef.current = eventSource;
  };

  const copyToClipboard = async () => {
    if (receivedText) {
      try {
        await navigator.clipboard.writeText(receivedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        console.error('Failed to copy');
      }
    }
  };

  const resetSession = () => {
    setSessionInfo(null);
    setReceivedText('');
    setIsListening(false);
    setError('');
    setCopied(false);

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-4">
        {/* Header - Compact */}
        <header className="text-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            QR Text Share
          </h1>
        </header>

        {/* Loading State */}
        {isLoading && !sessionInfo && (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-700"></div>
          </div>
        )}

        {/* Error State */}
        {error && !sessionInfo && (
          <div className="text-center py-8">
            <p className="text-red-700 text-sm font-medium" role="alert">{error}</p>
            <button
              onClick={generateQRCode}
              className="mt-4 text-indigo-700 hover:text-indigo-900 underline text-sm"
            >
              Try again
            </button>
          </div>
        )}

        {/* Side-by-side layout */}
        {sessionInfo && (
          <main className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl mx-auto">
            {/* QR Code Card */}
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  Scan to Connect
                </h2>
                <button
                  onClick={resetSession}
                  className="text-gray-700 hover:text-gray-900 text-xs underline focus-ring-aa"
                >
                  New
                </button>
              </div>

              <div className="flex justify-center mb-3">
                <div className="bg-white p-2 rounded-lg border-2 border-gray-400">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sessionInfo.qrCodeDataUrl}
                    alt="QR Code - Scan with your phone camera to connect"
                    width={200}
                    height={200}
                    className="w-[180px] h-[180px]"
                  />
                </div>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-700 mb-1 font-medium">Session:</p>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-900 border border-gray-300">
                  {sessionInfo.sessionId}
                </code>
                <p className="text-xs text-gray-700 mt-2 font-medium">
                  {isListening ? (
                    <span className="text-green-700">● Listening</span>
                  ) : (
                    <span className="text-amber-700">○ Connecting...</span>
                  )}
                </p>
              </div>
            </div>

            {/* Received Text Card */}
            <div className="bg-white rounded-xl shadow-md p-4 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  Received Text
                </h2>
                {receivedText && (
                  <button
                    onClick={copyToClipboard}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-900 text-xs font-medium py-1.5 px-3 rounded-lg transition-colors duration-200 focus-ring-aa"
                  >
                    {copied ? '✓ Copied!' : 'Copy'}
                  </button>
                )}
              </div>

              <div className="flex-1 min-h-[200px]">
                {receivedText ? (
                  <div className="bg-gray-50 rounded-lg p-3 h-full border border-gray-200 overflow-auto">
                    <p className="text-gray-900 whitespace-pre-wrap break-words text-sm">
                      {receivedText}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3 h-full flex items-center justify-center border border-gray-200">
                    <p className="text-gray-700 text-center text-sm">
                      Waiting for text...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
