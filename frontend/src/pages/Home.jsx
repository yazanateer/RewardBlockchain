export default function Home() {
  return (
    <div className="min-h-screen text-white flex flex-col items-center justify-center px-4 text-center">
      <div className="border border-blue-500/30 rounded-2xl p-12 backdrop-blur-md bg-[rgba(255,255,255,0.05)] shadow-[0_0_30px_rgba(83,109,254,0.3)] max-w-3xl">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4">
          Welcome to <span className="text-[var(--color-primary)]">RewardChain</span>
        </h1>
        <p className="text-lg text-[var(--color-light-text)] max-w-2xl mx-auto">
          Earn blockchain-verified certificates for your learning achievements.
        </p>
      </div>
    </div>
  );
}
