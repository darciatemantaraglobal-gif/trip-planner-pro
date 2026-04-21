import { create } from "zustand";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";

// ── Local-only security settings (PIN/2FA + login history) ──────────────────

export interface SecuritySettings {
  twoFactor: boolean;
  loginAlert: boolean;
  pinHash?: string;
}
export interface LoginEvent { at: string; }

const securityKey = (uid: string) => `igh.auth.security.${uid}`;
const loginsKey = (uid: string) => `igh.auth.logins.${uid}`;

async function sha(salt: string, val: string): Promise<string> {
  const data = new TextEncoder().encode(salt + ":" + val);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const hashPin = (pin: string) => sha("igh-tour-pin-salt-2024", pin);

function loadSecuritySettings(uid: string): SecuritySettings {
  try { const raw = localStorage.getItem(securityKey(uid));
    return raw ? JSON.parse(raw) : { twoFactor: false, loginAlert: false };
  } catch { return { twoFactor: false, loginAlert: false }; }
}
function saveSecuritySettings(uid: string, s: SecuritySettings) {
  localStorage.setItem(securityKey(uid), JSON.stringify(s));
}
function loadLoginHistory(uid: string): LoginEvent[] {
  try { const raw = localStorage.getItem(loginsKey(uid));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function recordLoginEvent(uid: string) {
  const updated = [{ at: new Date().toISOString() }, ...loadLoginHistory(uid)].slice(0, 10);
  localStorage.setItem(loginsKey(uid), JSON.stringify(updated));
}

// ── Auth types ──────────────────────────────────────────────────────────────

export type UserRole = "owner" | "staff";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  agencyId: string;
  agencyName: string;
}

export interface MemberInfo {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  pendingLoginUser: AuthUser | null;
  newLoginAt: string | null;
  needsBootstrap: boolean; // session ada tapi belum punya agency

  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<"ok" | "needs_pin" | false>;
  completePinLogin: (pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  clearNewLogin: () => void;

  // Tenant management (owner only)
  inviteMember: (email: string, password: string, displayName: string, role?: UserRole) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  listMembers: () => Promise<MemberInfo[]>;

  // Self
  changePassword: (newPassword: string) => Promise<void>;
  getSecuritySettings: () => SecuritySettings;
  updateSecuritySettings: (partial: Partial<SecuritySettings>) => void;
  setupPin: (pin: string) => Promise<void>;
  getLoginHistory: () => LoginEvent[];
}

async function loadCurrentUser(): Promise<AuthUser | null> {
  if (!supabase) return null;
  const { data: sess } = await supabase.auth.getSession();
  const session = sess.session;
  if (!session) return null;

  const { data: membership } = await supabase
    .from("agency_members").select("agency_id, role").eq("user_id", session.user.id).maybeSingle();
  if (!membership) return null;

  const { data: agency } = await supabase
    .from("agencies").select("id, name").eq("id", membership.agency_id).maybeSingle();

  const meta = (session.user.user_metadata ?? {}) as { display_name?: string };
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    displayName: meta.display_name ?? session.user.email?.split("@")[0] ?? "User",
    role: (membership.role as UserRole) ?? "staff",
    agencyId: membership.agency_id,
    agencyName: agency?.name ?? "Agency",
  };
}

async function callEdgeFunction(name: string, body: unknown, accessToken?: string): Promise<unknown> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase not configured");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST", headers, body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Function ${name} failed (${res.status})`);
  return json;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,
  pendingLoginUser: null,
  newLoginAt: null,
  needsBootstrap: false,

  init: async () => {
    if (!supabase) { set({ isInitialized: true }); return; }
    const user = await loadCurrentUser();
    if (user) {
      set({ user, isAuthenticated: true, needsBootstrap: false, isInitialized: true });
    } else {
      const { data: sess } = await supabase.auth.getSession();
      set({
        user: null,
        isAuthenticated: false,
        needsBootstrap: !!sess.session, // logged in tapi belum di agency
        isInitialized: true,
      });
    }
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        set({ user: null, isAuthenticated: false, needsBootstrap: false });
        return;
      }
      const u = await loadCurrentUser();
      if (u) set({ user: u, isAuthenticated: true, needsBootstrap: false });
      else set({ user: null, isAuthenticated: false, needsBootstrap: true });
    });
  },

  login: async (email, password) => {
    if (!supabase) { set({ error: "Supabase belum dikonfigurasi" }); return false; }
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      set({ isLoading: false, error: error?.message ?? "Email/password salah." });
      return false;
    }
    const user = await loadCurrentUser();
    if (!user) {
      set({ isLoading: false, needsBootstrap: true, isAuthenticated: false, user: null });
      return "ok";
    }
    const sec = loadSecuritySettings(user.id);
    if (sec.twoFactor && sec.pinHash) {
      set({ isLoading: false, pendingLoginUser: user });
      return "needs_pin";
    }
    const previous = loadLoginHistory(user.id);
    recordLoginEvent(user.id);
    const newLoginAt = sec.loginAlert && previous.length > 0 ? previous[0].at : null;
    set({ user, isAuthenticated: true, isLoading: false, newLoginAt, needsBootstrap: false });
    return "ok";
  },

  completePinLogin: async (pin) => {
    const { pendingLoginUser } = get();
    if (!pendingLoginUser) return false;
    set({ isLoading: true, error: null });
    const sec = loadSecuritySettings(pendingLoginUser.id);
    const pinHash = await hashPin(pin);
    if (pinHash !== sec.pinHash) {
      set({ isLoading: false, error: "PIN salah." });
      return false;
    }
    const previous = loadLoginHistory(pendingLoginUser.id);
    recordLoginEvent(pendingLoginUser.id);
    const newLoginAt = sec.loginAlert && previous.length > 0 ? previous[0].at : null;
    set({
      user: pendingLoginUser, isAuthenticated: true,
      isLoading: false, pendingLoginUser: null, newLoginAt, needsBootstrap: false,
    });
    return true;
  },

  logout: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false, error: null, pendingLoginUser: null, newLoginAt: null, needsBootstrap: false });
  },

  clearError: () => set({ error: null }),
  clearNewLogin: () => set({ newLoginAt: null }),

  inviteMember: async (email, password, displayName, role = "staff") => {
    const { user } = get();
    if (!user || user.role !== "owner") throw new Error("Hanya owner yang bisa invite.");
    const { data: sess } = await supabase!.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) throw new Error("Session tidak valid.");
    await callEdgeFunction("invite-member", { email, password, displayName, role }, token);
  },

  removeMember: async (userId) => {
    const { user } = get();
    if (!user || user.role !== "owner") throw new Error("Hanya owner yang bisa hapus.");
    const { data: sess } = await supabase!.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) throw new Error("Session tidak valid.");
    await callEdgeFunction("remove-member", { userId }, token);
  },

  listMembers: async () => {
    const { user } = get();
    if (!user || !supabase) return [];
    const { data: members, error } = await supabase
      .from("agency_members").select("user_id, role, created_at")
      .eq("agency_id", user.agencyId);
    if (error) throw error;
    // Email & displayName ga bisa diambil dari client (auth.users perlu service role).
    // Sementara return apa yg ada.
    return (members ?? []).map((m) => ({
      userId: m.user_id,
      email: m.user_id === user.id ? user.email : "—",
      displayName: m.user_id === user.id ? user.displayName : `User ${m.user_id.slice(0, 8)}`,
      role: m.role as UserRole,
      createdAt: m.created_at,
    }));
  },

  changePassword: async (newPassword) => {
    if (!supabase) throw new Error("Supabase belum dikonfigurasi");
    if (newPassword.length < 8) throw new Error("Password minimal 8 karakter.");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  getSecuritySettings: () => {
    const { user } = get();
    if (!user) return { twoFactor: false, loginAlert: false };
    return loadSecuritySettings(user.id);
  },

  updateSecuritySettings: (partial) => {
    const { user } = get();
    if (!user) return;
    saveSecuritySettings(user.id, { ...loadSecuritySettings(user.id), ...partial });
  },

  setupPin: async (pin) => {
    const { user } = get();
    if (!user) throw new Error("Tidak ada pengguna yang login.");
    const pinHash = await hashPin(pin);
    saveSecuritySettings(user.id, { ...loadSecuritySettings(user.id), pinHash });
  },

  getLoginHistory: () => {
    const { user } = get();
    if (!user) return [];
    return loadLoginHistory(user.id);
  },
}));

// Helper buat dipanggil di repo layer
export function getCurrentAgencyId(): string | null {
  return useAuthStore.getState().user?.agencyId ?? null;
}

export function requireAgencyId(): string {
  const id = getCurrentAgencyId();
  if (!id) throw new Error("Tidak ada agency aktif. Silakan login ulang.");
  return id;
}

// Bootstrap helper (dipanggil dari Auth/Bootstrap page)
export async function bootstrapFirstOwner(input: {
  email: string; password: string; agencyName: string; displayName?: string;
}): Promise<void> {
  await callEdgeFunction("bootstrap", input);
}
