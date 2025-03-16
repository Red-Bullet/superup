const express = require('express');
const router = express.Router();
const Subscription = require('../models/subscription.model');
const User = require('../models/user.model');
const Wallet = require('../models/wallet.model');
const { auth, checkRole } = require('../middleware/auth.middleware');
const { check, validationResult } = require('express-validator');
const crypto = require('crypto');

// @route   GET api/subscription
// @desc    Get current seller's subscription
// @access  Private/Seller
router.get('/', auth, checkRole(['seller']), async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ seller: req.user.id });
    
    if (!subscription) {
      return res.status(404).json({ msg: 'Subscription not found' });
    }
    
    res.json(subscription);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/subscription
// @desc    Create or update subscription
// @access  Private/Seller
router.post('/', auth, checkRole(['seller']), [
  check('plan', 'Plan is required').isIn(['free_trial', 'weekly', 'monthly', 'yearly']),
  check('paymentMethod', 'Payment method is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { plan, paymentMethod, autoRenew = false, paymentDetails } = req.body;

  try {
    // Check if user is a seller
    const user = await User.findById(req.user.id);
    if (!user.roles.includes('seller')) {
      return res.status(403).json({ msg: 'User is not a seller' });
    }
    
    // Check if subscription already exists
    let subscription = await Subscription.findOne({ seller: req.user.id });
    let isNew = false;
    
    if (!subscription) {
      // Create new subscription
      subscription = new Subscription({
        seller: req.user.id,
        plan,
        autoRenew,
        paymentMethod,
        price: 0 // Will be calculated in pre-save hook
      });
      isNew = true;
    } else {
      // Update existing subscription
      subscription.plan = plan;
      subscription.autoRenew = autoRenew;
      subscription.paymentMethod = paymentMethod;
    }
    
    // If not free trial, process payment
    if (plan !== 'free_trial') {
      // Calculate price based on plan (this will be done in pre-save hook)
      await subscription.save();
      
      // Process payment if using wallet
      if (paymentMethod === 'wallet') {
        const sellerWallet = await Wallet.findOne({ 
          owner: req.user.id,
          walletType: 'seller'
        });
        
        if (!sellerWallet) {
          return res.status(404).json({ msg: 'Seller wallet not found' });
        }
        
        if (!sellerWallet.hasSufficientBalance(subscription.price)) {
          return res.status(400).json({ 
            msg: `Insufficient balance. Required: ${subscription.price} XOF, Available: ${sellerWallet.balance} XOF` 
          });
        }
        
        // Generate unique reference
        const reference = crypto.randomBytes(10).toString('hex');
        
        // Create transaction
        const transaction = {
          type: 'payment',
          amount: subscription.price,
          description: `Payment for ${plan} subscription`,
          status: 'completed',
          reference,
          paymentMethod: 'wallet',
          paymentDetails: {
            transactionId: reference,
            provider: 'internal'
          },
          createdAt: new Date()
        };
        
        // Add transaction to wallet
        await sellerWallet.addTransaction(transaction);
        
        // Update subscription payment details
        subscription.paymentDetails = {
          transactionId: reference,
          paymentDate: new Date(),
          provider: 'wallet'
        };
        
        // Update user's seller info
        user.sellerInfo = user.sellerInfo || {};
        user.sellerInfo.subscriptionStatus = 'active';
        user.sellerInfo.subscriptionType = plan;
        user.sellerInfo.subscriptionStartDate = subscription.startDate;
        user.sellerInfo.subscriptionEndDate = subscription.endDate;
        
        await user.save();
      } else {
        // For other payment methods, we would integrate with external payment providers
        // For now, we'll just update the status
        subscription.status = 'pending';
      }
    } else {
      // Free trial
      user.sellerInfo = user.sellerInfo || {};
      user.sellerInfo.subscriptionStatus = 'trial';
      user.sellerInfo.subscriptionType = 'free_trial';
      user.sellerInfo.subscriptionStartDate = subscription.startDate;
      user.sellerInfo.subscriptionEndDate = subscription.endDate;
      
      await user.save();
    }
    
    await subscription.save();
    
    res.json({
      subscription,
      isNew
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/subscription/renew
// @desc    Renew subscription
// @access  Private/Seller
router.put('/renew', auth, checkRole(['seller']), [
  check('paymentMethod', 'Payment method is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { paymentMethod, paymentDetails } = req.body;

  try {
    // Check if subscription exists
    const subscription = await Subscription.findOne({ seller: req.user.id });
    
    if (!subscription) {
      return res.status(404).json({ msg: 'Subscription not found' });
    }
    
    // Process payment if using wallet
    if (paymentMethod === 'wallet') {
      const sellerWallet = await Wallet.findOne({ 
        owner: req.user.id,
        walletType: 'seller'
      });
      
      if (!sellerWallet) {
        return res.status(404).json({ msg: 'Seller wallet not found' });
      }
      
      if (!sellerWallet.hasSufficientBalance(subscription.price)) {
        return res.status(400).json({ 
          msg: `Insufficient balance. Required: ${subscription.price} XOF, Available: ${sellerWallet.balance} XOF` 
        });
      }
      
      // Generate unique reference
      const reference = crypto.randomBytes(10).toString('hex');
      
      // Create transaction
      const transaction = {
        type: 'payment',
        amount: subscription.price,
        description: `Renewal payment for ${subscription.plan} subscription`,
        status: 'completed',
        reference,
        paymentMethod: 'wallet',
        paymentDetails: {
          transactionId: reference,
          provider: 'internal'
        },
        createdAt: new Date()
      };
      
      // Add transaction to wallet
      await sellerWallet.addTransaction(transaction);
      
      // Update payment details for renewal
      const renewalPaymentDetails = {
        transactionId: reference,
        paymentDate: new Date(),
        provider: 'wallet'
      };
      
      // Renew subscription
      await subscription.renew({
        paymentMethod,
        ...renewalPaymentDetails
      });
      
      // Update user's seller info
      const user = await User.findById(req.user.id);
      user.sellerInfo = user.sellerInfo || {};
      user.sellerInfo.subscriptionStatus = 'active';
      user.sellerInfo.subscriptionType = subscription.plan;
      user.sellerInfo.subscriptionStartDate = subscription.startDate;
      user.sellerInfo.subscriptionEndDate = subscription.endDate;
      
      await user.save();
    } else {
      // For other payment methods, we would integrate with external payment providers
      // For now, we'll just update the status
      subscription.status = 'pending';
      await subscription.save();
    }
    
    res.json(subscription);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/subscription/change-plan
// @desc    Change subscription plan
// @access  Private/Seller
router.put('/change-plan', auth, checkRole(['seller']), [
  check('plan', 'Plan is required').isIn(['weekly', 'monthly', 'yearly']),
  check('paymentMethod', 'Payment method is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { plan, paymentMethod, paymentDetails } = req.body;

  try {
    // Check if subscription exists
    const subscription = await Subscription.findOne({ seller: req.user.id });
    
    if (!subscription) {
      return res.status(404).json({ msg: 'Subscription not found' });
    }
    
    // Process payment if using wallet
    if (paymentMethod === 'wallet') {
      // Calculate new price based on plan
      let price;
      switch (plan) {
        case 'weekly':
          price = 2000; // Example price in XOF
          break;
        case 'monthly':
          price = 7500; // Example price in XOF
          break;
        case 'yearly':
          price = 75000; // Example price in XOF
          break;
        default:
          price = 0;
          break;
      }
      
      const sellerWallet = await Wallet.findOne({ 
        owner: req.user.id,
        walletType: 'seller'
      });
      
      if (!sellerWallet) {
        return res.status(404).json({ msg: 'Seller wallet not found' });
      }
      
      if (!sellerWallet.hasSufficientBalance(price)) {
        return res.status(400).json({ 
          msg: `Insufficient balance. Required: ${price} XOF, Available: ${sellerWallet.balance} XOF` 
        });
      }
      
      // Generate unique reference
      const reference = crypto.randomBytes(10).toString('hex');
      
      // Create transaction
      const transaction = {
        type: 'payment',
        amount: price,
        description: `Payment for changing to ${plan} subscription`,
        status: 'completed',
        reference,
        paymentMethod: 'wallet',
        paymentDetails: {
          transactionId: reference,
          provider: 'internal'
        },
        createdAt: new Date()
      };
      
      // Add transaction to wallet
      await sellerWallet.addTransaction(transaction);
      
      // Update payment details for plan change
      const changePlanPaymentDetails = {
        transactionId: reference,
        paymentDate: new Date(),
        provider: 'wallet'
      };
      
      // Change subscription plan
      await subscription.changePlan(plan, {
        paymentMethod,
        ...changePlanPaymentDetails
      });
      
      // Update user's seller info
      const user = await User.findById(req.user.id);
      user.sellerInfo = user.sellerInfo || {};
      user.sellerInfo.subscriptionStatus = 'active';
      user.sellerInfo.subscriptionType = plan;
      user.sellerInfo.subscriptionStartDate = subscription.startDate;
      user.sellerInfo.subscriptionEndDate = subscription.endDate;
      
      await user.save();
    } else {
      // For other payment methods, we would integrate with external payment providers
      // For now, we'll just update the status
      subscription.status = 'pending';
      await subscription.save();
    }
    
    res.json(subscription);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/subscription/cancel
// @desc    Cancel subscription
// @access  Private/Seller
router.put('/cancel', auth, checkRole(['seller']), async (req, res) => {
  try {
    // Check if subscription exists
    const subscription = await Subscription.findOne({ seller: req.user.id });
    
    if (!subscription) {
      return res.status(404).json({ msg: 'Subscription not found' });
    }
    
    // Cancel subscription
    subscription.status = 'cancelled';
    subscription.autoRenew = false;
    
    await subscription.save();
    
    // Update user's seller info
    const user = await User.findById(req.user.id);
    user.sellerInfo = user.sellerInfo || {};
    user.sellerInfo.subscriptionStatus = 'cancelled';
    
    await user.save();
    
    res.json(subscription);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/subscription/admin/expiring
// @desc    Get expiring subscriptions (admin only)
// @access  Private/Admin
router.get('/admin/expiring', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const subscriptions = await Subscription.findExpiring(parseInt(days));
    res.json(subscriptions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/subscription/admin/expired
// @desc    Get expired subscriptions (admin only)
// @access  Private/Admin
router.get('/admin/expired', auth, checkRole(['admin']), async (req, res) => {
  try {
    const subscriptions = await Subscription.findExpired();
    res.json(subscriptions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;