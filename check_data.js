import mongoose from "mongoose";
import "dotenv/config";
import Room from "./server/models/Room.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/dinner_planner";

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        const rooms = await Room.find().lean();
        rooms.forEach(r => {
            console.log(`Room: ${r.roomId}`);
            const named = r.participants?.filter(p => p.nickname && p.nickname !== "익명") || [];
            const anon = r.participants?.filter(p => !p.nickname || p.nickname === "익명") || [];
            console.log(`  Total: ${r.participants?.length || 0}`);
            console.log(`  Named: ${named.length}`, named.map(p => p.nickname));
            console.log(`  Anon: ${anon.length}`);
            console.log("-------------------");
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
