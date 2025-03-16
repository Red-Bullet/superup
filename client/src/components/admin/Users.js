import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as VerifyIcon,
  Close as UnverifyIcon
} from '@mui/icons-material';
import axios from 'axios';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    roles: [],
    isVerified: false
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/users');
      setUsers(res.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load users');
      setLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      roles: user.roles,
      isVerified: user.isVerified
    });
    setOpenEditDialog(true);
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setOpenDeleteDialog(true);
  };

  const handleVerifyUser = async (userId, verify) => {
    try {
      await axios.put(`/api/admin/users/${userId}`, { isVerified: verify });
      
      // Update user in the list
      setUsers(users.map(user => 
        user._id === userId ? { ...user, isVerified: verify } : user
      ));
      
      setSnackbar({
        open: true,
        message: `User ${verify ? 'verified' : 'unverified'} successfully`,
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Failed to ${verify ? 'verify' : 'unverify'} user`,
        severity: 'error'
      });
    }
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setSelectedUser(null);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedUser(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleRolesChange = (e) => {
    setFormData({
      ...formData,
      roles: e.target.value
    });
  };

  const handleUpdateUser = async () => {
    try {
      await axios.put(`/api/admin/users/${selectedUser._id}`, formData);
      
      // Update user in the list
      setUsers(users.map(user => 
        user._id === selectedUser._id ? { ...user, ...formData } : user
      ));
      
      setSnackbar({
        open: true,
        message: 'User updated successfully',
        severity: 'success'
      });
      
      handleCloseEditDialog();
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to update user',
        severity: 'error'
      });
    }
  };

  const handleDeleteUser = async () => {
    try {
      await axios.delete(`/api/admin/users/${selectedUser._id}`);
      
      // Remove user from the list
      setUsers(users.filter(user => user._id !== selectedUser._id));
      
      setSnackbar({
        open: true,
        message: 'User deleted successfully',
        severity: 'success'
      });
      
      handleCloseDeleteDialog();
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to delete user',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  const columns = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    { field: 'phone', headerName: 'Phone', flex: 1 },
    { 
      field: 'roles', 
      headerName: 'Roles', 
      flex: 1,
      renderCell: (params) => (
        <Box>
          {params.value.map((role) => (
            <Chip 
              key={role} 
              label={role.charAt(0).toUpperCase() + role.slice(1)} 
              size="small" 
              sx={{ mr: 0.5 }} 
            />
          ))}
        </Box>
      )
    },
    { 
      field: 'isVerified', 
      headerName: 'Verified', 
      width: 120,
      renderCell: (params) => (
        params.value ? 
          <Chip label="Verified" color="success" size="small" /> : 
          <Chip label="Unverified" color="default" size="small" />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      renderCell: (params) => (
        <Box>
          <IconButton 
            color="primary" 
            onClick={() => handleEditClick(params.row)}
            size="small"
          >
            <EditIcon />
          </IconButton>
          
          <IconButton 
            color="error" 
            onClick={() => handleDeleteClick(params.row)}
            size="small"
          >
            <DeleteIcon />
          </IconButton>
          
          {params.row.isVerified ? (
            <IconButton 
              color="default" 
              onClick={() => handleVerifyUser(params.row._id, false)}
              size="small"
              title="Unverify User"
            >
              <UnverifyIcon />
            </IconButton>
          ) : (
            <IconButton 
              color="success" 
              onClick={() => handleVerifyUser(params.row._id, true)}
              size="small"
              title="Verify User"
            >
              <VerifyIcon />
            </IconButton>
          )}
        </Box>
      )
    }
  ];

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
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>
      
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={users.map(user => ({ ...user, id: user._id }))}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            checkboxSelection
            disableSelectionOnClick
          />
        </Box>
      </Paper>
      
      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            name="name"
            label="Name"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleInputChange}
          />
          
          <TextField
            margin="dense"
            name="email"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={formData.email}
            onChange={handleInputChange}
          />
          
          <TextField
            margin="dense"
            name="phone"
            label="Phone"
            fullWidth
            variant="outlined"
            value={formData.phone}
            onChange={handleInputChange}
          />
          
          <FormControl fullWidth margin="dense">
            <InputLabel>Roles</InputLabel>
            <Select
              multiple
              name="roles"
              value={formData.roles}
              onChange={handleRolesChange}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              <MenuItem value="buyer">Buyer</MenuItem>
              <MenuItem value="seller">Seller</MenuItem>
              <MenuItem value="delivery">Delivery</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="customer_service">Customer Service</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl fullWidth margin="dense">
            <InputLabel>Verification Status</InputLabel>
            <Select
              name="isVerified"
              value={formData.isVerified}
              onChange={handleInputChange}
            >
              <MenuItem value={true}>Verified</MenuItem>
              <MenuItem value={false}>Unverified</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button onClick={handleUpdateUser} variant="contained">Update</Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete User Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedUser?.name}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
      
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

export default AdminUsers;