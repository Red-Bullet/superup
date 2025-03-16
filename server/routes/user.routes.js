const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const Wallet = require('../models/wallet.model');
const Subscription = require('../models/subscription.model');
const { auth, checkRole } = require('../middleware/auth.middleware');
const { check, validationResult } = require('express-validator');

// @route   GET api/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/', auth, checkRole(['admin']), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private/Admin
router.get('/:id', auth, checkRole(['admin']), async (req, res) => {
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

// @route   PUT api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, [
  check('name', 'Name is required').not().isEmpty(),
  check('phone', 'Phone number is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    name,
    phone,
    address,
    profileImage
  } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Update user profile
    user.name = name || user.name;
    user.phone = phone || user.phone;
    if (address) user.address = address;
    if (profileImage) user.profileImage = profileImage;

    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/users/seller-profile
// @desc    Update seller profile
// @access  Private/Seller
router.put('/seller-profile', auth, checkRole(['seller']), [
  check('businessName', 'Business name is required').not().isEmpty(),
  check('businessDescription', 'Business description is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    businessName,
    businessDescription,
    businessLogo
  } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Initialize sellerInfo if it doesn't exist
    if (!user.sellerInfo) {
      user.sellerInfo = {};
    }

    // Update seller profile
    user.sellerInfo.businessName = businessName || user.sellerInfo.businessName;
    user.sellerInfo.businessDescription = businessDescription || user.sellerInfo.businessDescription;
    if (businessLogo) user.sellerInfo.businessLogo = businessLogo;

    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/users/delivery-profile
// @desc    Update delivery agent profile
// @access  Private/Delivery
router.put('/delivery-profile', auth, checkRole(['delivery']), [
  check('vehicleType', 'Vehicle type is required').not().isEmpty(),
  check('vehiclePlate', 'Vehicle plate is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    vehicleType,
    vehiclePlate,
    idCardImage,
    isAvailable
  } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Initialize deliveryInfo if it doesn't exist
    if (!user.deliveryInfo) {
      user.deliveryInfo = {};
    }

    // Update delivery profile
    user.deliveryInfo.vehicleType = vehicleType || user.deliveryInfo.vehicleType;
    user.deliveryInfo.vehiclePlate = vehiclePlate || user.deliveryInfo.vehiclePlate;
    if (idCardImage) user.deliveryInfo.idCardImage = idCardImage;
    if (isAvailable !== undefined) user.deliveryInfo.isAvailable = isAvailable;

    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/users/add-role
// @desc    Add a role to user
// @access  Private/Admin
router.put('/add-role/:id', auth, checkRole(['admin']), [
  check('role', 'Role is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { role } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if role is valid
    if (!['buyer', 'seller', 'delivery', 'admin', 'customer_service'].includes(role)) {
      return res.status(400).json({ msg: 'Invalid role' });
    }

    // Check if user already has this role
    if (user.roles.includes(role)) {
      return res.status(400).json({ msg: `User already has ${role} role` });
    }

    // Add role to user
    user.roles.push(role);

    // If adding seller role, create a free trial subscription
    if (role === 'seller') {
      // Check if subscription already exists
      let subscription = await Subscription.findOne({ seller: user._id });
      if (!subscription) {
        subscription = new Subscription({
          seller: user._id,
          plan: 'free_trial',
          status: 'active',
          price: 0
        });
        await subscription.save();
      }
    }

    // If adding a role that needs a wallet, create one
    if (['buyer', 'seller', 'delivery', 'admin'].includes(role)) {
      // Check if wallet already exists
      const wallet = await Wallet.findOne({ owner: user._id, walletType: role });
      if (!wallet) {
        const newWallet = new Wallet({
          owner: user._id,
          walletType: role,
          balance: 0,
          currency: 'XOF'
        });
        await newWallet.save();
      }
    }

    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/users/remove-role/:id
// @desc    Remove a role from user
// @access  Private/Admin
router.put('/remove-role/:id', auth, checkRole(['admin']), [
  check('role', 'Role is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { role } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if role is valid
    if (!['buyer', 'seller', 'delivery', 'admin', 'customer_service'].includes(role)) {
      return res.status(400).json({ msg: 'Invalid role' });
    }

    // Check if user has this role
    if (!user.roles.includes(role)) {
      return res.status(400).json({ msg: `User does not have ${role} role` });
    }

    // Prevent removing the last role
    if (user.roles.length === 1) {
      return res.status(400).json({ msg: 'Cannot remove the last role' });
    }

    // Remove role from user
    user.roles = user.roles.filter(r => r !== role);

    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;