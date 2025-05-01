import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { ObjectId } from 'mongodb';

const router = express.Router();

// --- Profile Routes ---
// GET /profile - Get user profile
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.userId); // findById excludes password
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
});

// PUT /profile - Update user profile
router.put('/profile', protect, async (req, res) => {
    // Only allow updating specific fields
    const { name, firstName, lastName, phone } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    // Add other updatable fields as needed, but exclude email, password, role etc.

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No valid fields provided for update' });
    }
    updateData.updatedAt = new Date(); // Add timestamp for update

    try {
        const result = await User.updateById(req.userId, updateData);
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        const updatedUser = await User.findById(req.userId); // Fetch updated user data
        res.json(updatedUser);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
});


// --- Cart Routes ---

// GET /cart - Get user's cart items
router.get('/cart', protect, async (req, res) => {
  try {
    const cartItems = await User.getCart(req.userId);
    res.json(cartItems); // Returns array of {itemId, category}
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Server error fetching cart', details: error.message });
  }
});

// POST /cart - Add item to cart
router.post('/cart', protect, async (req, res) => {
  const { itemId, category } = req.body; // Expect itemId and category
  if (!itemId || !ObjectId.isValid(itemId) || !category || !['product', 'accessory'].includes(category)) {
    return res.status(400).json({ message: 'Valid Item ID and Category (\'product\' or \'accessory\') are required' });
  }
  try {
    const result = await User.addToCart(req.userId, itemId, category);
    if (result.modifiedCount > 0 || result.matchedCount > 0) {
       res.status(200).json({ message: 'Item added to cart (or already exists)' });
    } else {
       res.status(404).json({ message: 'User not found or failed to add item' });
    }
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ message: 'Server error adding to cart', details: error.message });
  }
});

// DELETE /cart/:itemId - Remove item from cart
router.delete('/cart/:itemId', protect, async (req, res) => {
  const { itemId } = req.params;
   if (!itemId || !ObjectId.isValid(itemId)) {
    return res.status(400).json({ message: 'Valid Item ID is required in URL parameter' });
  }
  try {
    const result = await User.removeFromCart(req.userId, itemId);
     if (result.modifiedCount > 0) {
       res.status(200).json({ message: 'Item removed from cart' });
    } else if (result.matchedCount > 0) {
        res.status(200).json({ message: 'Item was not in the cart' });
    }
    else {
       res.status(404).json({ message: 'User not found or item not removed' });
    }
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ message: 'Server error removing from cart', details: error.message });
  }
});


// --- Wishlist Routes ---

// GET /wishlist - Get user's wishlist items
router.get('/wishlist', protect, async (req, res) => {
  try {
    const wishlistItems = await User.getWishlist(req.userId);
    res.json(wishlistItems); // Returns array of {itemId, category}
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ message: 'Server error fetching wishlist', details: error.message });
  }
});

// POST /wishlist - Add item to wishlist
router.post('/wishlist', protect, async (req, res) => {
  const { itemId, category } = req.body; // Expect itemId and category
   if (!itemId || !ObjectId.isValid(itemId) || !category || !['product', 'accessory'].includes(category)) {
    return res.status(400).json({ message: 'Valid Item ID and Category (\'product\' or \'accessory\') are required' });
  }
  try {
    const result = await User.addToWishlist(req.userId, itemId, category);
    if (result.modifiedCount > 0 || result.matchedCount > 0) {
       res.status(200).json({ message: 'Item added to wishlist (or already exists)' });
    } else {
       res.status(404).json({ message: 'User not found or failed to add item' });
    }
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ message: 'Server error adding to wishlist', details: error.message });
  }
});

// DELETE /wishlist/:itemId - Remove item from wishlist
router.delete('/wishlist/:itemId', protect, async (req, res) => {
  const { itemId } = req.params;
   if (!itemId || !ObjectId.isValid(itemId)) {
    return res.status(400).json({ message: 'Valid Item ID is required in URL parameter' });
  }
  try {
    const result = await User.removeFromWishlist(req.userId, itemId);
    if (result.modifiedCount > 0) {
       res.status(200).json({ message: 'Item removed from wishlist' });
    } else if (result.matchedCount > 0) {
        res.status(200).json({ message: 'Item was not in the wishlist' });
    }
     else {
       res.status(404).json({ message: 'User not found or item not removed' });
    }
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ message: 'Server error removing from wishlist', details: error.message });
  }
});


// --- Address Routes ---

// GET /addresses - Get all addresses
router.get('/addresses', protect, async (req, res) => {
  try {
    const addresses = await User.getAddresses(req.userId);
    res.json(addresses);
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ message: 'Server error fetching addresses', details: error.message });
  }
});

// POST /addresses - Add a new address
router.post('/addresses', protect, async (req, res) => {
  const { type, name, street, city, state, zip, country, phone } = req.body;
  if (!type || !name || !street || !city || !state || !zip || !country || !phone) {
    return res.status(400).json({ message: 'All address fields are required' });
  }
  try {
    const newAddress = await User.addAddress(req.userId, req.body);
    res.status(201).json(newAddress);
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ message: 'Server error adding address', details: error.message });
  }
});

// PUT /addresses/:addressId - Update an address
router.put('/addresses/:addressId', protect, async (req, res) => {
  const { addressId } = req.params;
  if (!ObjectId.isValid(addressId)) {
    return res.status(400).json({ message: 'Invalid Address ID format' });
  }
  const { _id, isDefault, ...updateData } = req.body; // Exclude _id and isDefault
  if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No fields provided for update.' });
  }
  try {
    const result = await User.updateAddress(req.userId, addressId, updateData);
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Address not found or does not belong to user' });
    }
    if (result.modifiedCount === 0 && result.matchedCount > 0) {
        return res.status(200).json({ message: 'Address data unchanged.' });
    }
    const updatedAddresses = await User.getAddresses(req.userId); // Fetch updated list
    const updatedAddress = updatedAddresses.find(addr => addr._id.equals(new ObjectId(addressId)));
    res.json(updatedAddress || { message: 'Address updated successfully' });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ message: 'Server error updating address', details: error.message });
  }
});

// DELETE /addresses/:addressId - Delete an address
router.delete('/addresses/:addressId', protect, async (req, res) => {
  const { addressId } = req.params;
  if (!ObjectId.isValid(addressId)) {
    return res.status(400).json({ message: 'Invalid Address ID format' });
  }
  try {
    const result = await User.deleteAddress(req.userId, addressId);
    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Address not found or does not belong to user' });
    }
    res.status(200).json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ message: 'Server error deleting address', details: error.message });
  }
});

// PUT /addresses/default/:addressId - Set default address
router.put('/addresses/default/:addressId', protect, async (req, res) => {
  const { addressId } = req.params;
  if (!ObjectId.isValid(addressId)) {
    return res.status(400).json({ message: 'Invalid Address ID format' });
  }
  try {
    const result = await User.setDefaultAddress(req.userId, addressId);
     if (result.matchedCount === 0) { // Check matchedCount as setting default might not modify if already default or address not found
      return res.status(404).json({ message: 'Address not found or does not belong to user' });
    }
    res.status(200).json({ message: 'Default address updated successfully' });
  } catch (error) {
    console.error('Error setting default address:', error);
    res.status(500).json({ message: 'Server error setting default address', details: error.message });
  }
});


export default router;