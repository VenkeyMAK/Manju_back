import { ObjectId } from 'mongodb';
import connectDB from '../db.js';

// Order collection operations
const Order = {
  // Create a new order
  async create(orderData) {
    const database = await connectDB('Orders');
    const collection = database.collection('orders');

    const newOrder = {
      user: new ObjectId(orderData.userId), // Link to User ID
      orderItems: orderData.orderItems.map(item => ({
          productId: new ObjectId(item.productId), // Link to Product/Accessory ID
          category: item.category, // Store category ('product' or 'accessory')
          name: item.name,         // Store name at time of order
          price: item.price,       // Store price at time of order
          quantity: item.quantity,
          image: item.image || null // Store image URL at time of order (optional)
      })),
      shippingAddress: orderData.shippingAddress, // Embed the address used for this order
      paymentMethod: orderData.paymentMethod,
      itemsPrice: orderData.itemsPrice,
      taxPrice: orderData.taxPrice || 0,
      shippingPrice: orderData.shippingPrice || 0,
      totalPrice: orderData.totalPrice,
      status: 'Processing', // Initial status
      paidAt: null,
      deliveredAt: null,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(newOrder);
    return { ...newOrder, _id: result.insertedId }; // Return the created order with its ID
  },

  // Find order by ID
  async findById(orderId) {
    const database = await connectDB('Orders');
    const collection = database.collection('orders');
    if (!ObjectId.isValid(orderId)) {
      return null;
    }
    return await collection.findOne({ _id: new ObjectId(orderId) });
  },

  // Find all orders for a specific user
  async findByUserId(userId) {
    const database = await connectDB('Orders');
    const collection = database.collection('orders');
    if (!ObjectId.isValid(userId)) {
      return [];
    }
    return await collection.find({ user: new ObjectId(userId) })
                           .sort({ createdAt: -1 }) // Show newest first
                           .toArray();
  },

  // Update order status (Example - could be expanded)
  async updateStatus(orderId, status) {
    const database = await connectDB('Orders');
    const collection = database.collection('orders');
     if (!ObjectId.isValid(orderId)) {
      throw new Error('Invalid Order ID');
    }
    const updateData = { status };
    if (status === 'Delivered') {
        updateData.deliveredAt = new Date();
    }
    // Add logic for 'Paid' status if needed
    return await collection.updateOne(
        { _id: new ObjectId(orderId) },
        { $set: updateData }
    );
  }
};

export default Order;