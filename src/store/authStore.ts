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

export interface SecuritySettings {
  twoFactor: boolean;
  loginAlert: boolean;
  pinHash?: string;
}

export interface LoginEvent {
  at: string;
}

const CREDENTIALS_KEY = "igh.auth.credentials.v2";
const SESSION_KEY = "igh.auth.session.v2";

const securityKey = (username: string) => `igh.auth.security.${username}`;
const loginsKey = (username: string) => `igh.auth.logins.${username}`;

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode("igh-tour-salt-2024:" + password);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode("igh-tour-pin-salt-2024:" + pin);
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

function loadSecuritySettings(username: string): SecuritySettings {
  try {
    const raw = localStorage.getItem(securityKey(username));
    return raw ? (JSON.parse(raw) as SecuritySettings) : { twoFactor: false, loginAlert: false };
  } catch {
    return { twoFactor: false, loginAlert: false };
  }
}

function saveSecuritySettingsRaw(username: string, settings: SecuritySettings) {
  localStorage.setItem(securityKey(username), JSON.stringify(settings));
}

function loadLoginHistory(username: string): LoginEvent[] {
  try {
    const raw = localStorage.getItem(loginsKey(username));
    return raw ? (JSON.parse(raw) as LoginEvent[]) : [];
  } catch {
    return [];
  }
}

function recordLoginEvent(username: string) {
  const history = loadLoginHistory(username);
  const updated = [{ at: new Date().toISOString() }, ...history].slice(0, 10);
  localStorage.setItem(loginsKey(username), JSON.stringify(updated));
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
  pendingLoginUser: AuthUser | null;
  newLoginAt: string | null;
  login: (username: string, password: string) => Promise<"ok" | "needs_pin" | false>;
  completePinLogin: (pin: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  addAgent: (username: string, displayName: string, password: string) => Promise<void>;
  removeAgent: (username: string) => void;
  allCredentials: () => Credential[];
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  getSecuritySettings: () => SecuritySettings;
  updateSecuritySettings: (partial: Partial<SecuritySettings>) => void;
  setupPin: (pin: string) => Promise<void>;
  getLoginHistory: () => LoginEvent[];
  clearNewLogin: () => void;
}

const savedSession = loadSession();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: savedSession?.user ?? null,
  isAuthenticated: savedSession !== null,
  isLoading: false,
  error: null,
  pendingLoginUser: null,
  newLoginAt: null,

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

      const authUser: AuthUser = {
        username: found.username,
        displayName: found.displayName,
        role: found.role,
        agentId: found.agentId,
      };

      const secSettings = loadSecuritySettings(found.username);

      if (secSettings.twoFactor && secSettings.pinHash) {
        set({ isLoading: false, pendingLoginUser: authUser });
        return "needs_pin";
      }

      const previousLogins = loadLoginHistory(found.username);
      recordLoginEvent(found.username);

      const session: Session = {
        user: authUser,
        loginAt: new Date().toISOString(),
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      const newLoginAt = secSettings.loginAlert && previousLogins.length > 0
        ? previousLogins[0].at
        : null;

      set({ user: authUser, isAuthenticated: true, isLoading: false, newLoginAt });
      return "ok";
    } catch {
      set({ isLoading: false, error: "Terjadi kesalahan. Coba lagi." });
      return false;
    }
  },

  completePinLogin: async (pin) => {
    const { pendingLoginUser } = get();
    if (!pendingLoginUser) return false;

    set({ isLoading: true, error: null });
    try {
      const secSettings = loadSecuritySettings(pendingLoginUser.username);
      const pinHash = await hashPin(pin);

      if (pinHash !== secSettings.pinHash) {
        set({ isLoading: false, error: "PIN salah. Coba lagi." });
        return false;
      }

      const previousLogins = loadLoginHistory(pendingLoginUser.username);
      recordLoginEvent(pendingLoginUser.username);

      const session: Session = {
        user: pendingLoginUser,
        loginAt: new Date().toISOString(),
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      const newLoginAt = secSettings.loginAlert && previousLogins.length > 0
        ? previousLogins[0].at
        : null;

      set({
        user: pendingLoginUser,
        isAuthenticated: true,
        isLoading: false,
        pendingLoginUser: null,
        newLoginAt,
      });
      return true;
    } catch {
      set({ isLoading: false, error: "Terjadi kesalahan. Coba lagi." });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    set({ user: null, isAuthenticated: false, error: null, pendingLoginUser: null, newLoginAt: null });
  },

  clearError: () => set({ error: null }),

  clearNewLogin: () => set({ newLoginAt: null }),

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

  changePassword: async (currentPassword, newPassword) => {
    const { user } = get();
    if (!user) throw new Error("Tidak ada pengguna yang login.");

    const creds = loadCredentials();
    const currentHash = await hashPassword(currentPassword);
    const found = creds.find(
      (c) =>
        c.username.toLowerCase() === user.username.toLowerCase() &&
        c.passwordHash === currentHash
    );

    if (!found) throw new Error("Kata sandi saat ini tidak sesuai.");
    if (newPassword.length < 6) throw new Error("Kata sandi baru minimal 6 karakter.");

    const newHash = await hashPassword(newPassword);
    const updated = creds.map((c) =>
      c.username.toLowerCase() === user.username.toLowerCase()
        ? { ...c, passwordHash: newHash }
        : c
    );
    saveCredentials(updated);
  },

  getSecuritySettings: () => {
    const { user } = get();
    if (!user) return { twoFactor: false, loginAlert: false };
    return loadSecuritySettings(user.username);
  },

  updateSecuritySettings: (partial) => {
    const { user } = get();
    if (!user) return;
    const current = loadSecuritySettings(user.username);
    saveSecuritySettingsRaw(user.username, { ...current, ...partial });
  },

  setupPin: async (pin) => {
    const { user } = get();
    if (!user) throw new Error("Tidak ada pengguna yang login.");
    const pinHash = await hashPin(pin);
    const current = loadSecuritySettings(user.username);
    saveSecuritySettingsRaw(user.username, { ...current, pinHash });
  },

  getLoginHistory: () => {
    const { user } = get();
    if (!user) return [];
    return loadLoginHistory(user.username);
  },
}));
