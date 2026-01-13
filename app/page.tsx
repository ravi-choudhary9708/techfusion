import { Scanner } from "@/components/Scanner";
import { Lock } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background relative selection:bg-primary/20">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-violet-500/10 rounded-full blur-[128px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[96px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-20 pb-32">
        {/* Header */}
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur-sm mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            Secret Analyzer
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Protect your codebase. Instantly scan for exposed API keys, tokens, and sensitive data before they leak.
          </p>
        </div>

        {/* Main Application */}
        <Scanner />

        {/* Footer */}
        <footer className="mt-32 text-center text-zinc-600 text-sm">
          <p>Local scanning. Your data is processed securely and never stored.</p>
        </footer>
      </div>
    </main>
  );
}
