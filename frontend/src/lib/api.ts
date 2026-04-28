import type { ApiResponse } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function apiGet<T = unknown>(path: string): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}/api${path}`, { headers: getHeaders() });
  return res.json();
}

export async function apiPost<T = unknown>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function apiPut<T = unknown>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function apiDelete<T = unknown>(path: string): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return res.json();
}

export async function apiUpload<T = unknown>(path: string, file: File, params?: Record<string, string>): Promise<ApiResponse<T>> {
  const formData = new FormData();
  formData.append("file", file);
  const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api${path}${queryString}`, {
    method: "POST",
    headers,
    body: formData,
  });
  return res.json();
}

// --- Auth helpers ---
export function setAuthToken(token: string) {
  localStorage.setItem("auth_token", token);
}

export function clearAuthToken() {
  localStorage.removeItem("auth_token");
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

// --- SSE connection for notifications with auto-reconnect ---
export function connectSSE(onEvent: (event: any) => void): () => void {
  if (typeof window === "undefined") return () => {};
  
  let es: EventSource | null = null;
  let retryTimeout: NodeJS.Timeout | null = null;

  const connect = () => {
    if (es) es.close();
    
    es = new EventSource(`${API_BASE}/api/events`);
    
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent(data);
      } catch (err) {
        console.error("Failed to parse SSE data", err);
      }
    };

    es.onerror = () => {
      console.warn("SSE connection lost. Retrying in 3s...");
      if (es) es.close();
      es = null;
      // Exponential backoff or simple retry
      retryTimeout = setTimeout(connect, 3000);
    };
  };

  connect();

  return () => {
    if (es) es.close();
    if (retryTimeout) clearTimeout(retryTimeout);
  };
}
