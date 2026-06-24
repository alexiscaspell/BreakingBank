import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { router } from "expo-router";
import { api, clearTokens, setTokens } from "../api/client";
import { onUserLogin } from "../data";

type User = { id: string; email: string; username: string };

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async (): Promise<User | null> => {
    try {
      const me = await api<User>("/auth/me");
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const tokens = await api<{ access_token: string; refresh_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await setTokens(tokens.access_token, tokens.refresh_token);
    await onUserLogin();
    const me = await refreshUser();
    if (!me) throw new Error("Sesión iniciada pero no se pudo cargar el usuario");
  };

  const loginWithGoogle = async (idToken: string) => {
    const tokens = await api<{ access_token: string; refresh_token: string }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    });
    await setTokens(tokens.access_token, tokens.refresh_token);
    await onUserLogin();
    const me = await refreshUser();
    if (!me) throw new Error("Sesión iniciada pero no se pudo cargar el usuario");
  };

  const register = async (email: string, username: string, password: string) => {
    const tokens = await api<{ access_token: string; refresh_token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, username, password }),
    });
    await setTokens(tokens.access_token, tokens.refresh_token);
    await onUserLogin();
    const me = await refreshUser();
    if (!me) throw new Error("Cuenta creada pero no se pudo cargar el usuario");
  };

  const logout = async () => {
    await clearTokens();
    setUser(null);
    router.replace("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
