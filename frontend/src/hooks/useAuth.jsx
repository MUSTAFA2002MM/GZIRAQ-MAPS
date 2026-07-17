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

  const loginByPin = async ({ role, id, pin, location }) => {
    const result = await opsApi.loginByPin({ role, id, pin, location });
    if (!result.ok) return result;

    // Start live sharing immediately for delivery agents on successful login.
    if (role === "delivery" && location) {
      try {
        await opsApi.updateAgentLocation({
          agentId: result.data.user.id,
          agentName: result.data.user.name,
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
        });
      } catch {
        /* login still proceeds; delivery panel will keep retrying */
      }
    }

    return applySession(result.data.token, result.data.user);
  };

  const logout = () => {
    clearSession();
    setToken("");
    setUser(null);
  };

  const updateUser = (patch) => {
    if (!user) return null;
    const next = normalizeUser({ ...user, ...patch });
    if (token) saveSession(token, next);
    setUser(next);
    return next;
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
        updateUser,
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
