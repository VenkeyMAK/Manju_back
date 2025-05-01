import express from 'express';
import { ObjectId } from 'mongodb';
import connectDB from '../db.js';

const router = express.Router();

// Example: GET /api/accessories
router.get('/', async (req, res) => {
  try {
    // Provide the 'Products' database name
    const db = await connectDB('Products');
    // Ensure you are using the correct collection name for accessories
    const collection = db.collection('Accessories'); // Or whatever your accessories collection is named

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get search term
    const searchTerm = req.query.search ? req.query.search.toString() : '';
    
    // Build query filter
    let queryFilter = {};
    if (searchTerm) {
      const regex = { $regex: searchTerm, $options: 'i' };
      queryFilter = {
        $or: [
          { name: regex },
          { brand: regex },
          { category: regex },
          { description: regex }
        ]
      };
    }
    
    // Log the query being executed
    console.log('Executing query with filter:', queryFilter);
    
    // Get total count
    const totalCount = await collection.countDocuments(queryFilter);
    console.log('Total matching accessories:', totalCount);
    
    // Get paginated results
    const accessories = await collection.find(queryFilter)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    console.log(`Found ${accessories.length} accessories for page ${page}`);
    
    // Log the first item's structure if any exists
    if (accessories.length > 0) {
      console.log('Sample accessory structure:', {
        id: accessories[0].id,
        acc_id: accessories[0].acc_id,
        _id: accessories[0]._id,
        name: accessories[0].name
      });
    }
    
    res.json({
      accessories,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    });

  } catch (err) {
    console.error('Error fetching accessories:', err);
    res.status(500).json({
      error: 'Failed to fetch accessories',
      details: err.message
    });
  }
});

// Example: GET /api/accessories/:id
router.get('/:id', async (req, res) => {
  try {
    // Provide the 'Products' database name
    const db = await connectDB('Products');
    // Ensure you are using the correct collection name for accessories
    const collection = db.collection('accessories'); // Or whatever your accessories collection is named
    const accessoryId = req.params.id;

    if (!ObjectId.isValid(accessoryId)) {
      return res.status(400).json({ error: 'Invalid accessory ID' });
    }

    const accessory = await collection.findOne({ _id: new ObjectId(accessoryId) });

    if (!accessory) {
      return res.status(404).json({ error: 'Accessory not found' });
    }
    res.json(accessory);
  } catch (err) {
    console.error('Error fetching accessory:', err);
    res.status(500).json({ error: 'Failed to fetch accessory', details: err.message });
  }
});

export default router;