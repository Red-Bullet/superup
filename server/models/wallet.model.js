const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'payment', 'refund', 'commission', 'fee'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'XOF'
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  reference: {
    type: String,
    required: true,
    unique: true
  },
  relatedOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  paymentMethod: {
    type: String,
    enum: ['mobile_money', 'credit_card', 'bank_transfer', 'internal'],
    default: 'internal'
  },
  paymentDetails: {
    provider: String,
    transactionId: String,
    accountNumber: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const walletSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  walletType: {
    type: String,
    enum: ['buyer', 'seller', 'delivery', 'admin'],
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'XOF'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  transactions: [transactionSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Method to add a transaction to the wallet
walletSchema.methods.addTransaction = async function(transactionData) {
  this.transactions.push(transactionData);
  
  // Update wallet balance based on transaction type
  if (['deposit', 'refund', 'commission'].includes(transactionData.type)) {
    this.balance += transactionData.amount;
  } else if (['withdrawal', 'payment', 'fee'].includes(transactionData.type)) {
    this.balance -= transactionData.amount;
  }
  
  return this.save();
};

// Method to check if wallet has sufficient balance
walletSchema.methods.hasSufficientBalance = function(amount) {
  return this.balance >= amount;
};

// Static method to find wallet by owner and type
walletSchema.statics.findByOwnerAndType = function(ownerId, walletType) {
  return this.findOne({ owner: ownerId, walletType });
};

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;