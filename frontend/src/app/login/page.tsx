"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUpWithEmail, signInWithEmail, signInWithMagicLink, signInWithGoogle } from "@/lib/auth";
import { Mail, Lock, Sparkles, Chrome } from "lucide-react";

type AuthMode = "signin" | "signup" | "magic-link";

export default function Login() {
    const router = useRouter();
    const [mode, setMode] = useState<AuthMode>("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            if (mode === "signup") {
                await signUpWithEmail(email, password);
                setMessage("Account created! Check your email to confirm (local dev: confirmation disabled).");
                // For local dev without email confirmation, redirect immediately
                setTimeout(() => router.push("/"), 2000);
            } else if (mode === "signin") {
                await signInWithEmail(email, password);
                setMessage("Signed in successfully!");
                router.push("/");
            }
        } catch (err: any) {
            setError(err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            await signInWithMagicLink(email);
            setMessage("Magic link sent! Check your email to sign in.");
        } catch (err: any) {
            setError(err.message || "Failed to send magic link");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setLoading(true);
        setError("");
        setMessage("");

        try {
            await signInWithGoogle();
        } catch (err: any) {
            setError(err.message || "Google sign-in failed");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--foreground)] p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-lg">
                {/* Header */}
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight">Welcome to Naiya</h2>
                    <p className="mt-2 text-[var(--muted-foreground)]">
                        AI-powered schedule planning
                    </p>
                </div>

                {/* Mode Tabs */}
                <div className="flex gap-2 p-1 bg-[var(--background)] rounded-lg">
                    <button
                        onClick={() => setMode("signin")}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            mode === "signin"
                                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => setMode("signup")}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            mode === "signup"
                                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        Sign Up
                    </button>
                    <button
                        onClick={() => setMode("magic-link")}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            mode === "magic-link"
                                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        Magic Link
                    </button>
                </div>

                {/* Email/Password Form */}
                {(mode === "signin" || mode === "signup") && (
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--foreground)] focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                    className="w-full pl-10 pr-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--foreground)] focus:border-transparent"
                                />
                            </div>
                            {mode === "signup" && (
                                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                                    Minimum 6 characters
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-[var(--foreground)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Loading..." : mode === "signin" ? "Sign In" : "Create Account"}
                        </button>
                    </form>
                )}

                {/* Magic Link Form */}
                {mode === "magic-link" && (
                    <form onSubmit={handleMagicLink} className="space-y-4">
                        <div>
                            <label htmlFor="magic-email" className="block text-sm font-medium mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
                                <input
                                    id="magic-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--foreground)] focus:border-transparent"
                                />
                            </div>
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                                We&apos;ll send you a magic link to sign in
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-[var(--foreground)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Sending..." : "Send Magic Link"}
                        </button>
                    </form>
                )}

                {/* Divider */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[var(--border)]"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-[var(--card)] text-[var(--muted-foreground)]">
                            Or continue with
                        </span>
                    </div>
                </div>

                {/* Google OAuth (Optional) */}
                <button
                    onClick={handleGoogleAuth}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white text-gray-900 rounded-lg font-medium shadow-sm hover:bg-gray-50 transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Chrome className="h-5 w-5 text-blue-600" />
                    <span>Google (requires OAuth setup)</span>
                </button>

                {/* Messages */}
                {message && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-800 dark:text-green-200">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
                        {error}
                    </div>
                )}

                {/* Local Dev Info */}
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                        <strong>Local Dev:</strong> Email confirmation disabled. Sign up and sign in work immediately.
                    </p>
                </div>
            </div>
        </div>
    );
}
