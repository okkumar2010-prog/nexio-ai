"use client";

import Link from "next/link";
import { FormEvent, MouseEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: number;
  title: string;
  messages: Message[];
};

const STORAGE_KEY = "nexio-chat-history";
const starterAssistantMessage: Message = {
  id: 1,
  role: "assistant",
  content:
    "Hello, I’m Nexio AI. I can help with studying, coding, business, creativity, and problem solving. What would you like to work on?",
};

function createStarterConversation(id = Date.now()): Conversation {
  return {
    id,
    title: "New Chat",
    messages: [starterAssistantMessage],
  };
}

function buildConversationTitle(message: string) {
  const cleaned = message.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "New Chat";
  }

  return cleaned.length > 36 ? `${cleaned.slice(0, 33)}...` : cleaned;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0] ?? null;
  const messages = activeConversation?.messages ?? [];

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          conversations?: Conversation[];
          activeConversationId?: number;
        };

        if (Array.isArray(parsed.conversations) && parsed.conversations.length > 0) {
          const restored = parsed.conversations;
          setConversations(restored);
          setActiveConversationId(parsed.activeConversationId ?? restored[0].id);
        } else {
          const fallback = createStarterConversation();
          setConversations([fallback]);
          setActiveConversationId(fallback.id);
        }
      } else {
        const fallback = createStarterConversation();
        setConversations([fallback]);
        setActiveConversationId(fallback.id);
      }
    } catch {
      const fallback = createStarterConversation();
      setConversations([fallback]);
      setActiveConversationId(fallback.id);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!copiedMessageId) {
      return;
    }
    const timer = window.setTimeout(() => setCopiedMessageId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copiedMessageId]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        conversations,
        activeConversationId,
      })
    );
  }, [conversations, activeConversationId, isHydrated]);

  function handleNewChat() {
    const nextConversation = createStarterConversation(Date.now());
    setConversations((current) => [nextConversation, ...current]);
    setActiveConversationId(nextConversation.id);
    setDraft("");
    setError("");
  }

  function handleSelectConversation(id: number) {
    setActiveConversationId(id);
    setDraft("");
    setError("");
  }

  function handleDeleteConversation(id: number, event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const remaining = conversations.filter((conversation) => conversation.id !== id);
    if (remaining.length === 0) {
      const fallback = createStarterConversation(Date.now());
      setConversations([fallback]);
      setActiveConversationId(fallback.id);
      return;
    }

    setConversations(remaining);
    if (activeConversationId === id) {
      setActiveConversationId(remaining[0].id);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = draft.trim();

    if (!trimmed || isLoading || !activeConversation) {
      return;
    }

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: trimmed,
    };

    const title = activeConversation.title === "New Chat" && !activeConversation.messages.some((message) => message.role === "user")
      ? buildConversationTitle(trimmed)
      : activeConversation.title;

    const conversationWithUserMessage: Conversation = {
      ...activeConversation,
      title,
      messages: [...activeConversation.messages, userMessage],
    };

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeConversation.id ? conversationWithUserMessage : conversation
      )
    );
    setDraft("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to get a response right now.");
      }

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.reply || "I’m here when you need me.",
      };

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
                ...conversation,
                messages: [...conversation.messages, assistantMessage],
              }
            : conversation
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyMessage(content: string, id: number) {
    await navigator.clipboard.writeText(content);
    setCopiedMessageId(id);
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6 lg:flex-row lg:px-6 lg:py-6">
        <aside className="w-full rounded-[1.75rem] border border-white/10 bg-zinc-950/80 p-4 backdrop-blur-xl lg:mr-4 lg:w-80 lg:p-5">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-sm font-semibold uppercase tracking-[0.35em] text-white transition hover:opacity-80">
              Nexio AI
            </Link>
            <Link href="/image" className="text-sm text-zinc-400 transition hover:text-white">
              Image
            </Link>
          </div>

          <button
            type="button"
            onClick={handleNewChat}
            className="mt-6 flex w-full items-center justify-center rounded-full border border-white/15 bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-zinc-100"
          >
            New Chat
          </button>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">History</p>
            <div className="mt-4 space-y-2">
              {conversations.length > 0 ? (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => handleSelectConversation(conversation.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                      activeConversationId === conversation.id
                        ? "border-white/20 bg-white/10 text-white"
                        : "border-white/10 bg-black/40 text-zinc-300 hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <span className="truncate pr-2">{conversation.title}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => handleDeleteConversation(conversation.id, event)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleDeleteConversation(conversation.id, event as unknown as MouseEvent<HTMLButtonElement>);
                        }
                      }}
                      className="shrink-0 text-zinc-500 transition hover:text-white"
                      aria-label={`Delete ${conversation.title}`}
                    >
                      ×
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-sm text-zinc-500">Your recent conversations will appear here.</p>
              )}
            </div>
          </div>
        </aside>

        <section className="mt-4 flex min-h-[70vh] flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950/70 backdrop-blur-xl lg:mt-0">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex max-w-[90%] items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${message.role === "user" ? "border-white/15 bg-white text-black" : "border-white/10 bg-white/10 text-white"}`}>
                      {message.role === "user" ? "U" : "N"}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-7 shadow-sm sm:text-[15px] ${
                        message.role === "user"
                          ? "bg-white text-black"
                          : "border border-white/10 bg-white/5 text-zinc-200"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <div className="space-y-3">
                          <div className="prose prose-invert max-w-none prose-p:my-2 prose-pre:my-0 prose-code:rounded prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                code({ className, children, ...props }) {
                                  const match = /language-(\w+)/.exec(className || "");
                                  const isInline = !match;
                                  return isInline ? (
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  ) : (
                                    <SyntaxHighlighter
                                      style={oneDark as never}
                                      language={match[1]}
                                      PreTag="div"
                                      customStyle={{
                                        margin: 0,
                                        borderRadius: "0.75rem",
                                        background: "rgba(255,255,255,0.06)",
                                      }}
                                    >
                                      {String(children).replace(/\n$/, "")}
                                    </SyntaxHighlighter>
                                  );
                                },
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>

                          <button
                            type="button"
                            onClick={() => copyMessage(message.content, message.id)}
                            className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.25em] text-zinc-400 transition hover:border-white/20 hover:text-white"
                          >
                            {copiedMessageId === message.id ? "Copied" : "Copy"}
                          </button>
                        </div>
                      ) : (
                        <div>{message.content}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm font-semibold text-white">
                      N
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-white [animation-delay:0ms]" />
                        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-white [animation-delay:150ms]" />
                        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-white [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error ? (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="border-t border-white/10 bg-black/40 p-4 sm:p-5">
            <div className="mx-auto flex max-w-3xl items-end gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSubmit(event);
                  }
                }}
                placeholder="Message Nexio AI"
                rows={1}
                className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 text-sm text-white outline-none placeholder:text-zinc-500"
              />
              <button
                type="submit"
                disabled={isLoading || !draft.trim()}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Thinking" : "Send"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
