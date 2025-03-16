import React, { useState, useContext } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { 
  AppBar, 
  Box, 
  CssBaseline, 
  Divider, 
  Drawer, 
  IconButton, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  Typography, 
  Avatar, 
  Menu, 
  MenuItem, 
  Badge 
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  ShoppingCart as ShoppingCartIcon,
  Store as StoreIcon,
  AccountBalanceWallet as WalletIcon,
  LocalShipping as DeliveryIcon,
  People as UsersIcon,
  Inventory as ProductsIcon,
  Receipt as OrdersIcon,
  Subscriptions as SubscriptionIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import AuthContext from '../../context/AuthContext';

const drawerWidth = 240;

const MainLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigate = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  // Generate navigation items based on user roles
  const getNavigationItems = () => {
    const items = [];

    // Buyer navigation
    if (user?.roles.includes('buyer')) {
      items.push(
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/buyer/dashboard' },
        { text: 'Marketplace', icon: <ShoppingCartIcon />, path: '/buyer/marketplace' },
        { text: 'My Orders', icon: <OrdersIcon />, path: '/buyer/orders' },
        { text: 'My Wallet', icon: <WalletIcon />, path: '/buyer/wallet' }
      );
    }

    // Seller navigation
    if (user?.roles.includes('seller')) {
      items.push(
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/seller/dashboard' },
        { text: 'My Products', icon: <ProductsIcon />, path: '/seller/products' },
        { text: 'Orders', icon: <OrdersIcon />, path: '/seller/orders' },
        { text: 'My Wallet', icon: <WalletIcon />, path: '/seller/wallet' },
        { text: 'Subscription', icon: <SubscriptionIcon />, path: '/seller/subscription' }
      );
    }

    // Delivery navigation
    if (user?.roles.includes('delivery')) {
      items.push(
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/delivery/dashboard' },
        { text: 'Deliveries', icon: <DeliveryIcon />, path: '/delivery/orders' },
        { text: 'My Wallet', icon: <WalletIcon />, path: '/delivery/wallet' }
      );
    }

    // Admin navigation
    if (user?.roles.includes('admin')) {
      items.push(
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
        { text: 'Users', icon: <UsersIcon />, path: '/admin/users' },
        { text: 'Products', icon: <ProductsIcon />, path: '/admin/products' },
        { text: 'Orders', icon: <OrdersIcon />, path: '/admin/orders' },
        { text: 'Subscriptions', icon: <SubscriptionIcon />, path: '/admin/subscriptions' }
      );
    }

    return items;
  };

  const navigationItems = getNavigationItems();

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Super~Up
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton onClick={() => handleNavigate(item.path)}>
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {user?.roles.includes('admin') ? 'Admin Panel' : 
             user?.roles.includes('seller') ? 'Seller Dashboard' :
             user?.roles.includes('delivery') ? 'Delivery Dashboard' :
             'Marketplace'}
          </Typography>
          <IconButton color="inherit">
            <Badge badgeContent={4} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <Avatar alt={user?.name} src={user?.profileImage} sx={{ width: 32, height: 32 }} />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/profile'); }}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;