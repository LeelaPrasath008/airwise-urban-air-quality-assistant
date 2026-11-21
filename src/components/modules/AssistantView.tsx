import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { sendAssistantMessage } from '../../services/api.ts';
import type { AirQualitySnapshot, ChatTurn } from '../../shared/types.ts';

interface AssistantViewProps {
  snapshot: AirQualitySnapshot | null;
  messages: ChatTurn[];
  onUpdateMessages: (updater: (prev: ChatTurn[]) => ChatTurn[]) => void;
}

const STARTER_PROMPTS = [
  'Is it a good idea to exercise outdoors today?',
  "How can I improve my bedroom's air quality tonight?",
  'What is the safest way to commute during severe smog?',
  'How can my family reduce daily pollution exposure?',
  'What can our neighborhood community do to reduce air pollution?',
  'What should I do when AQI becomes Severe?',
];

export function AssistantView({
  snapshot,
  messages,
  onUpdateMessages,
}: AssistantViewProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    endRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }, [messages, sending]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const submitPrompt = async (promptText: string) => {
    const cleaned = promptText.trim();
    if (cleaned.length < 2 || sending) return;
    if (!snapshot) {
      setError('Waiting for location air quality context to load before messaging AIRWISE AI.');
      return;
    }

    setError(null);
    const userTurn: ChatTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: cleaned,
      timestampIso: new Date().toISOString(),
    };

    const recentHistory = messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    onUpdateMessages((prev) => [...prev, userTurn]);
    setInput('');
    setSending(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await sendAssistantMessage({
        message: cleaned,
        history: recentHistory,
        snapshot,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      const assistantTurn: ChatTurn = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestampIso: new Date().toISOString(),
        source: response.source,
        fallbackNotice: response.fallbackNotice,
      };
      onUpdateMessages((prev) => [...prev, assistantTurn]);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(
        err instanceof Error
          ? err.message
          : 'Could not reach AIRWISE AI right now. Please try again.'
      );
    } finally {
      if (!controller.signal.aborted) {
        setSending(false);
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitPrompt(input);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs text-[#5E7068]">
            {snapshot
              ? `Context active: ${snapshot.location.name} · AQI ${snapshot.aqi} (${snapshot.category.label}) · PM2.5 ${snapshot.pollutants.pm25} µg/m³`
              : 'Loading local air quality context...'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111C18]">AIRWISE AI Assistant</h1>
          <p className="text-sm text-[#4A5B54] max-w-2xl">
            Ask practical questions about outdoor safety, commuting, indoor air, or community smog
            action. Answers adapt to your selected city and current AQI.
          </p>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => onUpdateMessages(() => [])}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#4A5B54] bg-white border border-[#CBD5D0] rounded-lg hover:text-[#111C18] hover:bg-[#F6F8F7] transition-colors self-start sm:self-end whitespace-nowrap"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Clear chat
          </button>
        )}
      </header>

      {/* Main Conversational Surface */}
      <section
        aria-label="AIRWISE AI conversation"
        className="bg-white border border-[#E2E8E5] rounded-xl flex flex-col min-h-[520px] max-h-[68vh]"
      >
        <div
          className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.length === 0 ? (
            <div className="space-y-5 py-4">
              <div className="space-y-1.5">
                <h2 className="text-base font-semibold text-[#111C18]">
                  Ask anything about today&rsquo;s air quality
                </h2>
                <p className="text-sm text-[#4A5B54]">
                  Select a common family question below or type your own situation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={sending || !snapshot}
                    onClick={() => void submitPrompt(prompt)}
                    className="text-left p-3.5 text-sm text-[#111C18] bg-[#F6F8F7] border border-[#E2E8E5] rounded-lg hover:border-[#1F7A5C] hover:bg-[#F2FAF6] transition-colors disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((turn) => (
              <div
                key={turn.id}
                className={`flex flex-col ${turn.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] sm:max-w-[78%] rounded-xl px-4 py-3.5 text-sm leading-relaxed ${
                    turn.role === 'user'
                      ? 'bg-[#11382B] text-white'
                      : 'bg-[#F6F8F7] border border-[#E2E8E5] text-[#111C18]'
                  }`}
                >
                  <div className="text-[11px] mb-1.5 opacity-80 font-medium">
                    {turn.role === 'user'
                      ? 'You'
                      : turn.source === 'gemini_ai'
                        ? 'AIRWISE AI'
                        : 'AIRWISE Safety Guidance (Rule-Based Fallback)'}
                  </div>
                  {/* Safe plain-text paragraph rendering — prevents XSS */}
                  <div className="space-y-2 whitespace-pre-line">{turn.content}</div>
                  {turn.fallbackNotice && (
                    <p className="text-[11px] text-[#5E7068] mt-3 pt-2 border-t border-[#E2E8E5]">
                      {turn.fallbackNotice}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="flex items-start" role="status" aria-live="polite">
              <div className="rounded-xl px-4 py-3 bg-[#F6F8F7] border border-[#E2E8E5] text-sm text-[#4A5B54]">
                AIRWISE AI is analyzing {snapshot?.location.name}&rsquo;s air quality context...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input Composer */}
        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-[#E2E8E5] bg-[#F6F8F7]/60 space-y-2"
        >
          {error && (
            <p id="assistant-form-error" role="alert" className="text-xs text-[#991B1B]">
              {error}
            </p>
          )}
          <div className="flex items-center gap-2.5">
            <label htmlFor="ai-question-input" className="sr-only">
              Ask AIRWISE AI a question
            </label>
            <input
              id="ai-question-input"
              type="text"
              value={input}
              maxLength={800}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'assistant-form-error' : undefined}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about outdoor exercise, school commute, HEPA sizing, or severe AQI..."
              className="flex-1 px-4 py-2.5 text-sm bg-white border border-[#CBD5D0] rounded-lg text-[#111C18] placeholder:text-[#5E7068]"
            />
            <button
              type="submit"
              disabled={sending || input.trim().length < 2 || !snapshot}
              aria-label="Send message to AIRWISE AI"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#11382B] rounded-lg hover:bg-[#174C3A] transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Ask
            </button>
          </div>
          <p className="text-[11px] text-[#5E7068]">
            AIRWISE AI offers practical environmental guidance, not medical diagnosis. Always follow official public-health advisories during Very Poor or Severe pollution events.
          </p>
        </form>
      </section>
    </div>
  );
}
