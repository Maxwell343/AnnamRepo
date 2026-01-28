import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';
import fs from 'fs';

const app = express();
const PORT = 5000;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
let db;

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database('./annam.db', (err) => {
      if (err) {
        reject(err);
      } else {
        // Create users table if it doesn't exist
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('farmer', 'ngo', 'driver')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            // Create listings table
            db.run(`
              CREATE TABLE IF NOT EXISTS listings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                farmer_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                quantity TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('Vegetable', 'Fruit', 'Grain', 'Other')),
                expiry TEXT NOT NULL,
                description TEXT,
                image LONGTEXT,
                location TEXT,
                latitude REAL,
                longitude REAL,
                status TEXT DEFAULT 'available',
                assigned_driver INTEGER,
                claimed_by INTEGER,
                claimed_quantity TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (farmer_id) REFERENCES users(id)
              )
            `, (err) => {
              if (err) {
                reject(err);
              } else {
                // Add location columns to existing listings table if they don't exist
                db.run(`ALTER TABLE listings ADD COLUMN location TEXT`, (err) => {
                  // Ignore error if column already exists
                  db.run(`ALTER TABLE listings ADD COLUMN latitude REAL`, (err) => {
                    // Ignore error if column already exists
                    db.run(`ALTER TABLE listings ADD COLUMN longitude REAL`, (err) => {
                      // Ignore error if column already exists
                      console.log('Database initialized with users and listings tables');
                      resolve();
                    });
                  });
                });
              }
            });
          }
        });
      }
    });
  });
}

// Routes

// Helper function to promisify db.get
function dbGet(query, params) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Helper function to promisify db.run
function dbRun(query, params) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Helper function to promisify db.all
function dbAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

