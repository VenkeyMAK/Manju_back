import express from 'express';
import { ObjectId } from 'mongodb';
import connectDB from '../db.js';

const router = express.Router();

// GET /api/products/search?q=ap
router.get('/search', async (req, res) => {
  try {
    // Provide the 'Products' database name
    const db = await connectDB('Products');
    const collection = db.collection('Products'); // Note: collection name in lowercase
    const q = req.query.q || '';
    const products = await collection.find({
      name: { $regex: q, $options: 'i' }
    }).toArray();
    res.json(products);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search products', details: err.message });
  }
});

// GET /api/products (Get all products)
router.get('/', async (req, res) => {
  try {
    // Provide the 'Products' database name
    const db = await connectDB('Products');
    const collection = db.collection('Products'); // Note: collection name in lowercase
    
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Get search term
    const searchTerm = req.query.search ? req.query.search.toString() : '';
    
    // Build the MongoDB query filter
    let queryFilter = {};
    if (searchTerm) {
      const regex = { $regex: searchTerm, $options: 'i' };
      queryFilter = {
        $or: [
          { "Model Name": regex },
          { "Company Name": regex },
          { "RAM": regex },
          { "Processor": regex }
        ]
      };
    }
    
    // Get total count of products matching the filter
    const totalCount = await collection.countDocuments(queryFilter);
    
    // Get paginated products matching the filter
    const products = await collection.find(queryFilter)
      .skip(skip)
      .limit(limit)
      .toArray();

    // Transform the data to match the expected format
    const transformedProducts = products.map(product => ({
      _id: product._id,
      "Company Name": product["Company Name"] || product.companyName || "",
      "Model Name": product["Model Name"] || product.modelName || "",
      "Mobile Weight": product["Mobile Weight"] || product.mobileWeight || "",
      "RAM": product["RAM"] || product.ram || "",
      "Front Camera": product["Front Camera"] || product.frontCamera || "",
      "Back Camera": product["Back Camera"] || product.backCamera || "",
      "Processor": product["Processor"] || product.processor || "",
      "Battery Capacity": product["Battery Capacity"] || product.batteryCapacity || "",
      "Screen Size": product["Screen Size"] || product.screenSize || "",
      "Launched Price (Pakistan)": product["Launched Price (Pakistan)"] || product.launchedPricePakistan || "",
      "Launched Price (India)": product["Launched Price (India)"] || product.launchedPriceIndia || "",
      "Launched Price (China)": product["Launched Price (China)"] || product.launchedPriceChina || "",
      "Launched Price (USA)": product["Launched Price (USA)"] || product.launchedPriceUSA || "",
      "Launched Price (Dubai)": product["Launched Price (Dubai)"] || product.launchedPriceDubai || "",
      "Launched Year": product["Launched Year"] || product.launchedYear || "",
      "Image URL": product["Image URL"] || product.imageUrl || ""
    }));
    
    // Return response with transformed data
    res.json({
      products: transformedProducts,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ 
      error: 'Failed to fetch products',
      details: err.message 
    });
  }
});

// GET /api/products/:id (Get a single product by ID)
router.get('/:id', async (req, res) => {
  try {
    // Provide the 'Products' database name
    const db = await connectDB('Products');
    const collection = db.collection('products'); // Note: collection name in lowercase
    const productId = req.params.id;

    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await collection.findOne({ _id: new ObjectId(productId) });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Failed to fetch product', details: err.message });
  }
});

// POST /api/products (Create a new product)
router.post('/', async (req, res) => {
  try {
    // Provide the 'Products' database name
    const db = await connectDB('Products');
    const collection = db.collection('products');
    const newProduct = req.body;

    // Basic validation (you should expand this)
    if (!newProduct.name || !newProduct.price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const result = await collection.insertOne(newProduct);
    res.status(201).json({ message: 'Product created', insertedId: result.insertedId });
  } catch (err) {
    console.error('Error creating product', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id (Update an existing product)
router.put('/:id', async (req, res) => {
  try {
    // Provide the 'Products' database name
    const db = await connectDB('Products');
    const collection = db.collection('products');
    const productId = req.params.id;

    // Check if the ID is a valid ObjectId
    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    const updatedProduct = req.body;

    // Basic validation (you should expand this)
    if (!updatedProduct.name || !updatedProduct.price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(productId) },
      { $set: updatedProduct }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product updated', modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error('Error updating product', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id (Delete a product)
router.delete('/:id', async (req, res) => {
  try {
    // Provide the 'Products' database name
    const db = await connectDB('Products');
    const collection = db.collection('products');
    const productId = req.params.id;

    // Check if the ID is a valid ObjectId
    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const result = await collection.deleteOne({ _id: new ObjectId(productId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted', deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Error deleting product', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;