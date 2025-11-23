let cachedUserId: string | null = null;

export function getUserId(): string {
  if (cachedUserId) return cachedUserId;

  if (typeof window === "undefined") {
    // SSR/edge safety: generate a stable placeholder per render
    cachedUserId = "server-user";
    return cachedUserId;
  }

  const existing = window.localStorage.getItem("naiya-user");
  if (existing) {
    cachedUserId = existing;
    return cachedUserId;
  }

  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem("naiya-user", id);
  cachedUserId = id;
  return id;
}
