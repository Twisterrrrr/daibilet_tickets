'use client';

import { Loader2, MessageCircle, Send, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

type ChatMessage = {
  id: string;
  authorType: 'CUSTOMER' | 'ADMIN' | 'SYSTEM';
  authorName: string | null;
  text: string;
  createdAt: string;
};

type Step = 'intro' | 'chat' | 'sending';

const STORAGE_KEY = 'daibilet_chat_v1';

function loadSession(): { conversationId: string; guestToken: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { conversationId?: string; guestToken?: string };
    if (!parsed.conversationId || !parsed.guestToken) return null;
    return { conversationId: parsed.conversationId, guestToken: parsed.guestToken };
  } catch {
    return null;
  }
}

function saveSession(session: { conversationId: string; guestToken: string } | null) {
  try {
    if (!session) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('intro');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  const lastCreatedAt = useMemo(() => {
    const last = messages[messages.length - 1];
    return last?.createdAt || null;
  }, [messages]);

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // Restore chat session on first open
  useEffect(() => {
    if (!open) return;
    const session = loadSession();
    if (!session) return;
    setConversationId(session.conversationId);
    setGuestToken(session.guestToken);
    setStep('chat');
  }, [open]);

  // Poll new messages while open + in chat
  useEffect(() => {
    if (!open) return;
    if (step !== 'chat') return;
    if (!conversationId || !guestToken) return;

    let cancelled = false;
    let timer: number | null = null;

    const tick = async () => {
      try {
        const qs = lastCreatedAt ? `?after=${encodeURIComponent(lastCreatedAt)}` : '';
        const res = await fetch(`${API_URL}/chat/${conversationId}/messages${qs}`, {
          headers: { Authorization: `Bearer ${guestToken}` },
        });
        if (!res.ok) {
          // token expired/invalid or server issue — reset local session
          saveSession(null);
          if (!cancelled) {
            setConversationId(null);
            setGuestToken(null);
            setMessages([]);
            setStep('intro');
          }
          return;
        }
        const data = (await res.json()) as { items?: ChatMessage[] };
        const items = Array.isArray(data.items) ? data.items : [];
        if (!cancelled && items.length > 0) {
          setMessages((prev) => [...prev, ...items]);
        }
      } catch {
        // ignore transient network errors
      }
    };

    void tick();
    timer = window.setInterval(tick, 4000);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [open, step, conversationId, guestToken, lastCreatedAt]);

  // Keep scroll pinned to bottom on new messages
  useEffect(() => {
    if (!open) return;
    if (step !== 'chat') return;
    scrollToBottom();
  }, [open, step, messages.length]);

  const startChat = async () => {
    if (!email.trim() || !text.trim()) return;
    setStep('sending');
    try {
      const res = await fetch(`${API_URL}/chat/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          message: text.trim(),
          honey: '',
        }),
      });
      if (!res.ok) {
        setStep('intro');
        return;
      }
      const data = (await res.json()) as { conversationId: string; guestToken: string };
      if (!data.conversationId || !data.guestToken) {
        setStep('intro');
        return;
      }
      const session = { conversationId: data.conversationId, guestToken: data.guestToken };
      saveSession(session);
      setConversationId(data.conversationId);
      setGuestToken(data.guestToken);
      setMessages([]);
      setText('');
      setStep('chat');
    } catch {
      setStep('intro');
    }
  };

  const sendMessage = async () => {
    if (!conversationId || !guestToken) return;
    if (!text.trim()) return;
    const msg = text.trim();
    setText('');
    try {
      await fetch(`${API_URL}/chat/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${guestToken}`,
        },
        body: JSON.stringify({ text: msg, honey: '' }),
      });
      // customer message will appear on next poll; fast-path optimistic UI:
      setMessages((prev) => [
        ...prev,
        {
          id: `local_${Date.now()}`,
          authorType: 'CUSTOMER',
          authorName: name.trim() || null,
          text: msg,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      // restore input on failure
      setText(msg);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={`
          fixed bottom-5 right-5 z-[60] w-14 h-14 rounded-full shadow-lg
          flex items-center justify-center
          transition-all duration-300 hover:scale-105
          ${open ? 'bg-slate-700' : 'bg-blue-600 hover:bg-blue-700'}
          text-white
          print:hidden
        `}
        aria-label={open ? 'Закрыть чат' : 'Написать в поддержку'}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-[60] w-[340px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col print:hidden">
          <div className="bg-blue-600 px-4 py-3 text-white">
            <p className="font-semibold text-sm">Чат поддержки</p>
            <p className="text-xs text-blue-100">Обычно отвечаем быстро. История сохраняется на этом устройстве.</p>
          </div>

          {step === 'sending' && (
            <div className="p-8 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
              <p className="text-sm text-slate-600">Отправляем...</p>
            </div>
          )}

          {step === 'intro' && (
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя (необязательно)"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (куда ответить)"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="Напишите вопрос..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              />
              <button
                onClick={startChat}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                Начать чат
              </button>
            </div>
          )}

          {step === 'chat' && (
            <>
              <div ref={listRef} className="p-4 space-y-3 overflow-y-auto flex-1 bg-slate-50">
                {messages.length === 0 ? (
                  <p className="text-xs text-slate-500">Напишите сообщение — оператор подключится.</p>
                ) : (
                  messages.map((m) => {
                    const mine = m.authorType === 'CUSTOMER';
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                            mine ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-900'
                          }`}
                        >
                          {!mine && (m.authorName || 'Поддержка') && (
                            <div className="text-[11px] opacity-70 mb-1">{m.authorName || 'Поддержка'}</div>
                          )}
                          {m.text}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 border-t border-slate-200 bg-white flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Сообщение..."
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <button
                  onClick={() => void sendMessage()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                  aria-label="Отправить"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

