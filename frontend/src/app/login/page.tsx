"use client";

import { useRouter } from "next/navigation";

export default function Login() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
            <div className="w-full max-w-md p-8 space-y-6 bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-lg text-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Welcome to Naiya</h2>
                    <p className="mt-2 text-[var(--muted-foreground)]">AI-powered schedule planning</p>
                </div>

                <button
                    onClick={() => router.push("/schedule")}
                    className="w-full py-3 bg-[var(--foreground)] text-[var(--background)] rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                    Try Naiya
                </button>

                <p className="text-xs text-[var(--muted-foreground)]">
                    No login required for local demo
                </p>
            </div>
        </div>
    );
}
