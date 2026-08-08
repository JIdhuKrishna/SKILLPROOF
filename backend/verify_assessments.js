require('dotenv').config();
const mongoose = require('mongoose');
const Assessment = require('./models/Assessment');

const verify = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for verification.");

        const assessments = await Assessment.find().sort({ createdAt: -1 }).limit(5).lean();
        console.log(`\nLast 5 Assessments in Database (${assessments.length} found):\n`);

        const fs = require('fs');
        fs.writeFileSync('verify_out.json', JSON.stringify(assessments, null, 2), 'utf8');
        console.log(`Saved ${assessments.length} assessments to verify_out.json.`);

    } catch (err) {
        console.error("Verification failed:", err);
    } finally {
        mongoose.disconnect();
        process.exit(0);
    }
};

verify();
