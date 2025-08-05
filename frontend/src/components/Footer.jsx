export default function Footer() {
  return (
    <footer className="bg-[rgba(255,255,255,0.05)] backdrop-blur-md border-t border-blue-500/30 shadow-[0_0_15px_rgba(83,109,254,0.2)] text-center py-6 mt-10 font-sans">
      <p className="text-[var(--color-light-text)] text-sm tracking-wide">
        © {new Date().getFullYear()} <span className="text-[var(--color-primary)] font-semibold">RewardChain</span>. All rights reserved.
      </p>
    </footer>
  );
}
