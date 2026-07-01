"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { listenToAuthState } from "@/lib/firebase";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
}

const starterMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    content:
      "Hello, I’m Nexio AI. I can help with studying, coding, business, creativity, and problem solving. What would you like to work on?",
  },
];

const STORAGE_KEY = "nexio-ai-conversations";

function createMessage(content: string, role: Message["role"]): Message {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    role,
    content,
  };
}

function createConversation(title = "New Chat", messages: Message[] = []): Conversation {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    createdAt: new Date().toISOString(),
    messages,
  };
}

function createTitleFromMessage(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean);
  const titleWords = words.slice(0, 6);
  return titleWords.join(" ").trim() || "New Chat";
}

export default function ChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0] ?? null,
    [activeConversationId, conversations]
  );

  const messages = activeConversation?.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  useEffect(() => {
    let cancelled = false;

    async function syncAuth() {
      try {
        const unsubscribe = await listenToAuthState((user) => {
          if (cancelled) {
            return;
          }

          setIsAuthenticated(Boolean(user));
          setAuthReady(true);
        });

        if (cancelled) {
          unsubscribe?.();
        }
      } catch {
        if (!cancelled) {
          setAuthReady(true);
          setIsAuthenticated(false);
        }
      }
    }

    syncAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [authReady, isAuthenticated, router]);

  useEffect(() => {
    if (!copiedMessageId) {
      return;
    }
    const timer = window.setTimeout(() => setCopiedMessageId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copiedMessageId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedConversations = window.localStorage.getItem(STORAGE_KEY);

      if (storedConversations) {
        const parsed = JSON.parse(storedConversations) as Conversation[];
        const normalized = Array.isArray(parsed)
          ? parsed
              .filter((conversation): conversation is Conversation => Boolean(conversation && typeof conversation === "object"))
              .map((conversation) => ({
                id: typeof conversation.id === "string" ? conversation.id : `chat-${Date.now()}`,
                title: typeof conversation.title === "string" && conversation.title.trim() ? conversation.title : "New Chat",
                createdAt: typeof conversation.createdAt === "string" ? conversation.createdAt : new Date().toISOString(),
                messages: Array.isArray(conversation.messages)
                  ? conversation.messages.filter(
                      (message): message is Message =>
                        Boolean(message) &&
                        typeof message === "object" &&
                        typeof message.content === "string" &&
                        (message.role === "user" || message.role === "assistant")
                    )
                  : [],
              }))
          : [];

        if (normalized.length > 0) {
          setConversations(normalized);
          setActiveConversationId(normalized[0].id);
        } else {
          const fallbackConversation = createConversation("New Chat", starterMessages);
          setConversations([fallbackConversation]);
          setActiveConversationId(fallbackConversation.id);
        }
      } else {
        const fallbackConversation = createConversation("New Chat", starterMessages);
        setConversations([fallbackConversation]);
        setActiveConversationId(fallbackConversation.id);
      }
    } catch {
      const fallbackConversation = createConversation("New Chat", starterMessages);
      setConversations([fallbackConversation]);
      setActiveConversationId(fallbackConversation.id);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations, isHydrated]);

  function createNewChat() {
    const nextConversation = createConversation("New Chat", []);
    setConversations((current) => [nextConversation, ...current]);
    setActiveConversationId(nextConversation.id);
    setDraft("");
    setError("");
  }

  function deleteConversation(conversationId: string) {
    setConversations((current) => {
      const nextConversations = current.filter((conversation) => conversation.id !== conversationId);

      if (nextConversations.length === 0) {
        const fallbackConversation = createConversation("New Chat", []);
        setActiveConversationId(fallbackConversation.id);
        return [fallbackConversation];
      }

      if (activeConversationId === conversationId) {
        setActiveConversationId(nextConversations[0].id);
      }

      return nextConversations;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = draft.trim();

    if (!trimmed || isLoading) {
      return;
    }

    let resolvedConversationId = activeConversationId ?? conversations[0]?.id;
    if (!resolvedConversationId) {
      const fallbackConversation = createConversation("New Chat", []);
      setConversations([fallbackConversation]);
      setActiveConversationId(fallbackConversation.id);
      resolvedConversationId = fallbackConversation.id;
    }

    const userMessage = createMessage(trimmed, "user");

    setConversations((current) =>
      current.map((conversation) => {
        if (conversation.id !== resolvedConversationId) {
          return conversation;
        }

        const hasUserMessages = conversation.messages.some((message) => message.role === "user");
        return {
          ...conversation,
          title: hasUserMessages ? conversation.title : createTitleFromMessage(trimmed),
          messages: [...conversation.messages, userMessage],
        };
      })
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

      const assistantMessage = createMessage(data.reply || "I’m here when you need me.", "assistant");

      setConversations((current) =>
        current.map((conversation) => {
          if (conversation.id !== resolvedConversationId) {
            return conversation;
          }
          return {
            ...conversation,
            messages: [...conversation.messages, assistantMessage],
          };
        })
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
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-3 py-3 sm:px-4 lg:flex-row lg:px-6 lg:py-6">
        <aside className="fixed inset-x-0 top-0 z-30 flex h-[72px] items-center justify-between border-b border-white/10 bg-black/95 px-4 backdrop-blur-xl sm:px-6 lg:static lg:h-auto lg:w-[280px] lg:flex-col lg:justify-start lg:rounded-[1.75rem] lg:border lg:bg-zinc-950/80 lg:p-4 lg:pr-3">
          <div className="flex w-full items-center justify-between lg:flex-col lg:items-stretch lg:gap-4">
            <div className="flex items-center justify-between lg:w-full">
              <Link href="/" className="text-sm font-semibold uppercase tracking-[0.35em] text-white transition hover:opacity-80">
                Nexio AI
              </Link>
              <Link href="/image" className="text-sm text-zinc-400 transition hover:text-white lg:hidden">
                Image
              </Link>
            </div>

            <button
              type="button"
              onClick={createNewChat}
              className="rounded-full border border-white/15 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-100"
            >
              New Chat
            </button>
          </div>

          <div className="hidden lg:block lg:w-full lg:pt-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Chats</p>
              </div>
              <div className="mt-4 max-h-[44vh] space-y-2 overflow-y-auto">
                {conversations.map((conversation) => {
                  const isActive = conversation.id === activeConversationId;

                  return (
                    <div
                      key={conversation.id}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition ${
                        isActive
                          ? "border-white/20 bg-white/10"
                          : "border-white/10 bg-black/40 hover:border-white/20 hover:bg-white/5"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveConversationId(conversation.id);
                          setDraft("");
                          setError("");
                        }}
                        className="flex-1 text-left"
                      >
                        <div className="truncate text-sm font-medium text-white">{conversation.title}</div>
                        <div className="mt-1 text-xs text-zinc-500">
                          {new Date(conversation.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteConversation(conversation.id);
                        }}
                        className="rounded-full border border-white/10 p-1.5 text-xs text-zinc-400 transition hover:border-white/20 hover:text-white"
                        aria-label={`Delete ${conversation.title}`}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="hidden lg:flex lg:w-full lg:items-center lg:justify-between lg:pt-6">
            <button
              type="button"
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-300 transition hover:border-white/30 hover:text-white"
            >
              Settings
            </button>
          </div>
        </aside>

        <section className="mt-[84px] flex min-h-[70vh] flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950/70 backdrop-blur-xl lg:mt-0 lg:ml-4">
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
