import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import connectDB from '../db.js';

// User collection operations
const User = {
  // Create a new user
  async create(userData) {
    // Call connectDB() with the 'Users' database name
    const database = await connectDB('Users');
    // Use 'users' (plural) collection
    const collection = database.collection('users');

    // Hash the password before storing
    const salt = await bcrypt.genSalt(10);
    userData.password = await bcrypt.hash(userData.password, salt);

    // Add creation timestamp
    userData.createdAt = new Date();
    // Add default empty arrays for cart, wishlist, orders if needed
    userData.cart = [];
    userData.wishlist = [];
    userData.orders = []; // Or reference IDs if using separate collections

    const result = await collection.insertOne(userData);
    // Return the inserted document's ID or the full document if needed later
    return { insertedId: result.insertedId };
  },

  // Find user by email
  async findByEmail(email) {
    // Call connectDB() with the 'Users' database name
    const database = await connectDB('Users');
    // Use 'users' (plural) collection
    const collection = database.collection('users');
    return await collection.findOne({ email });
  },

  // Find user by ID
  async findById(id) {
    // Call connectDB() with the 'Users' database name
    const database = await connectDB('Users');
    // Use 'users' (plural) collection
    const collection = database.collection('users');
    // Ensure the ID is converted to an ObjectId
    if (!ObjectId.isValid(id)) {
        return null; // Or throw an error, depending on desired behavior
    }
    // Exclude password field from being returned
    return await collection.findOne({ _id: new ObjectId(id) }, { projection: { password: 0 } });
  },

  // Update user by ID
  async updateById(id, updateData) {
    const database = await connectDB('Users');
    const collection = database.collection('users');
    if (!ObjectId.isValid(id)) {
      return null;
    }
    // Ensure password is not updated through this method
    delete updateData.password;
    // Ensure email is not updated through this method (or handle verification)
    delete updateData.email;
    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    return result;
  },

  // Validate password (doesn't need DB connection)
  async validatePassword(plainPassword, hashedPassword) {
    if (!hashedPassword) return false;
    return await bcrypt.compare(plainPassword, hashedPassword);
  },

  // --- Cart Methods ---

  // Add an item (with category) to the cart
  async addToCart(userId, itemId, itemCategory) {
    const database = await connectDB('Users');
    const collection = database.collection('users');
    if (!ObjectId.isValid(userId) || !ObjectId.isValid(itemId) || !itemCategory) {
      throw new Error('Invalid User ID, Item ID, or Category');
    }
    const cartItem = {
        itemId: new ObjectId(itemId),
        category: itemCategory // Store category ('product' or 'accessory')
    };
    // Use $addToSet to prevent duplicate items (based on both itemId and category)
    return await collection.updateOne(
      { _id: new ObjectId(userId) },
      { $addToSet: { cart: cartItem } }
    );
  },

  // Remove an item from the cart (needs itemId only, as it should be unique enough)
  async removeFromCart(userId, itemId) {
    const database = await connectDB('Users');
    const collection = database.collection('users');
    if (!ObjectId.isValid(userId) || !ObjectId.isValid(itemId)) {
      throw new Error('Invalid User ID or Item ID');
    }
    // Use $pull to remove the item based on its itemId
    return await collection.updateOne(
      { _id: new ObjectId(userId) },
      { $pull: { cart: { itemId: new ObjectId(itemId) } } }
    );
  },

  // Get cart items (returns array of {itemId, category})
  async getCart(userId) {
    const user = await this.findById(userId);
    return user ? user.cart || [] : [];
  },

  // Clear the cart (useful after placing an order)
  async clearCart(userId) {
      const database = await connectDB('Users');
      const collection = database.collection('users');
      if (!ObjectId.isValid(userId)) {
          throw new Error('Invalid User ID');
      }
      return await collection.updateOne(
          { _id: new ObjectId(userId) },
          { $set: { cart: [] } } // Set cart to an empty array
      );
  },


  // --- Wishlist Methods ---

  // Add an item (with category) to the wishlist
  async addToWishlist(userId, itemId, itemCategory) {
    const database = await connectDB('Users');
    const collection = database.collection('users');
     if (!ObjectId.isValid(userId) || !ObjectId.isValid(itemId) || !itemCategory) {
      throw new Error('Invalid User ID, Item ID, or Category');
    }
     const wishlistItem = {
        itemId: new ObjectId(itemId),
        category: itemCategory
    };
    // Use $addToSet to prevent duplicate items
    return await collection.updateOne(
      { _id: new ObjectId(userId) },
      { $addToSet: { wishlist: wishlistItem } }
    );
  },

  // Remove an item from the wishlist (needs itemId only)
  async removeFromWishlist(userId, itemId) {
    const database = await connectDB('Users');
    const collection = database.collection('users');
     if (!ObjectId.isValid(userId) || !ObjectId.isValid(itemId)) {
      throw new Error('Invalid User ID or Item ID');
    }
    // Use $pull to remove the item based on its itemId
    return await collection.updateOne(
      { _id: new ObjectId(userId) },
      { $pull: { wishlist: { itemId: new ObjectId(itemId) } } }
    );
  },

   // Get wishlist items (returns array of {itemId, category})
   async getWishlist(userId) {
    const user = await this.findById(userId);
    return user ? user.wishlist || [] : [];
  },

  // --- Address Methods ---

  // Get all addresses for a user
  async getAddresses(userId) {
    const user = await this.findById(userId);
    return user ? user.addresses || [] : [];
  },

  // Add a new address
  async addAddress(userId, addressData) {
    const database = await connectDB('Users');
    const collection = database.collection('users');
    if (!ObjectId.isValid(userId)) {
      throw new Error('Invalid User ID');
    }
    const newAddressId = new ObjectId();
    const newAddress = {
      _id: newAddressId,
      ...addressData,
      isDefault: false // Initialize as not default
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(userId) },
      { $push: { addresses: newAddress } }
    );

    // Check if it's the first address, if so, make it default
    const user = await collection.findOne({ _id: new ObjectId(userId) }, { projection: { addresses: 1 } });
    if (user && user.addresses && user.addresses.length === 1) {
      await this.setDefaultAddress(userId, newAddressId.toString());
      // Fetch the updated address to return it with isDefault=true
      const updatedUser = await this.findById(userId);
      return updatedUser.addresses.find(addr => addr._id.equals(newAddressId));
    }

    return newAddress; // Return the newly added address
  },

  // Update an existing address
  async updateAddress(userId, addressId, updateData) {
    const database = await connectDB('Users');
    const collection = database.collection('users');
    if (!ObjectId.isValid(userId) || !ObjectId.isValid(addressId)) {
      throw new Error('Invalid User ID or Address ID');
    }
    const updateFields = {};
    for (const key in updateData) {
      if (key !== '_id' && key !== 'isDefault') { // Prevent direct update of _id or isDefault here
        updateFields[`addresses.$.${key}`] = updateData[key];
      }
    }
    return await collection.updateOne(
      { _id: new ObjectId(userId), "addresses._id": new ObjectId(addressId) },
      { $set: updateFields }
    );
  },

  // Delete an address
  async deleteAddress(userId, addressId) {
    const database = await connectDB('Users');
    const collection = database.collection('users');
    if (!ObjectId.isValid(userId) || !ObjectId.isValid(addressId)) {
      throw new Error('Invalid User ID or Address ID');
    }
    return await collection.updateOne(
      { _id: new ObjectId(userId) },
      { $pull: { addresses: { _id: new ObjectId(addressId) } } }
    );
  },

  // Set an address as the default
  async setDefaultAddress(userId, addressId) {
    const database = await connectDB('Users');
    const collection = database.collection('users');
    if (!ObjectId.isValid(userId) || !ObjectId.isValid(addressId)) {
      throw new Error('Invalid User ID or Address ID');
    }
    // Step 1: Set all addresses isDefault to false
    await collection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { "addresses.$[].isDefault": false } }
    );
    // Step 2: Set the specified address isDefault to true
    return await collection.updateOne(
      { _id: new ObjectId(userId), "addresses._id": new ObjectId(addressId) },
      { $set: { "addresses.$.isDefault": true } }
    );
  }
};

export default User;