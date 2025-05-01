import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = 'your-secret-key'; // In production, use environment variables

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email and password' });
    }
    
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Create new user
    const userData = {
      name,
      email,
      password,
      phone: phone || '',
      role: 'customer' // Default role
    };
    
    const result = await User.create(userData);
    
    // Return success without sending password
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: result.insertedId,
        name,
        email,
        phone: phone || ''
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// logout

router.post('/logout', async (req, res) => {
  try {
    // Simple logout - just return success
    // Client side will remove the token
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
});


// Login user
router.post('/login', async (req, res) => {
  console.log('Login attempt received:', req.body.email); // Log entry point
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('Login validation failed: Missing email or password');
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user by email
    console.log(`Attempting to find user by email: ${email}`);
    const user = await User.findByEmail(email);
    // Log user details (excluding password hash for security)
    console.log('User found:', user ? { id: user._id, email: user.email, name: user.name, hasPassword: !!user.password } : 'No user found');

    if (!user) {
      console.log('Login failed: User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Validate password
    console.log(`Validating password for user: ${user.email}`);
    // Ensure user.password exists before comparing
    if (!user.password) {
        console.error(`Login error: User ${user.email} has no password hash stored.`);
        // Send a specific error status/message if the user record is incomplete
        return res.status(500).json({ message: 'Server error: User data incomplete.' });
    }
    const isPasswordValid = await User.validatePassword(password, user.password);
    console.log(`Password validation result for ${user.email}: ${isPasswordValid}`);

    if (!isPasswordValid) {
      console.log('Login failed: Invalid password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    console.log(`Generating JWT for user: ${user.email}`);
    const tokenPayload = { id: user._id, email: user.email, role: user.role };
    const token = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    console.log(`JWT generated successfully for ${user.email}`);

    // Return user info and token
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    // Log the specific error that occurred before sending the generic 500 response
    console.error('Login error caught in /api/auth/login:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

export default router;