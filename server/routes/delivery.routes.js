const express = require('express');
const router = express.Router();
const Order = require('../models/order.model');
const User = require('../models/user.model');
const { auth, checkRole } = require('../middleware/auth.middleware');
const { check, validationResult } = require('express-validator');

// @route   PUT api/delivery/location
// @desc    Update delivery agent location
// @access  Private/Delivery
router.put('/location', auth, checkRole(['delivery']), [
  check('latitude', 'Latitude is required').isFloat(),
  check('longitude', 'Longitude is required').isFloat()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { latitude, longitude } = req.body;

  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Initialize deliveryInfo if it doesn't exist
    if (!user.deliveryInfo) {
      user.deliveryInfo = {};
    }
    
    // Update location
    user.deliveryInfo.currentLocation = {
      latitude,
      longitude
    };
    
    await user.save();
    
    res.json({
      success: true,
      location: user.deliveryInfo.currentLocation
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/delivery/availability
// @desc    Update delivery agent availability
// @access  Private/Delivery
router.put('/availability', auth, checkRole(['delivery']), [
  check('isAvailable', 'Availability status is required').isBoolean()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { isAvailable } = req.body;

  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Initialize deliveryInfo if it doesn't exist
    if (!user.deliveryInfo) {
      user.deliveryInfo = {};
    }
    
    // Update availability
    user.deliveryInfo.isAvailable = isAvailable;
    
    await user.save();
    
    res.json({
      success: true,
      isAvailable: user.deliveryInfo.isAvailable
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/delivery/pending
// @desc    Get pending deliveries
// @access  Private/Delivery
router.get('/pending', auth, checkRole(['delivery']), async (req, res) => {
  try {
    // Find orders that need delivery agents
    const pendingOrders = await Order.findPendingDelivery();
    
    res.json(pendingOrders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/delivery/assigned
// @desc    Get deliveries assigned to current agent
// @access  Private/Delivery
router.get('/assigned', auth, checkRole(['delivery']), async (req, res) => {
  try {
    // Find orders assigned to this delivery agent
    const assignedOrders = await Order.findByDeliveryAgent(req.user.id);
    
    res.json(assignedOrders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/delivery/accept/:id
// @desc    Accept a delivery (for self-assignment model)
// @access  Private/Delivery
router.put('/accept/:id', auth, checkRole(['delivery']), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    // Check if order is available for delivery
    if (order.status !== 'processing' || order.deliveryStatus !== 'pending' || order.deliveryAgent) {
      return res.status(400).json({ msg: 'Order is not available for delivery' });
    }
    
    // Check if delivery agent is available
    const user = await User.findById(req.user.id);
    if (!user.deliveryInfo || !user.deliveryInfo.isAvailable) {
      return res.status(400).json({ msg: 'Delivery agent is not available' });
    }
    
    // Assign delivery agent to order
    await order.assignDeliveryAgent(req.user.id);
    
    res.json(order);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Order not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   GET api/delivery/agents/nearby
// @desc    Find nearby delivery agents (admin only)
// @access  Private/Admin
router.get('/agents/nearby', auth, checkRole(['admin']), [
  check('latitude', 'Latitude is required').isFloat(),
  check('longitude', 'Longitude is required').isFloat(),
  check('radius', 'Radius is required').isFloat({ min: 0.1 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { latitude, longitude, radius = 5 } = req.query; // radius in kilometers

  try {
    // Find delivery agents with location and available status
    // Note: In a real app, this would use geospatial queries with MongoDB
    // For simplicity, we're just getting all available agents here
    const availableAgents = await User.find({
      roles: 'delivery',
      'deliveryInfo.isAvailable': true,
      'deliveryInfo.currentLocation': { $exists: true }
    }).select('name phone deliveryInfo');
    
    // Filter agents by distance (simplified calculation)
    // In a real app, use proper geospatial calculations
    const nearbyAgents = availableAgents.filter(agent => {
      if (!agent.deliveryInfo || !agent.deliveryInfo.currentLocation) {
        return false;
      }
      
      const agentLat = agent.deliveryInfo.currentLocation.latitude;
      const agentLng = agent.deliveryInfo.currentLocation.longitude;
      
      // Simple distance calculation (not accurate for large distances)
      const distance = calculateDistance(
        parseFloat(latitude), 
        parseFloat(longitude), 
        agentLat, 
        agentLng
      );
      
      // Add distance to agent object
      agent._doc.distance = distance;
      
      return distance <= parseFloat(radius);
    });
    
    // Sort by distance
    nearbyAgents.sort((a, b) => a._doc.distance - b._doc.distance);
    
    res.json(nearbyAgents);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/delivery/stats
// @desc    Get delivery agent stats
// @access  Private/Delivery
router.get('/stats', auth, checkRole(['delivery']), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Get completed deliveries count
    const completedDeliveries = await Order.countDocuments({
      deliveryAgent: req.user.id,
      deliveryStatus: 'delivered'
    });
    
    // Get in-progress deliveries count
    const inProgressDeliveries = await Order.countDocuments({
      deliveryAgent: req.user.id,
      deliveryStatus: { $in: ['assigned', 'picked_up', 'in_transit'] }
    });
    
    // Get failed deliveries count
    const failedDeliveries = await Order.countDocuments({
      deliveryAgent: req.user.id,
      deliveryStatus: 'failed'
    });
    
    // Get average rating
    const rating = user.deliveryInfo ? user.deliveryInfo.rating : 0;
    
    res.json({
      totalDeliveries: user.deliveryInfo ? user.deliveryInfo.totalDeliveries : 0,
      completedDeliveries,
      inProgressDeliveries,
      failedDeliveries,
      rating,
      isAvailable: user.deliveryInfo ? user.deliveryInfo.isAvailable : false
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Helper function to calculate distance between two points (simplified)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

module.exports = router;