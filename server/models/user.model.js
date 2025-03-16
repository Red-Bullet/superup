const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  roles: {
    type: [String],
    enum: ['buyer', 'seller', 'delivery', 'admin', 'customer_service'],
    default: ['buyer']
  },
  profileImage: {
    type: String,
    default: 'default-profile.jpg'
  },
  address: {
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
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Seller specific fields
  sellerInfo: {
    businessName: String,
    businessDescription: String,
    businessLogo: String,
    subscriptionStatus: {
      type: String,
      enum: ['trial', 'active', 'expired', 'cancelled'],
      default: 'trial'
    },
    subscriptionType: {
      type: String,
      enum: ['weekly', 'monthly', 'yearly', 'none'],
      default: 'none'
    },
    subscriptionStartDate: Date,
    subscriptionEndDate: Date,
    rating: {
      type: Number,
      default: 0
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  // Delivery agent specific fields
  deliveryInfo: {
    vehicleType: {
      type: String,
      enum: ['motorcycle', 'car', 'bicycle', 'foot', 'other']
    },
    vehiclePlate: String,
    idCardImage: String,
    isAvailable: {
      type: Boolean,
      default: false
    },
    currentLocation: {
      latitude: Number,
      longitude: Number
    },
    rating: {
      type: Number,
      default: 0
    },
    totalDeliveries: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

// Method to compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user has a specific role
userSchema.methods.hasRole = function(role) {
  return this.roles.includes(role);
};

const User = mongoose.model('User', userSchema);

module.exports = User;