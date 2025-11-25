import Link from "next/link";
import Image from "next/image";

export function Navbar() {
  return (
    <div className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:max-w-7xl">
        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8 rounded-xl bg-gradient-to-br from-[#a9c3a2] to-[#2d4739] shadow-[0_10px_26px_rgba(45,71,57,0.35)] flex items-center justify-center overflow-hidden">
            <Image
              src="/logo.png"
              alt="Naiya logo"
              width={32}
              height={32}
              className="object-contain scale-100"
            />
          </div>
          <span className="text-lg font-semibold text-[var(--foreground)]">
            Naiya
          </span>
        </div>
        <nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-3 text-sm font-semibold text-[var(--foreground)]">
          <Link
            href="/"
            className="rounded-full px-3 py-2 transition hover:bg-[rgba(45,71,57,0.08)]"
          >
            Home
          </Link>
          <Link
            href="/schedule"
            className="rounded-full px-3 py-2 transition hover:bg-[rgba(45,71,57,0.08)]"
          >
            Schedule
          </Link>
        </nav>
      </div>
    </div>
  );
}
