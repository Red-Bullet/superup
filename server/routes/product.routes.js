const express = require('express');
const router = express.Router();
const Product = require('../models/product.model');
const User = require('../models/user.model');
const Subscription = require('../models/subscription.model');
const { auth, checkRole } = require('../middleware/auth.middleware');
const { check, validationResult } = require('express-validator');

// @route   POST api/products
// @desc    Create a product
// @access  Private/Seller
router.post('/', auth, checkRole(['seller']), [
  check('name', 'Name is required').not().isEmpty(),
  check('description', 'Description is required').not().isEmpty(),
  check('price', 'Price is required and must be a positive number').isFloat({ min: 0 }),
  check('category', 'Category is required').not().isEmpty(),
  check('stock', 'Stock is required and must be a positive number').isInt({ min: 0 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Check if seller has an active subscription
    const user = await User.findById(req.user.id);
    const subscription = await Subscription.findOne({ seller: req.user.id });
    
    if (!subscription || !subscription.isActive()) {
      // Allow if in free trial period
      if (!user.sellerInfo || 
          user.sellerInfo.subscriptionStatus !== 'trial' || 
          !user.sellerInfo.subscriptionEndDate || 
          new Date() > user.sellerInfo.subscriptionEndDate) {
        return res.status(403).json({ 
          msg: 'Active subscription required to create products. Please subscribe to a plan.' 
        });
      }
    }

    const {
      name,
      description,
      price,
      currency = 'XOF',
      images,
      category,
      subcategory,
      stock,
      dimensions,
      attributes,
      tags
    } = req.body;

    // Create new product
    const product = new Product({
      name,
      description,
      price,
      currency,
      images,
      category,
      subcategory,
      seller: req.user.id,
      stock,
      dimensions,
      attributes: attributes ? new Map(Object.entries(attributes)) : undefined,
      tags
    });

    await product.save();
    res.json(product);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/products
// @desc    Get all products
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      subcategory, 
      minPrice, 
      maxPrice, 
      sort = 'rating', 
      order = 'desc',
      limit = 20,
      page = 1
    } = req.query;

    // Build filter
    const filter = { isAvailable: true };
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    
    // Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Build sort options
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(filter)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip)
      .populate('seller', 'name sellerInfo.businessName sellerInfo.rating');

    // Get total count for pagination
    const total = await Product.countDocuments(filter);

    res.json({
      products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/products/search
// @desc    Search products
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20, page = 1 } = req.query;

    if (!q) {
      return res.status(400).json({ msg: 'Search query is required' });
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Use the static method for text search
    const products = await Product.searchProducts(q, {
      limit: parseInt(limit),
      skip
    });

    // Get total count for pagination (approximate for text search)
    const total = await Product.countDocuments({ 
      $text: { $search: q },
      isAvailable: true
    });

    res.json({
      products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/products/featured
// @desc    Get featured products
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const products = await Product.findFeatured(parseInt(limit));
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/products/seller
// @desc    Get current seller's products
// @access  Private/Seller
router.get('/seller', auth, checkRole(['seller']), async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user.id })
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/products/:id
// @desc    Get product by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name sellerInfo.businessName sellerInfo.rating');
    
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }
    
    res.json(product);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Product not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT api/products/:id
// @desc    Update a product
// @access  Private/Seller
router.put('/:id', auth, checkRole(['seller']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }
    
    // Check if product belongs to seller
    if (product.seller.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to update this product' });
    }
    
    const {
      name,
      description,
      price,
      currency,
      images,
      category,
      subcategory,
      stock,
      isAvailable,
      dimensions,
      attributes,
      tags
    } = req.body;
    
    // Update fields if provided
    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = price;
    if (currency) product.currency = currency;
    if (images) product.images = images;
    if (category) product.category = category;
    if (subcategory) product.subcategory = subcategory;
    if (stock !== undefined) {
      product.stock = stock;
      // Automatically update availability based on stock
      if (stock === 0) {
        product.isAvailable = false;
      }
    }
    if (isAvailable !== undefined) product.isAvailable = isAvailable;
    if (dimensions) product.dimensions = dimensions;
    if (attributes) product.attributes = new Map(Object.entries(attributes));
    if (tags) product.tags = tags;
    
    await product.save();
    res.json(product);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Product not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/products/:id
// @desc    Delete a product
// @access  Private/Seller
router.delete('/:id', auth, checkRole(['seller']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }
    
    // Check if product belongs to seller
    if (product.seller.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to delete this product' });
    }
    
    await product.remove();
    res.json({ msg: 'Product removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Product not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST api/products/:id/review
// @desc    Add a review to a product
// @access  Private/Buyer
router.post('/:id/review', auth, checkRole(['buyer']), [
  check('rating', 'Rating is required and must be between 1 and 5').isInt({ min: 1, max: 5 }),
  check('comment', 'Comment is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { rating, comment } = req.body;

  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }
    
    // Check if user already reviewed this product
    const alreadyReviewed = product.reviews.find(
      review => review.user.toString() === req.user.id
    );
    
    if (alreadyReviewed) {
      return res.status(400).json({ msg: 'Product already reviewed' });
    }
    
    // Add review
    const review = {
      user: req.user.id,
      rating: parseInt(rating),
      comment,
      createdAt: new Date()
    };
    
    product.reviews.push(review);
    
    // Update product rating
    await product.updateRating(parseInt(rating));
    
    res.json(product);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Product not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;