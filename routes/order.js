import express from 'express';
import Order from '../models/Order.js';
import User from '../models/User.js'; // Needed to get address and clear cart
import { protect } from '../middleware/auth.js';
import { ObjectId } from 'mongodb';

const router = express.Router();

// POST /api/orders - Create new order
router.post('/', protect, async (req, res) => {
  const {
    orderItems, // Expecting array: [{ productId, category, name, price, quantity, image? }]
    shippingAddressId, // ID of the address selected
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice
  } = req.body;

  // --- Basic Validation ---
  if (!orderItems || orderItems.length === 0) {
    return res.status(400).json({ message: 'No order items' });
  }
  if (!shippingAddressId || !ObjectId.isValid(shippingAddressId)) {
     return res.status(400).json({ message: 'Valid Shipping Address ID is required' });
  }
   if (!paymentMethod) {
     return res.status(400).json({ message: 'Payment method is required' });
  }
   if (itemsPrice === undefined || totalPrice === undefined) {
     return res.status(400).json({ message: 'Items price and total price are required' });
  }
   // Validate each order item
   for (const item of orderItems) {
       if (!item.productId || !ObjectId.isValid(item.productId) || !item.category || !item.name || item.price === undefined || item.quantity === undefined) {
           return res.status(400).json({ message: `Invalid data for order item: ${JSON.stringify(item)}` });
       }
       if (!['product', 'accessory'].includes(item.category)) {
            return res.status(400).json({ message: `Invalid category '${item.category}' for order item: ${item.name}` });
       }
   }
   // --- End Validation ---

  try {
    // 1. Get User and the selected Shipping Address
    const user = await User.findById(req.userId);
    if (!user || !user.addresses) {
        return res.status(404).json({ message: 'User or user addresses not found' });
    }
    const shippingAddress = user.addresses.find(addr => addr._id.equals(new ObjectId(shippingAddressId)));
    if (!shippingAddress) {
        return res.status(400).json({ message: 'Selected shipping address not found for this user' });
    }
    // Prepare address for embedding (remove internal _id, isDefault)
    const { _id, isDefault, ...embeddedAddress } = shippingAddress;

    // 2. Prepare Order Data
    const orderData = {
      userId: req.userId,
      orderItems: orderItems.map(item => ({ // Ensure structure matches model
        productId: item.productId,
        category: item.category,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
        image: item.image
      })),
      shippingAddress: embeddedAddress,
      paymentMethod,
      itemsPrice: Number(itemsPrice),
      taxPrice: Number(taxPrice || 0),
      shippingPrice: Number(shippingPrice || 0),
      totalPrice: Number(totalPrice),
    };

    // 3. Create the Order
    const createdOrder = await Order.create(orderData);

    // 4. Clear the user's cart
    await User.clearCart(req.userId);

    res.status(201).json(createdOrder);

  } catch (error) {
    console.error('Error creating order:', error);
    // Check for specific errors if needed, e.g., validation errors from model
    res.status(500).json({ message: 'Server error creating order', details: error.message });
  }
});

// GET /api/orders/myorders - Get logged in user's orders
router.get('/myorders', protect, async (req, res) => {
  try {
    const orders = await Order.findByUserId(req.userId);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ message: 'Server error fetching orders', details: error.message });
  }
});

// GET /api/orders/:id - Get order by ID
router.get('/:id', protect, async (req, res) => {
  const { id } = req.params;
   if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid Order ID format' });
  }
  try {
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    // Ensure the order belongs to the logged-in user
    if (order.user.toString() !== req.userId) {
       // Complete the response for unauthorized access
       return res.status(403).json({ message: 'Not authorized to view this order' });
    }
    // If authorized, send the order details
    res.json(order);
  } catch (error) {
    console.error('Error fetching order by ID:', error);
    res.status(500).json({ message: 'Server error fetching order', details: error.message });
  }
});


// Add routes for updating order status (likely admin-only) later if needed

export default router; // Ensure the router is exported