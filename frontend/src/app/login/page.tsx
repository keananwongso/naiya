"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Chrome } from "lucide-react";

export default function Login() {
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (error) {
            console.error("Error logging in:", error);
            alert("Error logging in with Google");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
            <div className="w-full max-w-md p-8 space-y-8 bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-lg text-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Welcome to Naiya</h2>
                    <p className="mt-2 text-[var(--muted-foreground)]">Sign in to manage your schedule</p>
                </div>

                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-900 rounded-xl font-medium shadow-sm hover:bg-gray-50 transition-all border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="h-5 w-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Chrome className="h-5 w-5 text-blue-600" />
                    )}
                    <span>{loading ? "Connecting..." : "Continue with Google"}</span>
                </button>
            </div>
        </div>
    );
}
