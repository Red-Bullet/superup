import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Box, 
  Typography, 
  Link, 
  Alert, 
  CircularProgress 
} from '@mui/material';
import axios from 'axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setEmail(e.target.value);
    setEmailError('');
  };

  const validateForm = () => {
    let isValid = true;
    
    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Email is invalid');
      isValid = false;
    }
    
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setLoading(true);
      setError('');
      
      try {
        await axios.post('/api/auth/forgot-password', { email });
        setSuccess(true);
      } catch (err) {
        setError(err.response?.data?.msg || 'Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Typography component="h1" variant="h5" align="center" gutterBottom>
        Forgot Password
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          Password reset instructions have been sent to your email.
        </Alert>
      ) : (
        <>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Enter your email address and we'll send you instructions to reset your password.
          </Typography>
          
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={handleChange}
            error={!!emailError}
            helperText={emailError}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Send Reset Link'}
          </Button>
        </>
      )}
      
      <Box sx={{ textAlign: 'center' }}>
        <Link component={RouterLink} to="/login" variant="body2">
          Back to Sign In
        </Link>
      </Box>
    </Box>
  );
};

export default ForgotPassword;