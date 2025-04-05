import React, { useState, useContext, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Avatar, 
  Button, 
  TextField, 
  Grid, 
  Divider, 
  Tabs, 
  Tab, 
  CircularProgress, 
  Alert, 
  Snackbar 
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import AuthContext from '../../context/AuthContext';
import axios from 'axios';

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    }
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          country: user.address?.country || '',
          zipCode: user.address?.zipCode || ''
        }
      });
    }
  }, [user]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleEditToggle = () => {
    if (editing) {
      // Reset form data if canceling edit
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          country: user.address?.country || '',
          zipCode: user.address?.zipCode || ''
        }
      });
    }
    setEditing(!editing);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await axios.put('/api/users/profile', formData);
      setUser(res.data);
      setEditing(false);
      setSnackbar({
        open: true,
        message: 'Profile updated successfully',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.msg || 'Failed to update profile',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        My Profile
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar
            src={user.profileImage}
            alt={user.name}
            sx={{ width: 100, height: 100, mr: 3 }}
          >
            {!user.profileImage && <PersonIcon sx={{ fontSize: 60 }} />}
          </Avatar>
          
          <Box>
            <Typography variant="h5">{user.name}</Typography>
            <Typography variant="body1" color="text.secondary">
              {user.roles.map(role => role.charAt(0).toUpperCase() + role.slice(1)).join(', ')}
            </Typography>
            <Typography variant="body2">
              Member since {new Date(user.createdAt).toLocaleDateString()}
            </Typography>
          </Box>
          
          <Box sx={{ ml: 'auto' }}>
            <Button
              variant={editing ? "outlined" : "contained"}
              color={editing ? "error" : "primary"}
              startIcon={editing ? <CancelIcon /> : <EditIcon />}
              onClick={handleEditToggle}
            >
              {editing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </Box>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Personal Information" />
          <Tab label="Address" />
          {user.roles.includes('seller') && <Tab label="Seller Information" />}
          {user.roles.includes('delivery') && <Tab label="Delivery Information" />}
        </Tabs>
        
        <Box component="form" onSubmit={handleSubmit}>
          {/* Personal Information Tab */}
          {tabValue === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={!editing}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!editing}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!editing}
                  required
                />
              </Grid>
            </Grid>
          )}
          
          {/* Address Tab */}
          {tabValue === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleInputChange}
                  disabled={!editing}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="City"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleInputChange}
                  disabled={!editing}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="State/Province"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleInputChange}
                  disabled={!editing}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Country"
                  name="address.country"
                  value={formData.address.country}
                  onChange={handleInputChange}
                  disabled={!editing}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Zip/Postal Code"
                  name="address.zipCode"
                  value={formData.address.zipCode}
                  onChange={handleInputChange}
                  disabled={!editing}
                />
              </Grid>
            </Grid>
          )}
          
          {/* Seller Information Tab */}
          {tabValue === 2 && user.roles.includes('seller') && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Business Name"
                  name="sellerInfo.businessName"
                  value={user.sellerInfo?.businessName || ''}
                  disabled
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Business Description"
                  name="sellerInfo.businessDescription"
                  value={user.sellerInfo?.businessDescription || ''}
                  disabled
                  multiline
                  rows={3}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Subscription Status"
                  value={user.sellerInfo?.subscriptionStatus || 'None'}
                  disabled
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Subscription Type"
                  value={user.sellerInfo?.subscriptionType || 'None'}
                  disabled
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Rating"
                  value={user.sellerInfo?.rating || '0'}
                  disabled
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Total Reviews"
                  value={user.sellerInfo?.totalReviews || '0'}
                  disabled
                />
              </Grid>
            </Grid>
          )}
          
          {/* Delivery Information Tab */}
          {tabValue === 3 && user.roles.includes('delivery') && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Vehicle Type"
                  value={user.deliveryInfo?.vehicleType || 'Not specified'}
                  disabled
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Vehicle Plate"
                  value={user.deliveryInfo?.vehiclePlate || 'Not specified'}
                  disabled
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Availability Status"
                  value={user.deliveryInfo?.isAvailable ? 'Available' : 'Not Available'}
                  disabled
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Rating"
                  value={user.deliveryInfo?.rating || '0'}
                  disabled
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Total Deliveries"
                  value={user.deliveryInfo?.totalDeliveries || '0'}
                  disabled
                />
              </Grid>
            </Grid>
          )}
          
          {editing && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Save Changes'}
              </Button>
            </Box>
          )}
        </Box>
      </Paper>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Profile;