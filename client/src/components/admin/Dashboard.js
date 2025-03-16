import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Divider
} from '@mui/material';
import {
  PeopleAlt as UsersIcon,
  Store as SellersIcon,
  Person as BuyersIcon,
  LocalShipping as DeliveryIcon,
  Inventory as ProductsIcon,
  Receipt as OrdersIcon,
  Subscriptions as SubscriptionsIcon
} from '@mui/icons-material';
import axios from 'axios';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const res = await axios.get('/api/admin/dashboard');
        setStats(res.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  // Prepare chart data
  const userRolesData = {
    labels: ['Buyers', 'Sellers', 'Delivery Agents'],
    datasets: [
      {
        data: [stats.users.buyers, stats.users.sellers, stats.users.delivery],
        backgroundColor: ['#4CAF50', '#2196F3', '#FF9800'],
        hoverBackgroundColor: ['#388E3C', '#1976D2', '#F57C00'],
      },
    ],
  };

  const orderStatusData = {
    labels: ['Pending', 'Processing', 'Delivered'],
    datasets: [
      {
        label: 'Orders by Status',
        data: [stats.orders.pending, stats.orders.processing, stats.orders.delivered],
        backgroundColor: ['#FFC107', '#03A9F4', '#4CAF50'],
      },
    ],
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} md={3}>
          <Paper elevation={3} sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <UsersIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
            <Box>
              <Typography variant="h6" component="div">
                Total Users
              </Typography>
              <Typography variant="h4" component="div">
                {stats.users.total}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Paper elevation={3} sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <ProductsIcon sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
            <Box>
              <Typography variant="h6" component="div">
                Products
              </Typography>
              <Typography variant="h4" component="div">
                {stats.products}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Paper elevation={3} sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <OrdersIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
            <Box>
              <Typography variant="h6" component="div">
                Orders
              </Typography>
              <Typography variant="h4" component="div">
                {stats.orders.total}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Paper elevation={3} sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <SubscriptionsIcon sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
            <Box>
              <Typography variant="h6" component="div">
                Active Subscriptions
              </Typography>
              <Typography variant="h4" component="div">
                {stats.subscriptions.active}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="User Distribution" />
            <Divider />
            <CardContent>
              <Box sx={{ height: 300, position: 'relative' }}>
                <Pie data={userRolesData} options={{ maintainAspectRatio: false }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Order Status" />
            <Divider />
            <CardContent>
              <Box sx={{ height: 300, position: 'relative' }}>
                <Bar 
                  data={orderStatusData} 
                  options={{ 
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true
                      }
                    }
                  }} 
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* User Stats */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="User Statistics" />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <BuyersIcon sx={{ fontSize: 40, color: '#4CAF50', mb: 1 }} />
                    <Typography variant="h6">Buyers</Typography>
                    <Typography variant="h4">{stats.users.buyers}</Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <SellersIcon sx={{ fontSize: 40, color: '#2196F3', mb: 1 }} />
                    <Typography variant="h6">Sellers</Typography>
                    <Typography variant="h4">{stats.users.sellers}</Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <DeliveryIcon sx={{ fontSize: 40, color: '#FF9800', mb: 1 }} />
                    <Typography variant="h6">Delivery Agents</Typography>
                    <Typography variant="h4">{stats.users.delivery}</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;