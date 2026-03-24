import { createContext, useContext, useEffect } from 'react';
import axios from 'axios';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { getToken, signOut, isLoaded: isAuthLoaded } = useClerkAuth();
  const { user, isLoaded: isUserLoaded } = useUser();

  // Set up an Axios interceptor to securely fetch the Clerk token before every request
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(async (config) => {
      try {
        const token = await getToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (err) {
        console.error('Failed to get Clerk token for request:', err);
      }
      return config;
    }, (error) => Promise.reject(error));

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
    };
  }, [getToken]);

  const loading = !isAuthLoaded || !isUserLoaded;

  // We map Clerk's properties to the shape the app expects
  const contextValue = {
    user: user ? {
      id: user.id,
      name: user.fullName || user.firstName || 'User',
      email: user.primaryEmailAddress?.emailAddress,
      // The backend will handle mapping this user to their organization
    } : null,
    logout: signOut,
    loading
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
