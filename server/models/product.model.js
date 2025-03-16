const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'XOF'
  },
  images: {
    type: [String],
    default: ['default-product.jpg']
  },
  category: {
    type: String,
    required: true
  },
  subcategory: String,
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stock: {
    type: Number,
    required: true,
    min: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [String],
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    weight: Number,
    unit: {
      type: String,
      default: 'cm'
    }
  },
  attributes: {
    type: Map,
    of: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for text search
productSchema.index({ 
  name: 'text', 
  description: 'text', 
  category: 'text', 
  subcategory: 'text',
  tags: 'text'
});

// Method to update product rating
productSchema.methods.updateRating = function(newRating) {
  const currentTotalPoints = this.rating * this.totalReviews;
  this.totalReviews += 1;
  this.rating = (currentTotalPoints + newRating) / this.totalReviews;
  return this.save();
};

// Method to check if product is in stock
productSchema.methods.isInStock = function(quantity = 1) {
  return this.stock >= quantity && this.isAvailable;
};

// Method to reduce stock
productSchema.methods.reduceStock = function(quantity = 1) {
  if (!this.isInStock(quantity)) {
    throw new Error('Insufficient stock');
  }
  this.stock -= quantity;
  if (this.stock === 0) {
    this.isAvailable = false;
  }
  return this.save();
};

// Static method to find featured products
productSchema.statics.findFeatured = function(limit = 10) {
  return this.find({ isFeatured: true, isAvailable: true })
    .sort({ rating: -1 })
    .limit(limit)
    .populate('seller', 'name sellerInfo.businessName sellerInfo.rating');
};

// Static method to search products
productSchema.statics.searchProducts = function(query, options = {}) {
  const searchOptions = {
    limit: options.limit || 20,
    skip: options.skip || 0,
    sort: options.sort || { rating: -1 }
  };
  
  return this.find(
    { $text: { $search: query }, isAvailable: true },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' }, ...searchOptions.sort })
    .skip(searchOptions.skip)
    .limit(searchOptions.limit)
    .populate('seller', 'name sellerInfo.businessName sellerInfo.rating');
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;