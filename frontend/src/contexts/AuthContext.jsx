import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth, getStoredToken, setStoredToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Bootstrap: if a token is in storage, try to resolve the user.
  useEffect(() => {
    let cancelled = false;
    const token = getStoredToken();
    if (!token) {
      setBootstrapping(false);
      return;
    }

    (async () => {
      try {
        const { user: me } = await auth.me();
        if (!cancelled) setUser(me);
      } catch (error) {
        if (!cancelled) {
          console.warn('[auth] stored token rejected:', error.message);
          setStoredToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const { user: u, token } = await auth.login({ email, password });
    setStoredToken(token);
    setUser(u);
    return u;
  }, []);

  const signup = useCallback(async ({ email, password, name }) => {
    const { user: u, token } = await auth.signup({ email, password, name });
    setStoredToken(token);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      bootstrapping,
      login,
      signup,
      logout,
    }),
    [user, bootstrapping, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
