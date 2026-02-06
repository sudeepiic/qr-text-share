'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

const DEBOUNCE_MS = 1500;

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [sessionExists, setSessionExists] = useState<boolean | null>(null);
  const [countdown, setCountdown] = useState(0);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/session/${sessionId}`);
      setSessionExists(response.ok);
    } catch {
      setSessionExists(false);
    }
  }, [sessionId]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleSubmit = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmedText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit text');
      }

      setSubmitted(true);
      setInputText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMore = () => {
    setSubmitted(false);
  };

  // Auto-submit with debouncing and countdown
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputText(value);

    // Clear existing timeout and interval
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    // Auto-submit after debounce delay (only if there's content)
    if (value.trim()) {
      setCountdown(Math.ceil(DEBOUNCE_MS / 1000));

      submitTimeoutRef.current = setTimeout(() => {
        handleSubmit();
      }, DEBOUNCE_MS);

      // Countdown visual feedback
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(0);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Loading state
  if (sessionExists === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-700 mb-3"></div>
        </div>
      </div>
    );
  }

  // Session not found
  if (sessionExists === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md p-6 max-w-md w-full text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-red-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Session Not Found
          </h1>
          <p className="text-gray-700 text-sm">
            Scan a new QR code from the desktop app.
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md p-6 max-w-md w-full text-center">
          <div className="mb-4">
            <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="h-6 w-6 text-green-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Sent!
          </h1>
          <p className="text-gray-700 text-sm mb-4">
            Text shared to desktop
          </p>
          <button
            onClick={handleSendMore}
            className="bg-indigo-700 hover:bg-indigo-800 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200 focus-ring-aa text-sm"
          >
            Send More
          </button>
        </div>
      </div>
    );
  }

  // Input form state - compact with auto-submit
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-md p-4 max-w-md w-full">
        {/* Header - Compact */}
        <div className="text-center mb-3">
          <h1 className="text-xl font-bold text-gray-900">
            Share Text
          </h1>
          {isSubmitting && (
            <p className="text-xs text-gray-700 mt-1">Sending...</p>
          )}
        </div>

        {/* Textarea with auto-submit */}
        <div>
          <label htmlFor="text" className="sr-only">
            Your text
          </label>
          <textarea
            id="text"
            value={inputText}
            onChange={handleChange}
            placeholder="Type here... auto-sends when you stop"
            className="w-full px-3 py-2.5 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-indigo-700 focus:border-indigo-700 resize-none bg-white text-gray-900 placeholder:text-gray-500 text-sm"
            rows={5}
            disabled={isSubmitting}
            autoFocus
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-700">
              {inputText.length} chars
            </p>
            {inputText.trim() && !isSubmitting && countdown > 0 && (
              <p className="text-xs text-indigo-700">
                Sending in {countdown}s...
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-400 rounded-lg p-2 mt-3" role="alert">
            <p className="text-red-900 text-xs font-medium">{error}</p>
          </div>
        )}

        {/* Session info */}
        <div className="mt-3 pt-3 border-t border-gray-300">
          <p className="text-xs text-gray-700 text-center">
            Session: <code className="bg-gray-100 px-2 py-0.5 rounded text-gray-900 border border-gray-300">{sessionId}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
