const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  subtotal: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  platformFee: {
    type: Number,
    default: 1200, // Fixed 1200 XOF platform fee
    required: true
  },
  deliveryFee: {
    type: Number,
    default: 1000, // 1000 XOF to delivery agent
    required: true
  },
  adminFee: {
    type: Number,
    default: 200, // 200 XOF to admin
    required: true
  },
  currency: {
    type: String,
    default: 'XOF'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'released', 'refunded', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['wallet', 'mobile_money', 'credit_card', 'bank_transfer'],
    default: 'wallet'
  },
  paymentDetails: {
    transactionId: String,
    paymentDate: Date,
    provider: String
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  deliveryAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed'],
    default: 'pending'
  },
  deliveryNotes: String,
  deliveryProof: {
    signature: String,
    photo: String,
    deliveryDate: Date,
    notes: String
  },
  estimatedDeliveryDate: Date,
  actualDeliveryDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate total amount before saving
orderSchema.pre('save', function(next) {
  if (this.isModified('items')) {
    let total = 0;
    this.items.forEach(item => {
      total += item.subtotal;
    });
    this.totalAmount = total + this.platformFee;
  }
  next();
});

// Method to assign delivery agent
orderSchema.methods.assignDeliveryAgent = function(agentId) {
  this.deliveryAgent = agentId;
  this.deliveryStatus = 'assigned';
  return this.save();
};

// Method to update order status
orderSchema.methods.updateStatus = function(status) {
  this.status = status;
  
  // Update payment status based on order status
  if (status === 'delivered') {
    this.paymentStatus = 'released';
    this.actualDeliveryDate = new Date();
  } else if (status === 'cancelled') {
    this.paymentStatus = 'refunded';
  }
  
  return this.save();
};

// Method to update delivery status
orderSchema.methods.updateDeliveryStatus = function(status, proof = {}) {
  this.deliveryStatus = status;
  
  if (status === 'delivered') {
    this.deliveryProof = {
      ...this.deliveryProof,
      ...proof,
      deliveryDate: new Date()
    };
    this.status = 'delivered';
    this.paymentStatus = 'released';
  }
  
  return this.save();
};

// Static method to find orders by buyer
orderSchema.statics.findByBuyer = function(buyerId) {
  return this.find({ buyer: buyerId })
    .sort({ createdAt: -1 })
    .populate('items.product')
    .populate('deliveryAgent', 'name phone deliveryInfo');
};

// Static method to find orders by delivery agent
orderSchema.statics.findByDeliveryAgent = function(agentId) {
  return this.find({ deliveryAgent: agentId })
    .sort({ createdAt: -1 })
    .populate('items.product')
    .populate('buyer', 'name phone address');
};

// Static method to find orders that need delivery agents
orderSchema.statics.findPendingDelivery = function() {
  return this.find({ 
    status: 'processing', 
    deliveryStatus: 'pending',
    deliveryAgent: { $exists: false }
  })
    .sort({ createdAt: 1 })
    .populate('buyer', 'address');
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;