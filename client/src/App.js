import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CircularProgress, Box } from '@mui/material';

// Auth Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';

// Layout Components
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';

// Buyer Pages
import BuyerDashboard from './components/buyer/Dashboard';
import BuyerMarketplace from './components/buyer/Marketplace';
import BuyerOrders from './components/buyer/Orders';
import BuyerWallet from './components/buyer/Wallet';
import ProductDetail from './components/buyer/ProductDetail';
import Checkout from './components/buyer/Checkout';
import OrderTracking from './components/buyer/OrderTracking';

// Seller Pages
import SellerDashboard from './components/seller/Dashboard';
import SellerProducts from './components/seller/Products';
import SellerOrders from './components/seller/Orders';
import SellerWallet from './components/seller/Wallet';
import SellerSubscription from './components/seller/Subscription';

// Delivery Pages
import DeliveryDashboard from './components/delivery/Dashboard';
import DeliveryOrders from './components/delivery/Orders';
import DeliveryWallet from './components/delivery/Wallet';

// Admin Pages
import AdminDashboard from './components/admin/Dashboard';
import AdminUsers from './components/admin/Users';
import AdminProducts from './components/admin/Products';
import AdminOrders from './components/admin/Orders';
import AdminSubscriptions from './components/admin/Subscriptions';

// Shared Components
import Profile from './components/shared/Profile';
import NotFound from './components/shared/NotFound';

// Context
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Utils
import { getToken, getUser } from './utils/auth';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const App = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is authenticated
    const token = getToken();
    if (token) {
      const userData = getUser();
      setUser(userData);
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider value={{ isAuthenticated, user, setIsAuthenticated, setUser }}>
        <SocketProvider>
          <Router>
            <Routes>
              {/* Auth Routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
                <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <Register />} />
                <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/" /> : <ForgotPassword />} />
              </Route>

              {/* Protected Routes */}
              <Route element={<MainLayout />}>
                {/* Shared Routes */}
                <Route path="/" element={isAuthenticated ? 
                  (user?.roles.includes('admin') ? <Navigate to="/admin/dashboard" /> : 
                   user?.roles.includes('seller') ? <Navigate to="/seller/dashboard" /> :
                   user?.roles.includes('delivery') ? <Navigate to="/delivery/dashboard" /> :
                   <Navigate to="/buyer/dashboard" />) : 
                  <Navigate to="/login" />} 
                />
                <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} />

                {/* Buyer Routes */}
                <Route path="/buyer/dashboard" element={isAuthenticated ? <BuyerDashboard /> : <Navigate to="/login" />} />
                <Route path="/buyer/marketplace" element={isAuthenticated ? <BuyerMarketplace /> : <Navigate to="/login" />} />
                <Route path="/buyer/orders" element={isAuthenticated ? <BuyerOrders /> : <Navigate to="/login" />} />
                <Route path="/buyer/wallet" element={isAuthenticated ? <BuyerWallet /> : <Navigate to="/login" />} />
                <Route path="/buyer/product/:id" element={isAuthenticated ? <ProductDetail /> : <Navigate to="/login" />} />
                <Route path="/buyer/checkout" element={isAuthenticated ? <Checkout /> : <Navigate to="/login" />} />
                <Route path="/buyer/order/:id/tracking" element={isAuthenticated ? <OrderTracking /> : <Navigate to="/login" />} />

                {/* Seller Routes */}
                <Route path="/seller/dashboard" element={isAuthenticated && user?.roles.includes('seller') ? <SellerDashboard /> : <Navigate to="/login" />} />
                <Route path="/seller/products" element={isAuthenticated && user?.roles.includes('seller') ? <SellerProducts /> : <Navigate to="/login" />} />
                <Route path="/seller/orders" element={isAuthenticated && user?.roles.includes('seller') ? <SellerOrders /> : <Navigate to="/login" />} />
                <Route path="/seller/wallet" element={isAuthenticated && user?.roles.includes('seller') ? <SellerWallet /> : <Navigate to="/login" />} />
                <Route path="/seller/subscription" element={isAuthenticated && user?.roles.includes('seller') ? <SellerSubscription /> : <Navigate to="/login" />} />

                {/* Delivery Routes */}
                <Route path="/delivery/dashboard" element={isAuthenticated && user?.roles.includes('delivery') ? <DeliveryDashboard /> : <Navigate to="/login" />} />
                <Route path="/delivery/orders" element={isAuthenticated && user?.roles.includes('delivery') ? <DeliveryOrders /> : <Navigate to="/login" />} />
                <Route path="/delivery/wallet" element={isAuthenticated && user?.roles.includes('delivery') ? <DeliveryWallet /> : <Navigate to="/login" />} />

                {/* Admin Routes */}
                <Route path="/admin/dashboard" element={isAuthenticated && user?.roles.includes('admin') ? <AdminDashboard /> : <Navigate to="/login" />} />
                <Route path="/admin/users" element={isAuthenticated && user?.roles.includes('admin') ? <AdminUsers /> : <Navigate to="/login" />} />
                <Route path="/admin/products" element={isAuthenticated && user?.roles.includes('admin') ? <AdminProducts /> : <Navigate to="/login" />} />
                <Route path="/admin/orders" element={isAuthenticated && user?.roles.includes('admin') ? <AdminOrders /> : <Navigate to="/login" />} />
                <Route path="/admin/subscriptions" element={isAuthenticated && user?.roles.includes('admin') ? <AdminSubscriptions /> : <Navigate to="/login" />} />
              </Route>

              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;