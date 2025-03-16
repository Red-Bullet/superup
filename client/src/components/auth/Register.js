import React, { useState, useContext } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Box, 
  Typography, 
  Link, 
  Alert, 
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import AuthContext from '../../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    roles: ['buyer'] // Default role
  });
  const [formErrors, setFormErrors] = useState({});
  const [sellerRole, setSellerRole] = useState(false);
  const [deliveryRole, setDeliveryRole] = useState(false);
  const { register, loading, error } = useContext(AuthContext);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    // Clear error when user types
    if (formErrors[e.target.name]) {
      setFormErrors({
        ...formErrors,
        [e.target.name]: ''
      });
    }
  };

  const handleRoleChange = (e) => {
    const { checked, name } = e.target;
    
    if (name === 'seller') {
      setSellerRole(checked);
    } else if (name === 'delivery') {
      setDeliveryRole(checked);
    }
    
    // Update roles array
    let updatedRoles = ['buyer']; // Always include buyer role
    
    if (name === 'seller' && checked) {
      updatedRoles.push('seller');
    } else if (sellerRole) {
      updatedRoles.push('seller');
    }
    
    if (name === 'delivery' && checked) {
      updatedRoles.push('delivery');
    } else if (deliveryRole) {
      updatedRoles.push('delivery');
    }
    
    setFormData({
      ...formData,
      roles: updatedRoles
    });
  };

  const validateForm = () => {
    const errors = {};
    const { name, email, password, confirmPassword, phone } = formData;
    
    if (!name) {
      errors.name = 'Name is required';
    }
    
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (!phone) {
      errors.phone = 'Phone number is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...registerData } = formData;
      await register(registerData);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Typography component="h1" variant="h5" align="center" gutterBottom>
        Create Account
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <TextField
        margin="normal"
        required
        fullWidth
        id="name"
        label="Full Name"
        name="name"
        autoComplete="name"
        autoFocus
        value={formData.name}
        onChange={handleChange}
        error={!!formErrors.name}
        helperText={formErrors.name}
      />
      
      <TextField
        margin="normal"
        required
        fullWidth
        id="email"
        label="Email Address"
        name="email"
        autoComplete="email"
        value={formData.email}
        onChange={handleChange}
        error={!!formErrors.email}
        helperText={formErrors.email}
      />
      
      <TextField
        margin="normal"
        required
        fullWidth
        name="password"
        label="Password"
        type="password"
        id="password"
        autoComplete="new-password"
        value={formData.password}
        onChange={handleChange}
        error={!!formErrors.password}
        helperText={formErrors.password}
      />
      
      <TextField
        margin="normal"
        required
        fullWidth
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        id="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleChange}
        error={!!formErrors.confirmPassword}
        helperText={formErrors.confirmPassword}
      />
      
      <TextField
        margin="normal"
        required
        fullWidth
        name="phone"
        label="Phone Number"
        id="phone"
        autoComplete="tel"
        value={formData.phone}
        onChange={handleChange}
        error={!!formErrors.phone}
        helperText={formErrors.phone}
      />
      
      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        I want to:
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', ml: 2 }}>
        <FormControlLabel
          control={
            <Checkbox 
              checked={sellerRole} 
              onChange={handleRoleChange} 
              name="seller" 
            />
          }
          label="Sell products on Super~Up"
        />
        
        <FormControlLabel
          control={
            <Checkbox 
              checked={deliveryRole} 
              onChange={handleRoleChange} 
              name="delivery" 
            />
          }
          label="Deliver orders as a delivery agent"
        />
      </Box>
      
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : 'Sign Up'}
      </Button>
      
      <Box sx={{ textAlign: 'center' }}>
        <Link component={RouterLink} to="/login" variant="body2">
          {"Already have an account? Sign In"}
        </Link>
      </Box>
    </Box>
  );
};

export default Register;