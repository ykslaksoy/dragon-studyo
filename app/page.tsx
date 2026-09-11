export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <div className="flex max-w-lg flex-col items-center text-center">
          <span
            aria-hidden
            className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-lg font-semibold tracking-tight text-amber-200 shadow-lg shadow-amber-950/20 dark:bg-amber-200 dark:text-zinc-950 dark:shadow-none"
          >
            D
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl dark:text-zinc-50">
            Dragon Stüdyo
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Site yayında. İçerikler yakında burada olacak.
          </p>
        </div>
      </main>
    </div>
  );
}
