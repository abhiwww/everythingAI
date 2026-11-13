'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/app/lib/api';
import { MessageBubble } from './MessageBubble';
import { Send, Clock, AlertCircle } from 'lucide-react';

export function Chat() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const loadMessages = useCallback(async (id: string) => {
    const res = await api.conversations.messages(id);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
    }
  }, []);

  const loadOrCreateConversation = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await api.conversations.list();
      if (list.ok) {
        const data = await list.json();
        if (data.conversations && data.conversations.length > 0) {
          setConversationId(data.conversations[0].id);
          await loadMessages(data.conversations[0].id);
          return;
        }
      }
      const created = await api.conversations.create({ title: 'New conversation' });
      if (created.ok) {
        const data = await created.json();
        setConversationId(data.conversation.id);
        return;
      }
      setLoadError('Could not start a conversation. Please refresh and try again.');
    } catch {
      setLoadError('Could not connect. Check that the API is running and try again.');
    }
  }, [loadMessages]);

  useEffect(() => {
    loadOrCreateConversation();
  }, [loadOrCreateConversation]);

  const handleSuggest = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || !conversationId || sending) return;
    setInput('');
    setSending(true);

    setMessages((prev) => [
      ...prev,
      { role: 'customer', content: text, created_at: new Date().toISOString() },
    ]);

    try {
      const res = await api.conversations.send(conversationId, { content: text });
      if (res.ok) {
        const data = await res.json();
        const assistant = data.assistant || { reply: '', demo_mode: false };
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: assistant.reply ?? '',
            created_at: new Date().toISOString(),
            metadata: assistant,
          },
        ]);
      } else {
        let detail = 'Please try again.';
        try {
          const err = await res.json();
          if (err?.message) detail = err.message;
        } catch {}
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Sorry, I couldn't complete that request. ${detail}`,
            created_at: new Date().toISOString(),
            metadata: { warning: 'Request failed' },
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Sorry, I could not reach the service. Check your connection and that the API is running.',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  if (!conversationId) {
    return (
      <div className="flex h-full items-center justify-center p-6" role="status" aria-live="polite">
        {loadError ? (
          <div className="flex max-w-md flex-col items-center gap-3 text-center">
            <AlertCircle className="h-8 w-8 text-rose-500" aria-hidden />
            <p className="text-sm text-slate-700">{loadError}</p>
            <button type="button" className="btn-secondary" onClick={() => loadOrCreateConversation()}>
              Try again
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Clock className="h-8 w-8 text-slate-400 animate-pulse" aria-hidden />
            <p className="text-slate-500">Starting conversation…</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div
        className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900"
        role="note"
      >
        Demo mode — sample data only. No real provider availability, bookings, or payments. Do not
        rely on this for real-world decisions.
      </div>

      <div
        className="flex-1 space-y-2 overflow-y-auto p-4"
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Conversation messages"
      >
        {messages.length === 0 && !sending && (
          <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">How can I help today?</p>
            <p className="mt-1 text-slate-600">
              Ask for help in plain language. I can suggest supported local services (cleaning,
              drivers, gardening/general household help) and guide you through a booking request —
              but I will always ask for your explicit confirmation before any booking request is
              sent.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                'I need my bathroom cleaned today',
                'Find a driver in Indiranagar tomorrow morning',
                'I need help with gardening this week',
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSuggest(s)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble
            key={m.id || `${m.role}-${m.created_at}-${i}`}
            message={m}
            isCustomer={m.role === 'customer'}
            onSuggest={handleSuggest}
          />
        ))}
        {sending && (
          <div className="flex justify-start" aria-label="Assistant is responding">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 animate-pulse" aria-hidden /> Thinking…
              </span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="border-t border-slate-200 bg-white p-4">
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="chat-input"
            ref={inputRef}
            className="input min-h-[44px] flex-1 resize-none py-2"
            placeholder="Ask for help (e.g. “I need my bathroom cleaned today”)"
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={sending}
            aria-describedby="chat-disclaimer"
          />
          <button
            type="submit"
            className="btn-primary shrink-0"
            disabled={sending || !input.trim()}
            aria-label={sending ? 'Sending message' : 'Send message'}
          >
            {sending ? <Clock className="h-4 w-4 animate-pulse" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          </button>
        </div>
        <p id="chat-disclaimer" className="mt-1 text-[11px] text-slate-500">
          Read-only searches and suggestions may happen without approval. Bookings, orders, and
          payments require your explicit confirmation.
        </p>
      </form>
    </div>
  );
}
