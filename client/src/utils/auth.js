import jwt_decode from 'jwt-decode';

// Set token in localStorage
export const setToken = (token) => {
  localStorage.setItem('token', token);
  // Set auth header for axios
  if (token) {
    setAuthHeader(token);
  }
};

// Remove token from localStorage
export const removeToken = () => {
  localStorage.removeItem('token');
  // Remove auth header
  setAuthHeader(false);
};

// Get token from localStorage
export const getToken = () => {
  return localStorage.getItem('token');
};

// Set auth header for axios
export const setAuthHeader = (token) => {
  const axios = require('axios');
  if (token) {
    axios.defaults.headers.common['x-auth-token'] = token;
  } else {
    delete axios.defaults.headers.common['x-auth-token'];
  }
};

// Get user data from token
export const getUser = () => {
  const token = getToken();
  if (!token) return null;
  
  try {
    const decoded = jwt_decode(token);
    return decoded.user;
  } catch (err) {
    console.error('Error decoding token', err);
    removeToken();
    return null;
  }
};

// Check if token is expired
export const isTokenExpired = () => {
  const token = getToken();
  if (!token) return true;
  
  try {
    const decoded = jwt_decode(token);
    const currentTime = Date.now() / 1000;
    
    return decoded.exp < currentTime;
  } catch (err) {
    console.error('Error checking token expiration', err);
    return true;
  }
};

// Initialize auth header from localStorage
export const initAuthHeader = () => {
  const token = getToken();
  if (token) {
    setAuthHeader(token);
  }
};