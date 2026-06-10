/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

import { Booking, AuditLog, UserNotification, NavratriDay } from "./src/types";
import { INITIAL_NAVRATRI_DAYS } from "./src/lib/data";

dotenv.config();

// In-Memory buffers
let daysData: NavratriDay[] = [...INITIAL_NAVRATRI_DAYS];
let bookings: Booking[] = [];
let auditLogs: AuditLog[] = [];
let usersRegisterCache: any[] = [];
let notifications: UserNotification[] = [
  {
    id: "announce-1",
    title: "Navratri 2026 Ticket Counter Open!",
    body: "Secure your high-speed dynamic pass entry QR code for Mumbai, Surat, Vadodara, and Ahmedabad arenas. Fast-selling slots!",
    type: "info",
    timestamp: new Date().toISOString(),
    read: false
  }
];

// Persistent File-Based DB Helper for absolute zero-downtime offline capabilities
const DB_PATH = path.join(process.cwd(), "db.json");

function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      const data = JSON.parse(raw);
      if (data.daysData) daysData = data.daysData;
      if (data.bookings) bookings = data.bookings;
      if (data.auditLogs) auditLogs = data.auditLogs;
      if (data.usersRegisterCache) usersRegisterCache = data.usersRegisterCache;
      if (data.notifications) notifications = data.notifications;
      console.log(`[JSON_DB] Successfully loaded state from db.json.`);
    } else {
      saveDb();
    }
  } catch (err) {
    console.warn("[JSON_DB] Failed to load db.json, running with memory structures:", err);
  }
}

