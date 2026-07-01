"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function ImagePage() {
  const [prompt, setPrompt] = useState("A futuristic cyberpunk city during rain at night");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [lastPrompt, setLastPrompt] = useState("");
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Please enter a prompt to generate an image.");
      return;
    }

    setError("");
    setIsGenerating(true);
    setImageLoaded(false);
    setLastPrompt(trimmed);

    const encodedPrompt = encodeURIComponent(trimmed);
    const nextUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${Date.now()}`;
    setImageUrl(nextUrl);

    window.setTimeout(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  }

  async function handleDownload() {
    if (!imageUrl) {
      return;
    }

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error("Unable to download the generated image.");
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${lastPrompt || "nexio-ai-image"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch {
      setError("The image could not be downloaded right now.");
    }
  }

  async function handleCopyPrompt() {
    if (!lastPrompt) {
      return;
    }
    await navigator.clipboard.writeText(lastPrompt);
    setCopied(true);
  }

  function handleClear() {
    setPrompt("");
    setError("");
    setImageUrl(null);
    setImageLoaded(false);
    setLastPrompt("");
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 sm:px-8 lg:px-10">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.35em] text-white transition hover:opacity-80">
          Nexio AI
        </Link>
        <Link href="/chat" className="text-sm text-zinc-400 transition hover:text-white">
          Start Chat
        </Link>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-88px)] max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_0_80px_rgba(255,255,255,0.04)] backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-400">
              AI Image Generator
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
              AI Image Generator
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg">
              Create stunning AI images from a simple prompt.
            </p>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4 sm:p-6">
              <label htmlFor="image-prompt" className="text-sm font-medium text-zinc-300">
                Prompt
              </label>
              <textarea
                id="image-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleGenerate();
                  }
                }}
                placeholder="A futuristic cyberpunk city during rain at night"
                rows={8}
                className="mt-3 w-full rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-zinc-500 focus:border-white/25"
              />

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGenerating ? "Generating..." : "Generate Image"}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/10"
                >
                  Clear Prompt
                </button>
                {imageUrl ? (
                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/10"
                  >
                    Regenerate
                  </button>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {lastPrompt ? (
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:border-white/20 hover:text-white"
                  >
                    {copied ? "Prompt Copied" : "Copy Prompt"}
                  </button>
                ) : null}
              </div>

              {error ? (
                <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}
            </div>

            <div ref={previewRef} className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Preview</h2>
                {imageLoaded && imageUrl ? (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-300 transition hover:border-white/30 hover:text-white"
                  >
                    Download Image
                  </button>
                ) : null}
              </div>

              <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950">
                {imageUrl ? (
                  <div className="relative min-h-[320px]">
                    {isGenerating && !imageLoaded ? (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-white/10 to-transparent">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 animate-bounce rounded-full bg-white [animation-delay:0ms]" />
                          <span className="h-3 w-3 animate-bounce rounded-full bg-white [animation-delay:150ms]" />
                          <span className="h-3 w-3 animate-bounce rounded-full bg-white [animation-delay:300ms]" />
                        </div>
                      </div>
                    ) : null}
                    <img
                      key={imageUrl}
                      src={imageUrl}
                      alt={lastPrompt || "Generated AI art"}
                      className={`h-full w-full object-cover ${isGenerating && !imageLoaded ? "opacity-0" : "opacity-100"}`}
                      onLoad={() => {
                        setIsGenerating(false);
                        setImageLoaded(true);
                        setError("");
                      }}
                      onError={() => {
                        setIsGenerating(false);
                        setImageLoaded(false);
                        setError("Image generation failed. Please try another prompt.");
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-sm leading-7 text-zinc-500">
                    Your generated image will appear here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