// SIGNUP
app.post('/api/signup', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Validation
    if (!email || !password || !name || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await dbRun(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );

    res.status(201).json({
      message: 'Account created successfully! Please login.',
      user: {
        id: result.lastID,
        name,
        email,
        role
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// LOGIN
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// CREATE LISTING
app.post('/api/listings', async (req, res) => {
  try {
    const { farmer_id, title, quantity, type, expiry, description, image, location } = req.body;

    // Validation
    if (!farmer_id || !title || !quantity || !type || !expiry || !location) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Parse location string to get latitude and longitude
    let latitude = null;
    let longitude = null;
    
    // Try to parse location as "lat, lng"
    const coordMatch = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      latitude = parseFloat(coordMatch[1]);
      longitude = parseFloat(coordMatch[2]);
    }

    // Insert listing
    const result = await dbRun(
      'INSERT INTO listings (farmer_id, title, quantity, type, expiry, description, image, location, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [farmer_id, title, quantity, type, expiry, description || '', image || '', location, latitude, longitude]
    );

    res.status(201).json({
      message: 'Listing created successfully',
      listing: {
        id: result.lastID,
        farmer_id,
        title,
        quantity,
        type,
        expiry,
        description,
        image,
        location,
        latitude,
        longitude
      }
    });
  } catch (err) {
    console.error('Create listing error:', err);
    res.status(500).json({ message: 'Server error creating listing' });
  }
});

// GET ALL LISTINGS
app.get('/api/listings', async (req, res) => {
  try {
    const listings = await dbAll('SELECT * FROM listings ORDER BY created_at DESC');
    res.status(200).json({
      message: 'Listings retrieved successfully',
      listings
    });
  } catch (err) {
    console.error('Get listings error:', err);
    res.status(500).json({ message: 'Server error retrieving listings' });
  }
});

// CLAIM LISTING (Reduce Quantity)
app.post('/api/listings/:id/claim', async (req, res) => {
  try {
    const { id } = req.params;
    const { claimedQuantity, ngo_id } = req.body;

    // Validation
    if (!claimedQuantity || claimedQuantity <= 0) {
      return res.status(400).json({ message: 'Please provide a valid claimed quantity' });
    }

    // Get current listing
    const listing = await dbGet('SELECT * FROM listings WHERE id = ?', [id]);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Parse current quantity (handle "50 kg" or just "50")
    const currentQtyStr = listing.quantity.toString().trim();
    const currentQty = parseFloat(currentQtyStr.replace(/[^\d.]/g, ''));
    
    if (isNaN(currentQty)) {
      return res.status(400).json({ message: 'Invalid quantity format in listing' });
    }

    // Calculate remaining quantity
    const remainingQty = currentQty - claimedQuantity;

    if (remainingQty < 0) {
      return res.status(400).json({ message: 'Claimed quantity exceeds available quantity' });
    }

    // Update listing with claimed information and status
    const newQuantityStr = remainingQty > 0 ? remainingQty.toString() : '0';
    await dbRun(
      'UPDATE listings SET quantity = ?, claimed_by = ?, claimed_quantity = ?, status = ? WHERE id = ?', 
      [newQuantityStr, ngo_id, claimedQuantity.toString(), 'claimed', id]
    );

    // Fetch updated listing
    const updatedListing = await dbGet('SELECT * FROM listings WHERE id = ?', [id]);

    res.status(200).json({
      message: `Successfully claimed ${claimedQuantity}. Remaining: ${remainingQty}`,
      listing: updatedListing
    });
  } catch (err) {
    console.error('Claim listing error:', err);
    res.status(500).json({ message: 'Server error claiming listing' });
  }
});

// DELETE LISTING
app.delete('/api/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if listing exists
    const listing = await dbGet('SELECT * FROM listings WHERE id = ?', [id]);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Delete the listing
    await dbRun('DELETE FROM listings WHERE id = ?', [id]);

    res.status(200).json({
      message: 'Listing deleted successfully',
      deletedId: id
    });
  } catch (err) {
    console.error('Delete listing error:', err);
    res.status(500).json({ message: 'Server error deleting listing' });
  }
});

// ASSIGN DRIVER TO LISTING
app.post('/api/listings/:id/assign-driver', async (req, res) => {
  try {
    const { id } = req.params;
    const { driver_id } = req.body;

    // Validation
    if (!driver_id) {
      return res.status(400).json({ message: 'Driver ID is required' });
    }

    // Check if listing exists
    const listing = await dbGet('SELECT * FROM listings WHERE id = ?', [id]);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Check if listing is already assigned to another driver
    if (listing.assigned_driver && listing.assigned_driver !== driver_id) {
      return res.status(409).json({ message: 'This listing is already assigned to another driver' });
    }

    // Update listing with driver assignment
    await dbRun('UPDATE listings SET assigned_driver = ?, status = ? WHERE id = ?', 
      [driver_id, 'in_transit', id]);

    // Fetch updated listing
    const updatedListing = await dbGet('SELECT * FROM listings WHERE id = ?', [id]);

    res.status(200).json({
      message: 'Listing assigned to driver successfully',
      listing: updatedListing
    });
  } catch (err) {
    console.error('Assign driver error:', err);
    res.status(500).json({ message: 'Server error assigning driver' });
  }
});

// GET DRIVER'S DELIVERY TASKS
app.get('/api/drivers/:driverId/tasks', async (req, res) => {
  try {
    const { driverId } = req.params;

    // Validation
    if (!driverId) {
      return res.status(400).json({ message: 'Driver ID is required' });
    }

    // Get all claimed listings assigned to this driver (show only claimed quantity)
    const tasks = await dbAll(
      `SELECT l.*, u.name as farmer_name, l.claimed_quantity as delivery_quantity
       FROM listings l
       LEFT JOIN users u ON l.farmer_id = u.id
       WHERE l.assigned_driver = ? AND l.status IN ('in_transit', 'picked_up', 'pending', 'claimed')
       ORDER BY l.created_at DESC`,
      [driverId]
    );

    res.status(200).json({
      message: 'Driver tasks retrieved successfully',
      tasks: tasks || []
    });
  } catch (err) {
    console.error('Get driver tasks error:', err);
    res.status(500).json({ message: 'Server error retrieving driver tasks' });
  }
});

// CLEANUP EXPIRED LISTINGS
app.post('/api/listings/cleanup/expired', async (req, res) => {
  try {
    const listings = await dbAll('SELECT * FROM listings');
    console.log('Total listings in database:', listings.length);
    
    let deletedCount = 0;
    const now = new Date();

    for (const listing of listings) {
      const expiryStr = listing.expiry;
      
      // Parse expiry
      let expiryDate = null;
      
      if (!isNaN(Date.parse(expiryStr))) {
        expiryDate = new Date(expiryStr);
      } else {
        const match = expiryStr.match(/(\d+)\s*(day|hour|minute)s?/i);
        if (match) {
          const value = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          const createdDate = new Date(listing.created_at);
          
          if (unit === 'day') {
            createdDate.setDate(createdDate.getDate() + value);
          } else if (unit === 'hour') {
            createdDate.setHours(createdDate.getHours() + value);
          } else if (unit === 'minute') {
            createdDate.setMinutes(createdDate.getMinutes() + value);
          }
          expiryDate = createdDate;
        }
      }

      const isExpired = expiryDate && expiryDate < now;
      console.log(`Listing ${listing.id}: expiryStr="${expiryStr}", created_at="${listing.created_at}", calculated_expiry="${expiryDate}", now="${now}", isExpired=${isExpired}`);

      // If expired, delete it
      if (isExpired) {
        await dbRun('DELETE FROM listings WHERE id = ?', [listing.id]);
        deletedCount++;
        console.log(`Deleted expired listing ${listing.id}`);
      }
    }

    res.status(200).json({
      message: `Cleanup completed. ${deletedCount} expired listing(s) deleted.`,
      deletedCount,
      totalChecked: listings.length
    });
  } catch (err) {
    console.error('Cleanup expired listings error:', err);
    res.status(500).json({ message: 'Server error cleaning up listings' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend server is running' });
});

// Start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log('API endpoints:');
    console.log('  POST /api/signup - Create new account');
    console.log('  POST /api/login - Login to account');
    console.log('  GET /api/health - Check server status');
  });
}).catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
