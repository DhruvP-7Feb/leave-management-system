import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getProfile, logout as apiLogout, refreshAccessToken } from '../api/auth.api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const setAuth = useCallback((tokenVal, userVal) => {
    window.__authToken = tokenVal;
    localStorage.setItem('access_token', tokenVal);
    setTokenState(tokenVal);
    setUser(userVal);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await apiLogout(refreshToken);
      } catch (err) {
        console.error('Logout API request failed:', err);
      }
    }
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('access_token');
    window.__authToken = null;
    setTokenState(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const handleAuthLogout = () => {
      logout();
    };
    window.addEventListener('auth:expired', handleAuthLogout);
    return () => {
      window.removeEventListener('auth:expired', handleAuthLogout);
    };
  }, [logout]);

  useEffect(() => {
    const rehydrate = async () => {
      let storedToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (!storedToken && refreshToken) {
        try {
          const data = await refreshAccessToken(refreshToken);
          storedToken = data.access;
          localStorage.setItem('access_token', storedToken);
        } catch (err) {
          storedToken = null;
        }
      }

      if (storedToken) {
        window.__authToken = storedToken;
        try {
          const profile = await getProfile();
          setUser(profile);
          setTokenState(storedToken);
        } catch (err) {
          logout();
        }
      } else {
        logout();
      }
      setIsLoading(false);
    };
    rehydrate();
  }, [logout]);

  const value = {
    user,
    token,
    isLoading,
    setAuth,
    logout,
    isAuthenticated: !!token && !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
