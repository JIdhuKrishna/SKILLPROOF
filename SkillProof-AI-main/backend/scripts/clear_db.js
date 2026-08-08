require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const User = require('../models/User');
const Profile = require('../models/Profile');
const Assessment = require('../models/Assessment');

const clearDB = async () => {
    try {
        console.log("Starting Nuclear Reset...");

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");

        // Wipe all collections while preserving indexes
        const userResult = await User.deleteMany({});
        const profileResult = await Profile.deleteMany({});
        const assessmentResult = await Assessment.deleteMany({});

        console.log(`Deleted ${userResult.deletedCount} Users.`);
        console.log(`Deleted ${profileResult.deletedCount} Profiles.`);
        console.log(`Deleted ${assessmentResult.deletedCount} Assessments.`);

        // Verification counts
        const userCount = await User.countDocuments();
        const profileCount = await Profile.countDocuments();
        const assessmentCount = await Assessment.countDocuments();

        console.log(`\n✅ Database Wiped: ${userCount} Users, ${profileCount} Profiles, ${assessmentCount} Assessments remaining.`);

    } catch (error) {
        console.error("Error clearing database:", error);
    } finally {
        mongoose.connection.close();
        console.log("MongoDB connection closed.");
        process.exit(0);
    }
};

clearDB();
