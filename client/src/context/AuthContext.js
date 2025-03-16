import React, { createContext, useState } from 'react';
import axios from 'axios';
import { setToken, removeToken } from '../utils/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children, value }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(value?.isAuthenticated || false);
  const [user, setUser] = useState(value?.user || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Register user
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post('/api/auth/register', userData);
      setToken(res.data.token);
      loadUser();
      setIsAuthenticated(true);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.response?.data?.msg || 'Registration failed');
      setLoading(false);
      return false;
    }
  };

  // Login user
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      setToken(res.data.token);
      loadUser();
      setIsAuthenticated(true);
      setLoading(false);
      return true;
    } catch (err) {
      setError(err.response?.data?.msg || 'Login failed');
      setLoading(false);
      return false;
    }
  };

  // Load user data
  const loadUser = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      setUser(res.data);
    } catch (err) {
      removeToken();
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  // Logout user
  const logout = () => {
    removeToken();
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        error,
        setIsAuthenticated,
        setUser,
        register,
        login,
        logout,
        loadUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;