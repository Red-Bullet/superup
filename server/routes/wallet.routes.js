const express = require('express');
const router = express.Router();
const Wallet = require('../models/wallet.model');
const User = require('../models/user.model');
const { auth, checkRole } = require('../middleware/auth.middleware');
const { check, validationResult } = require('express-validator');
const crypto = require('crypto');

// @route   GET api/wallet
// @desc    Get all wallets for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const wallets = await Wallet.find({ owner: req.user.id });
    res.json(wallets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/wallet/:type
// @desc    Get specific wallet by type for current user
// @access  Private
router.get('/:type', auth, async (req, res) => {
  const { type } = req.params;
  
  // Validate wallet type
  if (!['buyer', 'seller', 'delivery', 'admin'].includes(type)) {
    return res.status(400).json({ msg: 'Invalid wallet type' });
  }
  
  try {
    const wallet = await Wallet.findOne({ 
      owner: req.user.id,
      walletType: type
    });
    
    if (!wallet) {
      return res.status(404).json({ msg: 'Wallet not found' });
    }
    
    res.json(wallet);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/wallet/deposit
// @desc    Add funds to wallet
// @access  Private
router.post('/deposit', auth, [
  check('amount', 'Amount is required and must be a positive number').isFloat({ min: 0.01 }),
  check('walletType', 'Wallet type is required').not().isEmpty(),
  check('paymentMethod', 'Payment method is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { amount, walletType, paymentMethod, paymentDetails } = req.body;

  // Validate wallet type
  if (!['buyer', 'seller', 'delivery', 'admin'].includes(walletType)) {
    return res.status(400).json({ msg: 'Invalid wallet type' });
  }

  try {
    // Find wallet
    let wallet = await Wallet.findOne({ 
      owner: req.user.id,
      walletType
    });
    
    if (!wallet) {
      return res.status(404).json({ msg: 'Wallet not found' });
    }
    
    // Generate unique reference
    const reference = crypto.randomBytes(10).toString('hex');
    
    // Create transaction
    const transaction = {
      type: 'deposit',
      amount: parseFloat(amount),
      description: `Deposit to ${walletType} wallet`,
      status: 'completed', // In a real app, this would be 'pending' until payment confirmation
      reference,
      relatedUser: req.user.id,
      paymentMethod,
      paymentDetails: {
        ...paymentDetails,
        transactionId: paymentDetails?.transactionId || reference,
        provider: paymentDetails?.provider || paymentMethod
      },
      createdAt: new Date()
    };
    
    // Add transaction to wallet
    await wallet.addTransaction(transaction);
    
    res.json(wallet);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/wallet/withdraw
// @desc    Withdraw funds from wallet
// @access  Private
router.post('/withdraw', auth, [
  check('amount', 'Amount is required and must be a positive number').isFloat({ min: 0.01 }),
  check('walletType', 'Wallet type is required').not().isEmpty(),
  check('paymentMethod', 'Payment method is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { amount, walletType, paymentMethod, paymentDetails } = req.body;

  // Validate wallet type
  if (!['buyer', 'seller', 'delivery', 'admin'].includes(walletType)) {
    return res.status(400).json({ msg: 'Invalid wallet type' });
  }

  try {
    // Find wallet
    let wallet = await Wallet.findOne({ 
      owner: req.user.id,
      walletType
    });
    
    if (!wallet) {
      return res.status(404).json({ msg: 'Wallet not found' });
    }
    
    // Check if wallet has sufficient balance
    if (!wallet.hasSufficientBalance(parseFloat(amount))) {
      return res.status(400).json({ msg: 'Insufficient balance' });
    }
    
    // Generate unique reference
    const reference = crypto.randomBytes(10).toString('hex');
    
    // Create transaction
    const transaction = {
      type: 'withdrawal',
      amount: parseFloat(amount),
      description: `Withdrawal from ${walletType} wallet`,
      status: 'completed', // In a real app, this might be 'pending' until processed
      reference,
      relatedUser: req.user.id,
      paymentMethod,
      paymentDetails: {
        ...paymentDetails,
        transactionId: paymentDetails?.transactionId || reference,
        provider: paymentDetails?.provider || paymentMethod
      },
      createdAt: new Date()
    };
    
    // Add transaction to wallet
    await wallet.addTransaction(transaction);
    
    res.json(wallet);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/wallet/transfer
// @desc    Transfer funds between wallets
// @access  Private
router.post('/transfer', auth, [
  check('amount', 'Amount is required and must be a positive number').isFloat({ min: 0.01 }),
  check('fromWalletType', 'Source wallet type is required').not().isEmpty(),
  check('toWalletType', 'Destination wallet type is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { amount, fromWalletType, toWalletType } = req.body;

  // Validate wallet types
  if (!['buyer', 'seller', 'delivery', 'admin'].includes(fromWalletType) ||
      !['buyer', 'seller', 'delivery', 'admin'].includes(toWalletType)) {
    return res.status(400).json({ msg: 'Invalid wallet type' });
  }

  // Prevent transfer to same wallet
  if (fromWalletType === toWalletType) {
    return res.status(400).json({ msg: 'Cannot transfer to the same wallet' });
  }

  try {
    // Find source wallet
    let fromWallet = await Wallet.findOne({ 
      owner: req.user.id,
      walletType: fromWalletType
    });
    
    if (!fromWallet) {
      return res.status(404).json({ msg: 'Source wallet not found' });
    }
    
    // Find destination wallet
    let toWallet = await Wallet.findOne({ 
      owner: req.user.id,
      walletType: toWalletType
    });
    
    if (!toWallet) {
      return res.status(404).json({ msg: 'Destination wallet not found' });
    }
    
    // Check if source wallet has sufficient balance
    if (!fromWallet.hasSufficientBalance(parseFloat(amount))) {
      return res.status(400).json({ msg: 'Insufficient balance' });
    }
    
    // Generate unique reference
    const reference = crypto.randomBytes(10).toString('hex');
    
    // Create withdrawal transaction
    const withdrawalTransaction = {
      type: 'withdrawal',
      amount: parseFloat(amount),
      description: `Transfer to ${toWalletType} wallet`,
      status: 'completed',
      reference,
      relatedUser: req.user.id,
      paymentMethod: 'internal',
      paymentDetails: {
        transactionId: reference,
        provider: 'internal'
      },
      createdAt: new Date()
    };
    
    // Create deposit transaction
    const depositTransaction = {
      type: 'deposit',
      amount: parseFloat(amount),
      description: `Transfer from ${fromWalletType} wallet`,
      status: 'completed',
      reference,
      relatedUser: req.user.id,
      paymentMethod: 'internal',
      paymentDetails: {
        transactionId: reference,
        provider: 'internal'
      },
      createdAt: new Date()
    };
    
    // Add transactions to wallets
    await fromWallet.addTransaction(withdrawalTransaction);
    await toWallet.addTransaction(depositTransaction);
    
    res.json({
      fromWallet,
      toWallet
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/wallet/transactions/:walletType
// @desc    Get transactions for a specific wallet
// @access  Private
router.get('/transactions/:walletType', auth, async (req, res) => {
  const { walletType } = req.params;
  
  // Validate wallet type
  if (!['buyer', 'seller', 'delivery', 'admin'].includes(walletType)) {
    return res.status(400).json({ msg: 'Invalid wallet type' });
  }
  
  try {
    const wallet = await Wallet.findOne({ 
      owner: req.user.id,
      walletType
    });
    
    if (!wallet) {
      return res.status(404).json({ msg: 'Wallet not found' });
    }
    
    res.json(wallet.transactions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;