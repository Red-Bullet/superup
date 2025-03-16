const express = require('express');
const router = express.Router();
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const Wallet = require('../models/wallet.model');
const { auth, checkRole } = require('../middleware/auth.middleware');
const { check, validationResult } = require('express-validator');
const crypto = require('crypto');

// @route   POST api/orders
// @desc    Create a new order
// @access  Private/Buyer
router.post('/', auth, checkRole(['buyer']), [
  check('items', 'Items are required').isArray({ min: 1 }),
  check('items.*.product', 'Product ID is required for each item').not().isEmpty(),
  check('items.*.quantity', 'Quantity is required for each item').isInt({ min: 1 }),
  check('shippingAddress', 'Shipping address is required').not().isEmpty(),
  check('paymentMethod', 'Payment method is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { items, shippingAddress, paymentMethod, paymentDetails } = req.body;

  try {
    // Validate products and calculate total
    const orderItems = [];
    let productTotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        return res.status(404).json({ msg: `Product not found: ${item.product}` });
      }
      
      if (!product.isAvailable) {
        return res.status(400).json({ msg: `Product is not available: ${product.name}` });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          msg: `Insufficient stock for ${product.name}. Available: ${product.stock}` 
        });
      }
      
      const subtotal = product.price * item.quantity;
      productTotal += subtotal;
      
      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        subtotal
      });
    }

    // Fixed platform fee
    const platformFee = 1200; // 1200 XOF
    const deliveryFee = 1000; // 1000 XOF to delivery agent
    const adminFee = 200;     // 200 XOF to admin
    
    // Total amount including product total and platform fee
    const totalAmount = productTotal + platformFee;

    // Check if buyer has sufficient balance if paying with wallet
    if (paymentMethod === 'wallet') {
      const buyerWallet = await Wallet.findOne({ 
        owner: req.user.id,
        walletType: 'buyer'
      });
      
      if (!buyerWallet) {
        return res.status(404).json({ msg: 'Buyer wallet not found' });
      }
      
      if (!buyerWallet.hasSufficientBalance(totalAmount)) {
        return res.status(400).json({ 
          msg: `Insufficient balance. Required: ${totalAmount} XOF, Available: ${buyerWallet.balance} XOF` 
        });
      }
    }

    // Create new order
    const order = new Order({
      buyer: req.user.id,
      items: orderItems,
      totalAmount,
      platformFee,
      deliveryFee,
      adminFee,
      currency: 'XOF',
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod,
      shippingAddress,
      estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
    });

    // Save order
    await order.save();

    // Process payment if using wallet
    if (paymentMethod === 'wallet') {
      const buyerWallet = await Wallet.findOne({ 
        owner: req.user.id,
        walletType: 'buyer'
      });
      
      // Generate unique reference
      const reference = crypto.randomBytes(10).toString('hex');
      
      // Create transaction
      const transaction = {
        type: 'payment',
        amount: totalAmount,
        description: `Payment for order #${order._id}`,
        status: 'completed',
        reference,
        relatedOrder: order._id,
        paymentMethod: 'wallet',
        paymentDetails: {
          transactionId: reference,
          provider: 'internal'
        },
        createdAt: new Date()
      };
      
      // Add transaction to wallet
      await buyerWallet.addTransaction(transaction);
      
      // Update order payment status
      order.paymentStatus = 'paid';
      order.status = 'processing';
      order.paymentDetails = {
        transactionId: reference,
        paymentDate: new Date(),
        provider: 'wallet'
      };
      
      await order.save();
      
      // Reduce product stock
      for (const item of orderItems) {
        const product = await Product.findById(item.product);
        await product.reduceStock(item.quantity);
      }
    }

    res.json(order);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/orders
