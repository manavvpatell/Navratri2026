import { MongoClient, Db } from "mongodb";
import { INITIAL_NAVRATRI_DAYS } from "./src/lib/data";
import { Booking, AuditLog, UserNotification, NavratriDay } from "./src/types";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://manavgameium_db_user:3QufhJxauHWViR34@cluster0.0aaktxk.mongodb.net/?appName=Cluster0";

let client: MongoClient | null = null;
let dbInstance: Db | null = null;
let isOfflineFlag = false;
let lastAttemptTime = 0;
const RECOVERY_COOLDOWN = 15000; // Wait 15s before attempting reconnection if failed

export function isMongoDbOffline(): boolean {
  return isOfflineFlag;
}

export function setMongoDbOffline(status: boolean) {
  isOfflineFlag = status;
}

export async function getMongoDb(): Promise<Db> {
  if (dbInstance && !isOfflineFlag) {
    return dbInstance;
  }

  // If in recovery cooldown, do not attempt reconnect, immediately raise fallback
  if (isOfflineFlag && (Date.now() - lastAttemptTime < RECOVERY_COOLDOWN)) {
    throw new Error("MongoDB is offline (Fast fall-through active)");
  }

  try {
    lastAttemptTime = Date.now();
    console.log("[MONGO] Attempting high-availability connection to MongoDB Cluster...");
    // Initialize standard MongoDB client with quick failover timeouts (4s)
    client = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: 4000,
      serverSelectionTimeoutMS: 4000,
      socketTimeoutMS: 20000,
    });
    await client.connect();
    dbInstance = client.db("navratri_2026");
    isOfflineFlag = false;
    console.log("[MONGO] Successfully connected to database: navratri_2026");
    return dbInstance;
  } catch (err: any) {
    isOfflineFlag = true;
    console.log("[MONGO-OFFLINE] Connection handshake failed. Defaulting to high-speed local memory backup: ", err.message || err);
    throw err;
  }
}

// Seed capacity_state collection with native INITIAL_NAVRATRI_DAYS list if empty
export async function seedMongoDatabase() {
  try {
    const db = await getMongoDb();
    const capacityColl = db.collection("capacity_state");
    const count = await capacityColl.countDocuments();
    if (count === 0) {
      console.log("[MONGO SEED] capacity_state collection is empty. Seeding INITIAL_NAVRATRI_DAYS...");
      // Seed all nights
      await capacityColl.insertMany(INITIAL_NAVRATRI_DAYS);
      console.log("[MONGO SEED] Successfully seeded default Navratri festival nights.");
    } else {
      console.log(`[MONGO SEED] capacity_state is pre-initialized with ${count} items.`);
    }
  } catch (err) {
    isOfflineFlag = true;
    console.warn("[MONGO SEED REGRESS] Could not seed capacity table or verify structure, using memory: ", err);
  }
}
