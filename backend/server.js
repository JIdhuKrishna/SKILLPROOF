const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors'); // Moved up for cleaner organization
const { MongoMemoryServer } = require('mongodb-memory-server');

// Load env vars
dotenv.config();

const app = express();

// Body parser & Middleware
app.use(express.json());
app.use(cors()); // Ensure CORS is enabled before routes

// Import Routes
const uploadRoutes = require('./routes/uploadRoutes');
const authRoutes = require('./routes/authRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const profileRoutes = require('./routes/profileRoutes');
const recruiterRoutes = require('./routes/recruiterRoutes');

// Mount Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/recruiter', recruiterRoutes);

// Basic route for testing
app.get('/', (req, res) => {
    res.send('Skillproof API is running...');
});

const PORT = process.env.PORT || 5000;

let memoryServer = null;

async function connectDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ SkillProof Database Connected...');
    } catch (error) {
        console.warn(`⚠️ Primary DB connection failed: ${error.message}`);
        console.warn('⚠️ Starting an in-memory MongoDB on localhost:27017 for Compass and local dev...');

        memoryServer = await MongoMemoryServer.create({
            instance: {
                port: 27017,
                dbName: 'skillproof',
            },
        });

        const fallbackUri = memoryServer.getUri();
        process.env.MONGO_URI = fallbackUri;
        await mongoose.connect(fallbackUri);
        console.log(`✅ In-memory MongoDB Connected: ${fallbackUri}`);
    }
}

async function startServer() {
    await connectDatabase();

    // Only listen locally or on non-Vercel production environments (like Render)
    if (process.env.VERCEL !== '1') {
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    }
}

startServer().catch((error) => {
    console.error(`❌ Error starting server: ${error.message}`);
    process.exit(1);
});

process.on('SIGINT', async () => {
    await mongoose.disconnect();
    if (memoryServer) {
        await memoryServer.stop();
    }
    process.exit(0);
});

module.exports = app;