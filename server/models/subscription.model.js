const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  plan: {
    type: String,
    enum: ['free_trial', 'weekly', 'monthly', 'yearly'],
    default: 'free_trial'
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'pending'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  autoRenew: {
    type: Boolean,
    default: false
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'XOF'
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
  renewalHistory: [{
    plan: String,
    startDate: Date,
    endDate: Date,
    price: Number,
    paymentMethod: String,
    transactionId: String,
    status: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate end date based on plan before saving
subscriptionSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('plan')) {
    const currentDate = new Date();
    
    switch (this.plan) {
      case 'free_trial':
        // 2-month free trial
        this.endDate = new Date(currentDate.setMonth(currentDate.getMonth() + 2));
        this.price = 0;
        break;
      case 'weekly':
        this.endDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
        this.price = 2000; // Example price in XOF
        break;
      case 'monthly':
        this.endDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
        this.price = 7500; // Example price in XOF
        break;
      case 'yearly':
        this.endDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1));
        this.price = 75000; // Example price in XOF
        break;
      default:
        break;
    }
  }
  next();
});

// Method to check if subscription is active
subscriptionSchema.methods.isActive = function() {
  return this.status === 'active' && new Date() <= this.endDate;
};

// Method to renew subscription
subscriptionSchema.methods.renew = function(paymentDetails) {
  // Add current subscription to history
  this.renewalHistory.push({
    plan: this.plan,
    startDate: this.startDate,
    endDate: this.endDate,
    price: this.price,
    paymentMethod: this.paymentMethod,
    transactionId: this.paymentDetails?.transactionId,
    status: this.status
  });
  
  // Update current subscription
  const currentDate = new Date();
  this.startDate = currentDate;
  this.status = 'active';
  
  // Update payment details
  if (paymentDetails) {
    this.paymentMethod = paymentDetails.paymentMethod || this.paymentMethod;
    this.paymentDetails = {
      transactionId: paymentDetails.transactionId,
      paymentDate: currentDate,
      provider: paymentDetails.provider
    };
  }
  
  // Calculate new end date based on plan
  switch (this.plan) {
    case 'weekly':
      this.endDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
      break;
    case 'monthly':
      this.endDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
      break;
    case 'yearly':
      this.endDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1));
      break;
    default:
      break;
  }
  
  return this.save();
};

// Method to upgrade/downgrade plan
subscriptionSchema.methods.changePlan = function(newPlan, paymentDetails) {
  this.plan = newPlan;
  
  // Add current subscription to history
  this.renewalHistory.push({
    plan: this.plan,
    startDate: this.startDate,
    endDate: this.endDate,
    price: this.price,
    paymentMethod: this.paymentMethod,
    transactionId: this.paymentDetails?.transactionId,
    status: this.status
  });
  
  // Update current subscription
  const currentDate = new Date();
  this.startDate = currentDate;
  this.status = 'active';
  
  // Update payment details
  if (paymentDetails) {
    this.paymentMethod = paymentDetails.paymentMethod || this.paymentMethod;
    this.paymentDetails = {
      transactionId: paymentDetails.transactionId,
      paymentDate: currentDate,
      provider: paymentDetails.provider
    };
  }
  
  return this.save();
};

// Static method to find expiring subscriptions
subscriptionSchema.statics.findExpiring = function(daysThreshold = 7) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  return this.find({
    status: 'active',
    endDate: { $lte: thresholdDate, $gt: new Date() }
  }).populate('seller', 'name email phone');
};

// Static method to find expired subscriptions
subscriptionSchema.statics.findExpired = function() {
  return this.find({
    status: 'active',
    endDate: { $lt: new Date() }
  }).populate('seller', 'name email phone');
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;