// @desc    Get all orders for current user (buyer or seller)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let orders;
    
    if (req.user.roles.includes('buyer')) {
      // Get buyer orders
      orders = await Order.findByBuyer(req.user.id);
    } else if (req.user.roles.includes('seller')) {
      // Get seller orders (orders containing products from this seller)
      orders = await Order.find({
        'items.product': { $in: await Product.find({ seller: req.user.id }).distinct('_id') }
      })
        .sort({ createdAt: -1 })
        .populate('items.product')
        .populate('buyer', 'name phone address');
    } else if (req.user.roles.includes('delivery')) {
      // Get delivery agent orders
      orders = await Order.findByDeliveryAgent(req.user.id);
    } else if (req.user.roles.includes('admin')) {
      // Get all orders for admin
      orders = await Order.find()
        .sort({ createdAt: -1 })
        .populate('items.product')
        .populate('buyer', 'name phone address')
        .populate('deliveryAgent', 'name phone deliveryInfo');
    } else {
      return res.status(403).json({ msg: 'Not authorized to view orders' });
    }
    
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product')
      .populate('buyer', 'name phone address')
      .populate('deliveryAgent', 'name phone deliveryInfo');
    
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    // Check if user is authorized to view this order
    const isAuthorized = 
      order.buyer.toString() === req.user.id || // Buyer
      req.user.roles.includes('admin') || // Admin
      (req.user.roles.includes('delivery') && order.deliveryAgent && 
       order.deliveryAgent.toString() === req.user.id) || // Delivery agent assigned to this order
      (req.user.roles.includes('seller') && 
       await Product.find({ 
         seller: req.user.id, 
         _id: { $in: order.items.map(item => item.product) } 
       }).count() > 0); // Seller of at least one product in the order
    
    if (!isAuthorized) {
      return res.status(403).json({ msg: 'Not authorized to view this order' });
    }
    
    res.json(order);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Order not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT api/orders/:id/status
