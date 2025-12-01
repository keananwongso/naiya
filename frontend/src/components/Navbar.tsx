import Link from "next/link";
import Image from "next/image";

export function Navbar() {
  return (
    <div className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:py-4 sm:px-6 lg:max-w-7xl">
        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Naiya logo"
              width={32}
              height={32}
              className="object-contain scale-100"
            />
          </div>
          <span className="text-base sm:text-lg font-semibold text-[var(--foreground)]">
            Naiya
          </span>
        </div>
        {/* Desktop: Center navigation */}
        <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-3 text-sm font-semibold text-[var(--foreground)]">
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
        {/* Mobile: Right-aligned navigation */}
        <nav className="flex md:hidden items-center gap-1 text-sm font-semibold text-[var(--foreground)]">
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
