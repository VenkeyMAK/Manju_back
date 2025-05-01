import express from 'express';
import cors from 'cors';
import productRoutes from './routes/product.js';
import connectDB from './db.js'; // Ensure the import name matches what's used below
import filterRoutes from './routes/filters.js';
import authRoutes from './routes/auth.js';// Changed from require to import
import accessoriesRoutes from './routes/accessories.js';
// Import the new user routes
import userRoutes from './routes/user.js';
// Import the new order routes
import orderRoutes from './routes/order.js'; // Add this line
// Remove Accessory model imports if not used directly here
// import Accessory from './models/Accessory.js';
// import './models/Accessory.js';

const app = express();

// Configure CORS
app.use(cors({
  // origin: ['http://localhost:5173', 'http://localhost:8080', '**'], // Allow both ports
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  // Ensure Authorization header is allowed for protected routes
  allowedHeaders: ['Content-Type', 'Authorization'] // Make sure Authorization is here
}));

app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    message: 'Something went wrong on the server!',
    // Provide error details only in development
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});


// Mount routes
app.use('/api/products', productRoutes);
app.use('/api/accessories', accessoriesRoutes);
app.use('/api/filters', filterRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes); // Handles profile, cart, wishlist, addresses
app.use('/api/orders', orderRoutes); // Add this line to mount order routes

// Basic route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Database connection and server start
const startServer = async () => {
  try {
    // No need to connect here if connectDB handles connection pooling per request
    // await connectDB(); // Remove initial connection if handled per-request
    console.log('Database connection managed per request.');

    // Change the port from 8080 to 5000 (or another available port)
    const PORT = process.env.PORT || 5000; // Changed to 5000
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); // Log the correct port
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1); // Exit process with failure
  }
};

startServer(); // Call the function to start the server