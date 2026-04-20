import { create } from "zustand";

export type UserRole = "superadmin" | "agent";

export interface Credential {
  username: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  agentId?: string;
}

export interface AuthUser {
  username: string;
  displayName: string;
  role: UserRole;
  agentId?: string;
}

interface Session {
  user: AuthUser;
  loginAt: string;
}

const CREDENTIALS_KEY = "igh.auth.credentials.v2";
const SESSION_KEY = "igh.auth.session.v2";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode("igh-tour-salt-2024:" + password);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function loadCredentials(): Credential[] {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    return raw ? (JSON.parse(raw) as Credential[]) : [];
  } catch {
    return [];
  }
}

function saveCredentials(list: Credential[]) {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(list));
}

export async function seedDefaultAdmin() {
  const existing = loadCredentials();
  if (existing.length === 0) {
    const hash = await hashPassword("admin123");
    saveCredentials([
      {
        username: "admin",
        passwordHash: hash,
        displayName: "Admin IGH Tour",
        role: "superadmin",
      },
    ]);
  }
}

seedDefaultAdmin();

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  addAgent: (username: string, displayName: string, password: string) => Promise<void>;
  removeAgent: (username: string) => void;
  allCredentials: () => Credential[];
}

const savedSession = loadSession();

export const useAuthStore = create<AuthState>((set) => ({
  user: savedSession?.user ?? null,
  isAuthenticated: savedSession !== null,
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    await new Promise((r) => setTimeout(r, 600));

    try {
      const creds = loadCredentials();
      const hash = await hashPassword(password);
      const found = creds.find(
        (c) =>
          c.username.toLowerCase() === username.toLowerCase() &&
          c.passwordHash === hash
      );

      if (!found) {
        set({ isLoading: false, error: "Username atau password salah." });
        return false;
      }

      const session: Session = {
        user: {
          username: found.username,
          displayName: found.displayName,
          role: found.role,
          agentId: found.agentId,
        },
        loginAt: new Date().toISOString(),
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      set({ user: session.user, isAuthenticated: true, isLoading: false });
      return true;
    } catch {
      set({ isLoading: false, error: "Terjadi kesalahan. Coba lagi." });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    set({ user: null, isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),

  addAgent: async (username, displayName, password) => {
    const hash = await hashPassword(password);
    const creds = loadCredentials();
    if (creds.find((c) => c.username.toLowerCase() === username.toLowerCase())) {
      throw new Error("Username sudah digunakan.");
    }
    const agentId = `agent_${Date.now()}`;
    saveCredentials([...creds, { username, passwordHash: hash, displayName, role: "agent", agentId }]);
  },

  removeAgent: (username) => {
    const creds = loadCredentials().filter(
      (c) => c.username.toLowerCase() !== username.toLowerCase()
    );
    saveCredentials(creds);
  },

  allCredentials: () => loadCredentials(),
}));