// @desc    Update order status
// @access  Private/Admin
router.put('/:id/status', auth, checkRole(['admin']), [
  check('status', 'Status is required').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { status } = req.body;

  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    // Update order status
    await order.updateStatus(status);
    
    // If order is delivered, release payment to seller and delivery agent
    if (status === 'delivered' && order.paymentStatus === 'paid') {
      // Process payment distribution
      await distributePayment(order);
    }
    
    // If order is cancelled, refund buyer
    if (status === 'cancelled' && order.paymentStatus === 'paid') {
      // Process refund
      await processRefund(order);
    }
    
    res.json(order);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Order not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT api/orders/:id/assign-delivery
// @desc    Assign delivery agent to order
// @access  Private/Admin
router.put('/:id/assign-delivery', auth, checkRole(['admin']), [
  check('deliveryAgentId', 'Delivery agent ID is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { deliveryAgentId } = req.body;

  try {
    // Check if delivery agent exists and has delivery role
    const deliveryAgent = await User.findById(deliveryAgentId);
    if (!deliveryAgent || !deliveryAgent.roles.includes('delivery')) {
      return res.status(404).json({ msg: 'Valid delivery agent not found' });
    }
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    // Assign delivery agent
    await order.assignDeliveryAgent(deliveryAgentId);
    
    res.json(order);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Order not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT api/orders/:id/delivery-status
// @desc    Update delivery status
// @access  Private/Delivery
router.put('/:id/delivery-status', auth, checkRole(['delivery']), [
  check('status', 'Status is required').isIn(['picked_up', 'in_transit', 'delivered', 'failed'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { status, proof } = req.body;

  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    // Check if delivery agent is assigned to this order
    if (!order.deliveryAgent || order.deliveryAgent.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to update this order' });
    }
    
    // Update delivery status
    await order.updateDeliveryStatus(status, proof);
    
    // If delivery is completed, release payment
    if (status === 'delivered' && order.paymentStatus === 'paid') {
      // Process payment distribution
      await distributePayment(order);
    }
    
    res.json(order);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Order not found' });
    }
    res.status(500).send('Server error');
  }
});

// Helper function to distribute payment to seller and delivery agent
async function distributePayment(order) {
  try {
    // Get product sellers
    const productIds = order.items.map(item => item.product);
    const products = await Product.find({ _id: { $in: productIds } });
    
    // Group items by seller
    const sellerItems = {};
    for (const item of order.items) {
      const product = products.find(p => p._id.toString() === item.product.toString());
      if (product) {
        const sellerId = product.seller.toString();
        if (!sellerItems[sellerId]) {
          sellerItems[sellerId] = [];
        }
        sellerItems[sellerId].push(item);
      }
    }
    
    // Distribute product price to sellers
    for (const sellerId in sellerItems) {
      const sellerTotal = sellerItems[sellerId].reduce((total, item) => total + item.subtotal, 0);
      
      // Find seller wallet
      const sellerWallet = await Wallet.findOne({ 
        owner: sellerId,
        walletType: 'seller'
      });
      
      if (sellerWallet) {
        // Generate unique reference
        const reference = crypto.randomBytes(10).toString('hex');
        
        // Create transaction
        const transaction = {
          type: 'deposit',
          amount: sellerTotal,
          description: `Payment for order #${order._id}`,
          status: 'completed',
          reference,
          relatedOrder: order._id,
          paymentMethod: 'internal',
          paymentDetails: {
            transactionId: reference,
            provider: 'internal'
          },
          createdAt: new Date()
        };
        
        // Add transaction to wallet
        await sellerWallet.addTransaction(transaction);
      }
    }
    
    // Distribute delivery fee to delivery agent
    if (order.deliveryAgent) {
      const deliveryWallet = await Wallet.findOne({ 
        owner: order.deliveryAgent,
        walletType: 'delivery'
      });
      
      if (deliveryWallet) {
        // Generate unique reference
        const reference = crypto.randomBytes(10).toString('hex');
        
        // Create transaction
        const transaction = {
          type: 'commission',
          amount: order.deliveryFee,
          description: `Delivery fee for order #${order._id}`,
          status: 'completed',
          reference,
          relatedOrder: order._id,
          paymentMethod: 'internal',
          paymentDetails: {
            transactionId: reference,
            provider: 'internal'
          },
          createdAt: new Date()
        };
        
        // Add transaction to wallet
        await deliveryWallet.addTransaction(transaction);
      }
    }
    
    // Distribute admin fee to admin wallet
    const adminUser = await User.findOne({ roles: 'admin' });
    if (adminUser) {
      const adminWallet = await Wallet.findOne({ 
        owner: adminUser._id,
        walletType: 'admin'
      });
      
      if (adminWallet) {
        // Generate unique reference
        const reference = crypto.randomBytes(10).toString('hex');
        
        // Create transaction
        const transaction = {
          type: 'fee',
          amount: order.adminFee,
          description: `Admin fee for order #${order._id}`,
          status: 'completed',
          reference,
          relatedOrder: order._id,
          paymentMethod: 'internal',
          paymentDetails: {
            transactionId: reference,
            provider: 'internal'
          },
          createdAt: new Date()
        };
        
        // Add transaction to wallet
        await adminWallet.addTransaction(transaction);
      }
    }
    
    // Update order payment status
    order.paymentStatus = 'released';
    await order.save();
  } catch (err) {
    console.error('Error distributing payment:', err);
    throw err;
  }
}

// Helper function to process refund
async function processRefund(order) {
  try {
    // Find buyer wallet
    const buyerWallet = await Wallet.findOne({ 
      owner: order.buyer,
      walletType: 'buyer'
    });
    
    if (buyerWallet) {
      // Generate unique reference
      const reference = crypto.randomBytes(10).toString('hex');
      
      // Create transaction
      const transaction = {
        type: 'refund',
        amount: order.totalAmount,
        description: `Refund for cancelled order #${order._id}`,
        status: 'completed',
        reference,
        relatedOrder: order._id,
        paymentMethod: 'internal',
        paymentDetails: {
          transactionId: reference,
          provider: 'internal'
        },
        createdAt: new Date()
      };
      
      // Add transaction to wallet
      await buyerWallet.addTransaction(transaction);
      
      // Update order payment status
      order.paymentStatus = 'refunded';
      await order.save();
    }
  } catch (err) {
    console.error('Error processing refund:', err);
    throw err;
  }
}

module.exports = router;