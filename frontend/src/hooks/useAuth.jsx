import { createContext, useContext, useEffect, useState } from "react";
import {
  clearSession,
  getStoredUser,
  getToken,
  saveSession,
} from "../services/api";
import { opsApi } from "../services/opsStore";
import { normalizeUser } from "../services/userNormalizer";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getToken());
  const [user, setUser] = useState(() => normalizeUser(getStoredUser()));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const applySession = (nextToken, nextUser) => {
    const normalized = normalizeUser(nextUser);
    saveSession(nextToken, normalized);
    setToken(nextToken);
    setUser(normalized);
    return {
      ok: true,
      data: { token: nextToken, user: normalized },
    };
  };

  const loginAdmin = async (password) => {
    const result = await opsApi.verifyAdminPassword(password);
    if (!result.ok) return result;
    return applySession(result.data.token, result.data.user);
  };

  const loginByPin = async ({ role, id, pin }) => {
    const result = await opsApi.loginByPin({ role, id, pin });
    if (!result.ok) return result;
    return applySession(result.data.token, result.data.user);
  };

  const logout = () => {
    clearSession();
    setToken("");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated: Boolean(token && user),
        loginAdmin,
        loginByPin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
