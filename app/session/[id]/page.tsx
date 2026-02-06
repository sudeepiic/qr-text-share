'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { MessageSquare, AlertCircle, Loader2, Clock } from 'lucide-react';

const DEBOUNCE_MS = 300;

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sessionExists, setSessionExists] = useState<boolean | null>(null);
  const [countdown, setCountdown] = useState(0);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingValueRef = useRef<string>('');

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

  const handleSubmit = useCallback(async (textToSubmit?: string) => {
    // Use the passed value or the pending value (fixes last letter issue)
    const text = textToSubmit || pendingValueRef.current || inputText;
    const trimmedText = text.trim();
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

      // Clear input after successful send
      setInputText('');
      pendingValueRef.current = '';
      setCountdown(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [sessionId, inputText]);

  // Auto-submit with debouncing and countdown
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputText(value);
    pendingValueRef.current = value;

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
        handleSubmit(value);
      }, DEBOUNCE_MS);

      // Countdown visual feedback (very short, so just show briefly)
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
        <Loader2 className="h-10 w-10 text-indigo-700 animate-spin" />
      </div>
    );
  }

  // Session not found
  if (sessionExists === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-4">
            <AlertCircle className="h-7 w-7 text-red-700" />
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

  // Input form state - textarea at top
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-start justify-center p-4 pt-8">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md">
        {/* Compact Header */}
        <div className="px-5 pt-4 pb-2 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-full mb-2">
            <MessageSquare className="h-5 w-5 text-indigo-700" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">
            Share Text
          </h1>
          {isSubmitting && (
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <Loader2 className="h-3 w-3 text-indigo-700 animate-spin" />
              <p className="text-xs text-gray-700">Sending...</p>
            </div>
          )}
        </div>

        {/* Textarea with auto-submit */}
        <div className="px-5 pb-4">
          <label htmlFor="text" className="sr-only">
            Your text
          </label>
          <textarea
            id="text"
            value={inputText}
            onChange={handleChange}
            placeholder="Type or paste your text here..."
            className="w-full px-4 py-3 border-2 border-gray-400 rounded-xl focus:ring-2 focus:ring-indigo-700 focus:border-indigo-700 resize-none bg-white text-gray-900 placeholder:text-gray-500 text-base"
            rows={7}
            disabled={isSubmitting}
            autoFocus
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-sm text-gray-700">
              {inputText.length} character{inputText.length !== 1 ? 's' : ''}
            </p>
            {inputText.trim() && !isSubmitting && countdown > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-indigo-700 font-medium">
                <Clock className="h-3.5 w-3.5" />
                Sending...
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-5 mb-4 bg-red-50 border-2 border-red-400 rounded-xl p-3" role="alert">
            <p className="text-red-900 text-sm font-medium">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
