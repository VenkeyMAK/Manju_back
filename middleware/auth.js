import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Adjust path as needed

// Replace 'YOUR_SECRET_KEY' with your actual JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_DEFAULT_SECRET_KEY';

const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header (Bearer token)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Get user from the token (select -password to exclude)
      // We attach the user ID to the request object
      req.userId = decoded.id; // Assuming your JWT payload has 'id'

      // Optional: Fetch the full user object if needed downstream
      // req.user = await User.findById(decoded.id);
      // if (!req.user) {
      //   return res.status(401).json({ message: 'Not authorized, user not found' });
      // }

      next(); // Proceed to the next middleware or route handler
    } catch (error) {
      console.error('Token verification failed:', error);
      // Ensure response is sent ONLY ONCE per request path
      // Avoid calling next() after sending a response
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  // If token wasn't found in the header or wasn't processed successfully
  if (!token) {
    // Ensure response is sent ONLY ONCE per request path
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  // If the code reaches here without calling next() or sending a response,
  // it means the token was present but verification failed AND the catch block
  // didn't execute properly (which shouldn't happen with the return statement added).
  // However, as a safeguard, you might consider removing the second if(!token) check
  // if the logic inside the first if block correctly handles all scenarios (token present/absent/invalid).
  // For now, leaving it, but ensure the returns are in place.

};

// Ensure this export statement is present and correct
export { protect };