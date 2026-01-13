import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import Room from '../models/Room.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const MONGO_URI = process.env.MONGO_URI;
// Note: In Fly.io, volume is mounted at /data, so files are in /data/rooms
// But we should check both env var and standard paths
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data', 'rooms');

console.log('--- Migration Script Started ---');
console.log(`Target Data Directory: ${DATA_DIR}`);

const migrate = async () => {
    if (!MONGO_URI) {
        console.error('❌ MONGO_URI is missing!');
        process.exit(1);
    }

    try {
        // 1. Connect to DB
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        // 2. Read Files
        console.log(`Reading files from ${DATA_DIR}...`);
        try {
            await fs.access(DATA_DIR);
        } catch (e) {
            console.error(`❌ Data directory not found at ${DATA_DIR}`);
            console.log('Listing parent directory /data:');
            try {
                const parent = await fs.readdir('/data');
                console.log(parent);
            } catch (err) { console.log('Could not list /data'); }
            process.exit(1);
        }

        const files = await fs.readdir(DATA_DIR);
        const jsonFiles = files.filter(f => f.endsWith('.json'));

        console.log(`Found ${jsonFiles.length} JSON files.`);

        let successCount = 0;
        let failCount = 0;

        // 3. Import Loop
        for (const file of jsonFiles) {
            try {
                const filePath = path.join(DATA_DIR, file);
                const raw = await fs.readFile(filePath, 'utf-8');
                const data = JSON.parse(raw);

                // Validate data has roomId
                if (!data.roomId) {
                    console.warn(`⚠️ Skipping ${file}: No roomId found.`);
                    continue;
                }

                // Upsert to DB
                await Room.findOneAndUpdate(
                    { roomId: data.roomId },
                    data,
                    { upsert: true, new: true }
                );
                process.stdout.write('.'); // Progress dot
                successCount++;
            } catch (err) {
                console.error(`\n❌ Failed to process ${file}:`, err.message);
                failCount++;
            }
        }

        console.log('\n--- Migration Summary ---');
        console.log(`✅ Success: ${successCount}`);
        console.log(`❌ Failed: ${failCount}`);

    } catch (error) {
        console.error('Migration Fatal Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
        process.exit(0);
    }
};

migrate();
