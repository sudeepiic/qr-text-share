'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { QrCode, RefreshCw, Copy, Check, Wifi, WifiOff, Loader2 } from 'lucide-react';

interface SessionInfo {
  sessionId: string;
  sessionUrl: string;
  qrCodeDataUrl: string;
}

export default function HomePage() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [receivedText, setReceivedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
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

  const connectToStream = useCallback((sessionId: string) => {
    setIsListening(true);

    const eventSource = new EventSource(`/api/session/${sessionId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          console.log('Connected to session:', data.sessionId);
        } else if (data.type === 'text' || data.text) {
          setReceivedText(data.text);
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
  }, []);

  const generateQRCode = useCallback(async () => {
    // Use isRegenerating for subsequent QR generations
    if (sessionInfo) {
      setIsRegenerating(true);
    } else {
      setIsLoading(true);
    }
    setError('');
    setReceivedText('');
    setCopied(false);

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
      setIsRegenerating(false);
    }
  }, [connectToStream, sessionInfo]);

  // Auto-generate QR code on mount
  useEffect(() => {
    generateQRCode();
  }, [generateQRCode]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div>
              <QrCode className="h-8 w-8 text-indigo-700" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              QR Text Share
            </h1>
          </div>
          <p className="text-gray-700">
            Share text between devices instantly
          </p>
        </header>

        {/* Loading State */}
        {isLoading && !sessionInfo && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 text-indigo-700 animate-spin" />
              <p className="text-gray-700">Generating QR code...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !sessionInfo && (
          <div className="text-center py-12">
            <p className="text-red-700 font-medium mb-4" role="alert">{error}</p>
            <button
              onClick={generateQRCode}
              className="inline-flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white font-medium py-2.5 px-6 rounded-lg transition-colors duration-200 focus-ring-aa"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        )}

        {/* Side-by-side layout */}
        {sessionInfo && !isLoading && (
          <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {/* QR Code Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-indigo-700" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Scan to Connect
                  </h2>
                </div>
                <button
                  onClick={generateQRCode}
                  disabled={isRegenerating}
                  className="inline-flex items-center gap-1.5 text-gray-700 hover:text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium py-2 px-3 rounded-lg transition-colors duration-200 focus-ring-aa"
                >
                  <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                  New
                </button>
              </div>

              <div className="flex justify-center mb-6 relative">
                <div className="bg-white p-4 rounded-xl border-2 border-gray-300 shadow-inner transition-opacity duration-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sessionInfo.qrCodeDataUrl}
                    alt="QR Code - Scan with your phone camera to connect"
                    width={250}
                    height={250}
                    className={`w-[220px] h-[220px] ${isRegenerating ? 'opacity-30' : 'opacity-100'}`}
                  />
                </div>
                {isRegenerating && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-10 w-10 text-indigo-700 animate-spin" />
                  </div>
                )}
              </div>

              <div className="text-center space-y-3">
                <div>
                  <p className="text-sm text-gray-700 mb-1.5 font-medium">Session ID</p>
                  <code className="bg-gray-100 px-3 py-1.5 rounded-lg text-sm font-mono text-gray-900 border border-gray-300 transition-opacity duration-300">
                    {sessionInfo.sessionId}
                  </code>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm font-medium">
                  {isListening ? (
                    <>
                      <span className="flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span>
                      </span>
                      <span className="text-green-700">Listening for text</span>
                      <Wifi className="h-4 w-4 text-green-700" />
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-amber-700" />
                      <span className="text-amber-700">Connecting...</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Received Text Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Received Text
                </h2>
                {receivedText && (
                  <button
                    onClick={copyToClipboard}
                    className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus-ring-aa"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-700" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex-1 min-h-[280px]">
                {receivedText ? (
                  <div className="bg-gray-50 rounded-xl p-5 h-full border border-gray-200 overflow-auto">
                    <p className="text-gray-900 whitespace-pre-wrap break-words text-base leading-relaxed">
                      {receivedText}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-5 h-full flex flex-col items-center justify-center border border-gray-200">
                    <p className="text-gray-700 text-center mb-2">
                      Waiting for text from your phone...
                    </p>
                    <p className="text-gray-500 text-center text-sm">
                      Scan the QR code and start typing
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
