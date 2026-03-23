import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = 'http://localhost:8000';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem('jwt_token'));
  const [loading, setLoading] = useState(true);

  // Attach/remove the Authorization header globally on token change
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('jwt_token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('jwt_token');
    }
  }, [token]);

  // On mount, re-validate stored token to hydrate user state
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    axios.get(`${API_URL}/auth/me`)
      .then(r => setUser(r.data))
      .catch(() => { setToken(null); setUser(null); })
      .finally(() => setLoading(false));
  }, []);  // eslint-disable-line

  const login = useCallback(async (email, password) => {
    const { data } = await axios.post(`${API_URL}/auth/login`, { email, password });
    setToken(data.access_token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await axios.post(`${API_URL}/auth/register`, payload);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
