import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://venkatesh:MAKpass@cluster0.nh7iqso.mongodb.net';
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000, // 5 second timeout
  maxPoolSize: 10,
  connectTimeoutMS: 10000, // 10 seconds connection timeout
  socketTimeoutMS: 45000, // 45 seconds socket timeout
});

// Flag to track if the initial connection attempt has been made and succeeded
let isConnected = false;

// Function to ensure the client is connected only once
async function ensureClientConnected() {
  // If already connected, return the client immediately
  if (isConnected && client.topology && client.topology.isConnected()) {
    return client;
  }

  // If not connected, attempt to connect
  try {
    console.log('Attempting to connect MongoDB client...');
    await client.connect();
    isConnected = true;
    console.log('MongoDB client successfully connected');

    // Add a listener for connection closing to update the flag
    client.once('close', () => {
      console.log('MongoDB client connection closed.');
      isConnected = false; // Reset flag if connection closes
    });

    return client;
  } catch (err) {
    console.error('MongoDB client connection error:', err);
    isConnected = false; // Ensure flag is false on error
    // Rethrow the error to be handled by the caller
    throw new Error(`MongoDB client connection failed: ${err.message}`);
  }
}

// Modified connectDB to return a specific database instance based on name
async function connectDB(dbName) {
  // Ensure a database name is provided
  if (!dbName) {
    console.error("Database name must be provided to connectDB.");
    throw new Error("Database name must be provided to connectDB.");
  }

  try {
    // Ensure the client is connected
    const connectedClient = await ensureClientConnected();
    // Get the specific database instance
    const db = connectedClient.db(dbName);

    // Optional: Ping the specific database to verify it's accessible
    // This adds a small overhead but confirms the DB connection
    await db.command({ ping: 1 });
    console.log(`Connection to database '${dbName}' verified.`);

    // Return the specific database instance
    return db;
  } catch (err) {
    // Log the error with context
    console.error(`Error getting or verifying database instance for '${dbName}':`, err);
    // Don't close the client here, let the SIGINT handler do that on shutdown
    // Rethrow a more specific error
    throw new Error(`Failed to get or verify database instance '${dbName}': ${err.message}`);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  // Check if the client exists and might be connected
  if (client && isConnected) {
    console.log('SIGINT received. Closing MongoDB client connection...');
    try {
      await client.close();
      console.log('MongoDB client connection closed successfully.');
    } catch (closeErr) {
      console.error('Error closing MongoDB client connection:', closeErr);
    } finally {
      isConnected = false;
    }
  } else {
    console.log('SIGINT received. MongoDB client was not connected or does not exist.');
  }
  process.exit(0);
});

// Export the function that returns a specific DB instance
export default connectDB;