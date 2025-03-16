const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const Product = require('../models/product.model');
const Order = require('../models/order.model');
const Subscription = require('../models/subscription.model');
const { auth, checkRole } = require('../middleware/auth.middleware');

// Middleware to ensure user is an admin
const adminAuth = [auth, checkRole(['admin'])];

// @route   GET api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private/Admin
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    // Get counts for dashboard statistics
    const userCount = await User.countDocuments();
    const sellerCount = await User.countDocuments({ roles: 'seller' });
    const buyerCount = await User.countDocuments({ roles: 'buyer' });
    const deliveryCount = await User.countDocuments({ roles: 'delivery' });
    
    const productCount = await Product.countDocuments();
    const orderCount = await Order.countDocuments();
    
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const processingOrders = await Order.countDocuments({ status: 'processing' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
    
    // Get subscription statistics
    const subscriptions = await Subscription.countDocuments();
    const activeSubscriptions = await User.countDocuments({ 
      'sellerInfo.subscriptionStatus': 'active' 
    });
    
    res.json({
      users: {
        total: userCount,
        sellers: sellerCount,
        buyers: buyerCount,
        delivery: deliveryCount
      },
      products: productCount,
      orders: {
        total: orderCount,
        pending: pendingOrders,
        processing: processingOrders,
        delivered: deliveredOrders
      },
      subscriptions: {
        total: subscriptions,
        active: activeSubscriptions
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/admin/users
// @desc    Get all users
// @access  Private/Admin
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/admin/users/:id
// @desc    Get user by ID
// @access  Private/Admin
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT api/admin/users/:id
// @desc    Update user
// @access  Private/Admin
router.put('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Update user fields
    const { name, email, phone, roles, isVerified } = req.body;
    
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (roles) user.roles = roles;
    if (isVerified !== undefined) user.isVerified = isVerified;
    
    await user.save();
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/admin/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    await user.remove();
    
    res.json({ msg: 'User removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   GET api/admin/products
// @desc    Get all products
// @access  Private/Admin
router.get('/products', adminAuth, async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/admin/products/:id
// @desc    Delete product
// @access  Private/Admin
router.delete('/products/:id', adminAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }
    
    await product.remove();
    
    res.json({ msg: 'Product removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Product not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   GET api/admin/orders
// @desc    Get all orders
// @access  Private/Admin
router.get('/orders', adminAuth, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .populate('deliveryAgent', 'name email');
      
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/admin/orders/:id
// @desc    Update order status
// @access  Private/Admin
router.put('/orders/:id', adminAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    // Update order status
    const { status } = req.body;
    if (status) order.status = status;
    
    await order.save();
    
    res.json(order);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Order not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   GET api/admin/subscriptions
// @desc    Get all subscription plans
// @access  Private/Admin
router.get('/subscriptions', adminAuth, async (req, res) => {
  try {
    const subscriptions = await Subscription.find();
    res.json(subscriptions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/admin/subscriptions
// @desc    Create a subscription plan
// @access  Private/Admin
router.post('/subscriptions', adminAuth, async (req, res) => {
  try {
    const { name, description, price, duration, features } = req.body;
    
    const subscription = new Subscription({
      name,
      description,
      price,
      duration,
      features
    });
    
    await subscription.save();
    
    res.json(subscription);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/admin/subscriptions/:id
// @desc    Update a subscription plan
// @access  Private/Admin
router.put('/subscriptions/:id', adminAuth, async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    
    if (!subscription) {
      return res.status(404).json({ msg: 'Subscription plan not found' });
    }
    
    const { name, description, price, duration, features, isActive } = req.body;
    
    if (name) subscription.name = name;
    if (description) subscription.description = description;
    if (price) subscription.price = price;
    if (duration) subscription.duration = duration;
    if (features) subscription.features = features;
    if (isActive !== undefined) subscription.isActive = isActive;
    
    await subscription.save();
    
    res.json(subscription);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Subscription plan not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/admin/subscriptions/:id
// @desc    Delete a subscription plan
// @access  Private/Admin
router.delete('/subscriptions/:id', adminAuth, async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    
    if (!subscription) {
      return res.status(404).json({ msg: 'Subscription plan not found' });
    }
    
    await subscription.remove();
    
    res.json({ msg: 'Subscription plan removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Subscription plan not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;