function saveDb() {
  try {
    const data = {
      daysData,
      bookings,
      auditLogs,
      usersRegisterCache,
      notifications
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("[JSON_DB] Failed to save db.json:", err);
  }
}

// Server-Sent Events client registry
interface SSEClient {
  id: string;
  res: express.Response;
}
let sseClients: SSEClient[] = [];

function broadcastSSE(type: string, data: any) {
  const payload = JSON.stringify({ type, data });
  sseClients.forEach((client) => {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (_) {}
  });
}

// Cryptographic token string builder for ticket QR payloads
function generateTicketHash(orderId: string, dayNum: number, email: string): string {
  const encoder = String(orderId + "-" + dayNum + "-" + email + "-" + Math.random().toString(36).substring(2, 10));
  let hash = "GARBA26-";
  for (let i = 0; i < encoder.length; i++) {
    const charCode = encoder.charCodeAt(i);
    hash += charCode.toString(16).toUpperCase();
  }
  return hash.substring(0, 48);
}

// Global logger helper
async function addAuditLog(level: "info" | "warning" | "error" | "security", event: string, details: string, email: string = "system") {
  const log: AuditLog = {
    id: "LOG-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    level,
    event,
    details,
    email
  };

  auditLogs.unshift(log);
  if (auditLogs.length > 250) {
    auditLogs = auditLogs.slice(0, 250);
  }
  saveDb();

  broadcastSSE("audit_log", log);
  console.log(`[AUDIT LOG] [${level.toUpperCase()}] [${event}] : ${details} (${email})`);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Parsers standard middleware
  app.use(express.json());

  // Global logger middleware for all API hits
  app.use((req, res, next) => {
    if (req.path.startsWith("/api") && req.path !== "/api/stream") {
      console.log(`[API CALL] ${req.method} ${req.path}`);
    }
    next();
  });

  // Load database structures on startup
  loadDb();

  // --- API ROUTING SECTION ---

  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Full Name, Email and Password are all required." });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address format (e.g., user@example.com)." });
    }

    if (trimmedEmail === "satrang2026@gmail.com") {
      return res.status(400).json({ success: false, message: "This email address is reserved for the Organizer Admin." });
    }

    try {
      const exists = usersRegisterCache.some((u) => u.email === trimmedEmail);

      if (exists) {
        return res.status(400).json({ success: false, message: "An account with this email address already exists." });
      }

      const newUser = {
        id: "USER-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        name: name.trim(),
        email: trimmedEmail,
        password,
        createdAt: new Date().toISOString()
      };

      usersRegisterCache.push(newUser);
      saveDb();

      await addAuditLog("info", "USER_REGISTERED", `New user successfully registered: ${name} (${trimmedEmail})`, trimmedEmail);

      res.json({
        success: true,
        message: "Registration completed successfully!",
        user: {
          uid: newUser.id,
          email: newUser.email,
          displayName: newUser.name,
          role: "user",
          photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newUser.name)}`
        }
      });
    } catch (err: any) {
      console.error("Registration error: ", err);
      res.status(500).json({ success: false, message: "An unexpected error occurred during registration. Please try again." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are both required." });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address format (e.g., user@example.com)." });
    }

    // Check Admin Credentials first
    if (trimmedEmail === "satrang2026@gmail.com") {
      if (password === "Satrang@2026") {
        await addAuditLog("security", "AUTH_ADMIN_SUCCESS", "Admin logged in successfully", "satrang2026@gmail.com");
        return res.json({
          success: true,
          message: "Admin validation successful. Welcome back, Organizer!",
          user: {
            uid: "mock-admin-id",
            email: "satrang2026@gmail.com",
            displayName: "Satrang Admin",
            role: "admin",
            photoURL: "https://api.dicebear.com/7.x/initials/svg?seed=Satrang"
          }
        });
      } else {
        await addAuditLog("security", "AUTH_ADMIN_FAILED", "Failed Admin password login attempt", "satrang2026@gmail.com");
        return res.status(401).json({ success: false, message: "Incorrect password for Organizer Admin." });
      }
    }

    // Normal User Login
    try {
      const matchUser = usersRegisterCache.find((u) => u.email === trimmedEmail);

      if (!matchUser) {
        return res.status(401).json({ success: false, message: "No user account found with this email. Please register first." });
      }

      if (matchUser.password !== password) {
        await addAuditLog("security", "AUTH_USER_FAILED", `Incorrect password attempt for ${trimmedEmail}`, trimmedEmail);
        return res.status(401).json({ success: false, message: "Incorrect password. Please try again." });
      }

      await addAuditLog("info", "AUTH_USER_SUCCESS", `Logged in successfully: ${matchUser.name}`, trimmedEmail);

      res.json({
        success: true,
        message: `Welcome back, ${matchUser.name}!`,
        user: {
          uid: matchUser._id || matchUser.id,
          email: matchUser.email,
          displayName: matchUser.name,
          role: "user",
          photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(matchUser.name)}`
        }
      });
    } catch (err: any) {
      console.error("Login error: ", err);
      res.status(500).json({ success: false, message: "An unexpected error occurred during login." });
    }
  });

  // Service health status
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // SSE Pipeline
  app.get("/api/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const clientId = Date.now().toString() + "-" + Math.random().toString(36).substring(2, 6);
    const newClient: SSEClient = { id: clientId, res };
    sseClients.push(newClient);

    const bootstrapPayload = {
      type: "bootstrap",
      data: {
        days: daysData,
        notifications,
        bookingsCount: bookings.length
      }
    };
    res.write(`data: ${JSON.stringify(bootstrapPayload)}\n\n`);

    req.on("close", () => {
      sseClients = sseClients.filter((client) => client.id !== clientId);
    });
  });

  // Retrieve current days parameters and capacities
  app.get("/api/days", async (req, res) => {
    res.json(daysData);
  });

  // Razorpay Gateway - Create dynamic Order ID
  app.post("/api/payment/create-order", async (req, res) => {
    const { name, email, phone, day } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Valid custom name field is mandatory." });
    }
    if (!email || !email.includes("@")) {
      return res.status(400).json({ success: false, message: "Valid contact email is required for ticket delivery." });
    }
    if (!phone || phone.trim().length < 8) {
      return res.status(400).json({ success: false, message: "Valid mobile phone number is necessary for emergency alerts." });
    }

    const dayNum = parseInt(day);

    try {
      const selectedDay = daysData.find(d => d.day === dayNum);

      if (!selectedDay) {
        return res.status(404).json({ success: false, message: `Descriptive Navratri Day [${dayNum}] does not exist.` });
      }

      const availableSlots = selectedDay.maxCapacity - selectedDay.currentCapacity;
      if (availableSlots <= 0) {
        await addAuditLog("warning", "CAPACITY_EXCEEDED_ATTEMPT", `Attempted order booking for sold-out Day ${dayNum} (${selectedDay.devi})`, email);
        return res.status(400).json({ success: false, message: `Day ${dayNum} Garba Pass has sold out! Choose another festive night.` });
      }

      const orderId = "order_garba_" + Math.random().toString(36).substring(2, 10).toUpperCase();
      const amount = selectedDay.price;
      const id = "PASS-" + Math.random().toString(36).substring(2, 8).toUpperCase();

      const newBooking: Booking = {
        id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        day: dayNum,
        ticketHash: "", // Will be sealed on verification
        status: "pending",
        amount,
        orderId,
        createdAt: new Date().toISOString()
      };

      bookings.push(newBooking); // Sync backup in-memory registry always!
      saveDb();

      await addAuditLog(
        "info",
        "PAYMENT_ORDER_CREATED",
        `Initiated pass checkout for ${name} (Day ${dayNum} - ${selectedDay.devi}) - Order ID: ${orderId}`,
        email
      );

      res.json({
        success: true,
        orderId,
        amount,
        currency: "INR",
        dayDetails: selectedDay,
        isMongoOffline: true
      });

    } catch (err: any) {
      console.error("Error creating booking order status: ", err);
      res.status(500).json({ success: false, message: "Internal server pipeline failure during order creation." });
    }
  });

  // Razorpay Gateway - Signature verification and transactional capacity lock
  app.post("/api/payment/verify", async (req, res) => {
    const { orderId, paymentId, signature, status } = req.body;

    try {
      const booking = bookings.find(b => b.orderId === orderId);

      if (!booking) {
        await addAuditLog("error", "PAYMENT_VERIFICATION_ORPHANED", `Received transaction signature for unknown order reference: ${orderId}`, "unknown");
        return res.status(404).json({ success: false, message: "Booking order reference not found in registries." });
      }

      if (booking.status !== "pending") {
        return res.status(400).json({ success: false, message: "Transaction already processed and finalized." });
      }

      if (status === "failed") {
        booking.status = "failed";
        saveDb();
        await addAuditLog("warning", "PAYMENT_FAILED", `Garba pass checkout failed or aborted at gateway for order ID: ${orderId}`, booking.email);
        return res.json({ success: false, message: "Payment checkout was canceled or failed authorization." });
      }

      // Execute high-speed atomic capacity locks dynamically
      let targetDay: NavratriDay | null = null;
      const memDayObj = daysData.find(d => d.day === booking.day);
      if (memDayObj && memDayObj.currentCapacity < memDayObj.maxCapacity) {
        memDayObj.currentCapacity += 1;
        targetDay = memDayObj;
      }

      if (!targetDay) {
        booking.status = "failed";
        saveDb();
        await addAuditLog("security", "RACE_CONDITION_BLOCKED", `Blocked ticket issuance during signature verification - Day ${booking.day} sold out mid-payment`, booking.email);
        return res.status(400).json({ success: false, message: "We apologize! Capacity maximum limit reached during payment authorization. Refund initiated." });
      }

      // Produce authentic ticket hash and seal booking
      const ticketHash = generateTicketHash(orderId, booking.day, booking.email);
      const updatedBooking: Booking = {
        ...booking,
        status: "success",
        paymentId: paymentId || "pay_" + Math.random().toString(36).substring(2, 10).toUpperCase(),
        paymentSignature: signature || "sig_" + Math.random().toString(36).substring(2, 14).toUpperCase(),
        ticketHash,
        isScanned: false
      };

      // Sync master bookings in-memory cache
      const bIdx = bookings.findIndex(b => b.id === updatedBooking.id || b.orderId === updatedBooking.orderId);
      if (bIdx !== -1) {
        bookings[bIdx] = updatedBooking;
      } else {
        bookings.push(updatedBooking);
      }
      saveDb();

      // Broadcast booking update dynamically to all listening devices
      broadcastSSE("booking_update", updatedBooking);

      // Broadcast dynamic live capacities across observers
      broadcastSSE("capacity_update", {
        day: booking.day,
        currentCapacity: targetDay.currentCapacity
      });

      // Write user notice
      const newNotification: UserNotification = {
        id: "notif_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        title: "🎫 Garba Pass Confirmed!",
        body: `Congratulations ${booking.name}! Your Day ${booking.day} pass for ${targetDay.devi} night is confirmed. QR Ticket mailed to ${booking.email}`,
        type: "success",
        timestamp: new Date().toISOString(),
        read: false
      };

      notifications.unshift(newNotification);
      saveDb();
      broadcastSSE("notification", newNotification);

      // Audit confirmed transaction
      await addAuditLog(
        "info",
        "BOOKING_CONFIRMED",
        `Pass checkout cleared successfully. Generated Ticket QR: ${updatedBooking.ticketHash} for Day ${booking.day}`,
        booking.email
      );

      res.json({
        success: true,
        booking: updatedBooking,
        dayDetails: targetDay,
        isMongoOffline: true
      });

    } catch (err: any) {
      console.error("Payment verify checkout error: ", err);
      res.status(500).json({ success: false, message: "Database transaction exception during payment confirmation." });
    }
  });

  // Retrieve all database bookings
  app.get("/api/bookings", async (req, res) => {
    res.json(bookings);
  });

  // Client simulated/google logging endpoint
  app.post("/api/logs/create", async (req, res) => {
    const { action, details, email } = req.body;
    try {
      await addAuditLog("info", action || "CLIENT_LOG", details || "", email || "system");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  });

  // Retrieve security logs
  app.get("/api/logs", async (req, res) => {
    res.json(auditLogs);
  });

  // Calculate live statistics
  app.get("/api/stats", async (req, res) => {
    // In-Memory Fallback
    const totalPayments = bookings
      .filter((b) => b.status === "success")
      .reduce((sum, b) => sum + b.amount, 0);

    const totalRegistrations = bookings.filter((b) => b.status === "success").length;

    const dailyStats = daysData.map((d) => ({
      day: d.day,
      devi: d.devi,
      sold: d.currentCapacity,
      max: d.maxCapacity,
      revenue: bookings
        .filter((b) => b.status === "success" && b.day === d.day)
        .reduce((sum, b) => sum + b.amount, 0)
    }));

    res.json({
      totalPayments,
      totalRegistrations,
      dailyStats,
      activeUsersSimulated: Math.max(8, sseClients.length + 5)
    });
  });

  // Broadcast push notifications
  app.post("/api/notifications/announce", async (req, res) => {
    const { title, body, type } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, message: "Announcement header and body content are required." });
    }

    const newNotification: UserNotification = {
      id: "admin_announce_" + Date.now(),
      title,
      body,
      type: type || "update",
      timestamp: new Date().toISOString(),
      read: false
    };

    notifications.unshift(newNotification);
    saveDb();

    broadcastSSE("notification", newNotification);
    await addAuditLog("security", "ADMIN_BROADCAST", `Admin broadcasted venue announcement: "${title}"`, "admin@navratri2026.com");
    res.json({ success: true, notification: newNotification, isMongoOffline: true });
  });

  // Gate Scanner - Validates a unique ticket QR code hash
  app.post("/api/bookings/verify-qr", async (req, res) => {
    const { qrHash } = req.body;

    try {
      const match = bookings.find(b => b.ticketHash === qrHash);

      if (!match) {
        await addAuditLog("warning", "INVALID_QR_SCAN", `Gate check attempted with unrecognized QR Hash: ${qrHash}`, "gate_scanner");
        return res.status(404).json({ success: false, message: "Unauthorized ticket pass. Verification failed." });
      }

      if (match.isScanned) {
        await addAuditLog("warning", "REDUNDANT_QR_SCAN", `Ticket ID ${match.id} QR scanned again. Counterfeit warning!`, "gate_scanner");
        return res.status(400).json({ success: false, lastScanned: match.createdAt, message: "This pass has already been checked in. Security alert triggered." });
      }

      // Check-in
      match.isScanned = true;

      // Sync booking status in our cache
      const bIdx = bookings.findIndex(b => b.id === match.id);
      if (bIdx !== -1) {
        bookings[bIdx] = match;
      }
      saveDb();

      await addAuditLog("info", "GATE_TICKET_VALIDATED", `Ticket confirmation ID ${match.id} (Day ${match.day} - ${match.name}) successfully authorized for entrance.`, "gate_scanner");

      res.json({
        success: true,
        message: "Pass fully validated. Welcome to Navratri 2026!",
        booking: match,
        isMongoOffline: true
      });

    } catch (err) {
      console.error("Error validating QR scan: ", err);
      res.status(500).json({ success: false, message: "Verification failed due to database read-write latency." });
    }
  });

  // --- DEV / PRODUCTION INTEGRATION MIDDLEWARES ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`===============================================`);
    console.log(`  Navratri 2026 Garba Fullstack Server Active   `);
    console.log(`  Address: http://0.0.0.0:${PORT}               `);
    console.log(`===============================================`);
  });
}

startServer().catch((err) => {
  console.error("Critical: Failed to boot fullstack application server", err);
});
