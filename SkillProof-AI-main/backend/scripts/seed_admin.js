const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

dotenv.config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
    });

    const email = 'admin@example.com';
    const existing = await User.findOne({ email });
    if (existing) {
      console.log('Admin user already exists:', existing.email);
      process.exit(0);
    }

    const password = 'AdminPass123!';
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const admin = new User({
      name: 'Administrator',
      email,
      password: hashed,
      role: 'Recruiter',
    });

    await admin.save();
    console.log('Seeded admin user:', email, 'password:', password);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
