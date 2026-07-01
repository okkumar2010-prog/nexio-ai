import Link from "next/link";

const highlights = [
  {
    title: "Instant thinking",
    description: "Turn ideas into polished text, strategy, and product direction in seconds.",
  },
  {
    title: "Visual creation",
    description: "Generate striking concepts and assets with cinematic precision and clarity.",
  },
  {
    title: "Designed for focus",
    description: "A calm, distraction-free workspace that feels as refined as the ideas it helps shape.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="text-sm font-semibold uppercase tracking-[0.35em] text-white transition hover:opacity-80"
        >
          Nexio AI
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
          <Link href="/chat" className="transition hover:text-white">
            Start Chat
          </Link>
          <Link href="/image" className="transition hover:text-white">
            Generate Image
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-88px)] max-w-7xl flex-col justify-center px-6 py-12 sm:px-8 lg:px-10 lg:py-20">
        <div className="max-w-4xl">
          <div className="mb-8 inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[0.7rem] font-medium uppercase tracking-[0.3em] text-zinc-300">
            Premium AI studio
          </div>

          <h1 className="text-5xl font-semibold tracking-[-0.03em] text-white sm:text-7xl lg:text-8xl">
            Nexio AI
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400 sm:text-xl">
            Learn. Create. Imagine.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/chat"
              className="group inline-flex items-center justify-center rounded-full border border-white/20 bg-white px-6 py-3 text-sm font-medium text-black transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-100 hover:shadow-[0_0_40px_rgba(255,255,255,0.16)]"
            >
              Start Chat
            </Link>
            <Link
              href="/image"
              className="group inline-flex items-center justify-center rounded-full border border-white/15 bg-transparent px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-1 hover:border-white/40 hover:bg-white/10"
            >
              Generate Image
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10"
            >
              <h2 className="text-lg font-semibold text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-400">{item.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
