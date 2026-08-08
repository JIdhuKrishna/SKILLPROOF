const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

async function rebuild() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
    });

    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    console.log('Connected to', dbName);

    // Drop the database
    await db.dropDatabase();
    console.log('Dropped database:', dbName);

    // Recreate an admin user
    const User = require('../models/User');
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash('AdminPass123!', salt);

    const admin = new User({
      name: 'Administrator',
      email: 'admin@example.com',
      password: hashed,
      role: 'Recruiter',
    });

    await admin.save();
    console.log('Seeded admin user: admin@example.com / AdminPass123!');

    console.log('Rebuild complete.');
  } catch (err) {
    console.error('Rebuild failed:', err);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

rebuild();
