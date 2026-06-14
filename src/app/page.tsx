export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-4">
      <div className="glass-card p-8 md:p-12 max-w-lg w-full space-y-8 text-center">
        {/* Logo */}
        <div className="w-20 h-20 mx-auto rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center glow-green">
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="20" cy="20" r="18" stroke="#00FF9D" strokeWidth="2" />
            <path
              d="M12 20c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8"
              stroke="#00FF9D"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="20" cy="20" r="3" fill="#00FF9D" />
          </svg>
        </div>

        {/* Hero */}
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight">
            Dora
            <span className="text-[var(--accent)]"> AI</span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)]">
            See it. Snap it. Buy it with crypto.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl">📸</div>
            <p className="text-xs text-[var(--text-secondary)]">Visual Search</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl">💰</div>
            <p className="text-xs text-[var(--text-secondary)]">Best Prices</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl">⚡</div>
            <p className="text-xs text-[var(--text-secondary)]">Pay with HBAR</p>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <a href="/agent" className="btn-accent text-center text-base">
            Chat with Dora
          </a>
          <a
            href="/onboarding"
            className="btn-glass text-center text-sm"
          >
            Learn More
          </a>
        </div>

        <p className="text-xs text-[var(--text-muted)]">
          Powered by Hedera · AI · IPFS
        </p>
      </div>
    </div>
  );
}
