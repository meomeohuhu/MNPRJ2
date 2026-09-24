import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import pg from "pg";
import path from "node:path";
import { randomUUID } from "node:crypto";

dotenv.config();

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
const jwtSecret = process.env.JWT_SECRET ?? "vku-reserve-development-secret";
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(googleClientId);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const slotDefinitions = [
  { id: "07:30-09:30", label: "07:30–09:30", start: "07:30", end: "09:30" },
  { id: "09:30-11:30", label: "09:30–11:30", start: "09:30", end: "11:30" },
  { id: "13:00-15:00", label: "13:00–15:00", start: "13:00", end: "15:00" },
  { id: "15:00-17:00", label: "15:00–17:00", start: "15:00", end: "17:00" }
];

const seedRooms = [
  ["a101", "Phòng máy A101", "A", "1", 20, ["High-spec PC", "AC", "Projector"], "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80"],
  ["a204", "Phòng học nhóm A204", "A", "2", 6, ["Whiteboard", "AC", "Projector"], "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80"],
  ["b105", "Phòng máy B105", "B", "1", 20, ["High-spec PC", "AC", "Whiteboard"], "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=900&q=80"],
  ["b308", "Phòng học nhóm B308", "B", "3", 8, ["Whiteboard", "AC"], "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=80"],
  ["c201", "Phòng cộng tác C201", "C", "2", 10, ["Projector", "Whiteboard", "AC"], "https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=900&q=80"],
  ["c402", "Phòng máy C402", "C", "4", 16, ["High-spec PC", "AC", "Projector"], "https://images.unsplash.com/photo-1497366811367-6870744d04b2?auto=format&fit=crop&w=900&q=80"],
  ["v103", "Phòng tập trung V103", "V", "1", 4, ["Whiteboard", "AC"], "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80"],
  ["v207", "Phòng máy V207", "V", "2", 20, ["High-spec PC", "Projector", "AC"], "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80"],
  ["a305", "Phòng studio A305", "A", "3", 12, ["Projector", "Whiteboard", "AC"], "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80"],
  ["b212", "Phòng tập trung B212", "B", "2", 2, ["AC", "Whiteboard"], "https://images.unsplash.com/photo-1497366811367-6870744d04b2?auto=format&fit=crop&w=900&q=80"]
];

function clientUser(row) {
  return { id: row.id, email: row.email, name: row.name, avatarUrl: row.avatar_url, studentId: row.student_id };
}

function clientRoom(row) {
  return { id: row.id, name: row.name, building: row.building, floor: row.floor, capacity: row.capacity, photoUrl: row.photo_url, equipment: row.equipment, status: row.status };
}

function clientBooking(row) {
  return {
    id: row.id,
    passCode: row.pass_code,
    roomId: row.room_id,
    roomName: row.room_name,
    roomBuilding: row.room_building,
    roomFloor: row.room_floor,
    studentName: row.student_name,
    studentId: row.student_id,
    bookingDate: row.booking_date,
    slotId: row.slot_id,
    slotLabel: row.slot_label,
    slotStart: row.slot_start,
    slotEnd: row.slot_end,
    status: row.status,
    createdAt: row.created_at,
    checkedInAt: row.checked_in_at
  };
}

function issueToken(user) {
  return jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: "7d" });
}

async function authenticate(request, response, next) {
  const header = request.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return response.status(401).json({ error: "Authentication required" });
  try {
    const payload = jwt.verify(token, jwtSecret);
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [payload.sub]);
    if (!result.rows[0]) return response.status(401).json({ error: "User session not found" });
    request.user = result.rows[0];
    return next();
  } catch {
    return response.status(401).json({ error: "Invalid or expired session" });
  }
}

function localToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

function validBookingDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const target = new Date(`${value}T12:00:00+07:00`);
  const today = new Date(`${localToday()}T12:00:00+07:00`);
  const difference = Math.round((target - today) / 86400000);
  return difference >= 0 && difference <= 6;
}

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      google_sub TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      student_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      building TEXT NOT NULL CHECK (building IN ('A', 'B', 'C', 'V')),
      floor TEXT NOT NULL,
      capacity INTEGER NOT NULL CHECK (capacity BETWEEN 2 AND 20),
      photo_url TEXT NOT NULL,
      equipment TEXT[] NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      pass_code TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      room_id TEXT NOT NULL REFERENCES rooms(id),
      student_name TEXT NOT NULL,
      student_id TEXT NOT NULL,
      booking_date DATE NOT NULL,
      slot_id TEXT NOT NULL,
      slot_label TEXT NOT NULL,
      slot_start TIME NOT NULL,
      slot_end TIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'BOOKED' CHECK (status IN ('BOOKED', 'CHECKED_IN', 'CANCELLED')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      checked_in_at TIMESTAMPTZ,
      UNIQUE (room_id, booking_date, slot_start),
      UNIQUE (user_id, booking_date, slot_start)
    );
    CREATE INDEX IF NOT EXISTS bookings_room_date_idx ON bookings(room_id, booking_date);
    CREATE INDEX IF NOT EXISTS bookings_user_idx ON bookings(user_id, booking_date);
  `);

  for (const [id, name, building, floor, capacity, equipment, photoUrl] of seedRooms) {
    await pool.query(
      `INSERT INTO rooms (id, name, building, floor, capacity, equipment, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, building = EXCLUDED.building,
       floor = EXCLUDED.floor, capacity = EXCLUDED.capacity, equipment = EXCLUDED.equipment, photo_url = EXCLUDED.photo_url`,
      [id, name, building, floor, capacity, equipment, photoUrl]
    );
  }
}

app.get("/api/health", async (_request, response) => {
  try { await pool.query("SELECT 1"); response.json({ ok: true, database: "connected" }); }
  catch (error) { response.status(503).json({ ok: false, database: "unavailable", error: error.message }); }
});

app.post("/api/auth/google", async (request, response) => {
  if (!googleClientId) return response.status(503).json({ error: "GOOGLE_CLIENT_ID is not configured on the server" });
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: String(request.body.idToken || ""), audience: googleClientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified === false) return response.status(401).json({ error: "Google account could not be verified" });
    let result = await pool.query("SELECT * FROM users WHERE google_sub = $1", [payload.sub]);
    let isNewUser = false;
    if (!result.rows[0]) {
      result = await pool.query("SELECT * FROM users WHERE email = $1", [payload.email]);
    }
    if (result.rows[0]) {
      result = await pool.query("UPDATE users SET google_sub = $1, name = $2, avatar_url = $3 WHERE id = $4 RETURNING *", [payload.sub, payload.name || payload.email, payload.picture || null, result.rows[0].id]);
    } else {
      isNewUser = true;
      result = await pool.query("INSERT INTO users (id, google_sub, email, name, avatar_url) VALUES ($1, $2, $3, $4, $5) RETURNING *", [randomUUID(), payload.sub, payload.email, payload.name || payload.email, payload.picture || null]);
    }
    response.json({ token: issueToken(result.rows[0]), user: clientUser(result.rows[0]), isNewUser });
  } catch (error) { response.status(401).json({ error: `Google sign-in failed: ${error.message}` }); }
});

app.get("/api/auth/me", authenticate, (request, response) => response.json(clientUser(request.user)));

app.put("/api/auth/profile", authenticate, async (request, response) => {
  const name = String(request.body.name || "").trim();
  const studentId = String(request.body.studentId || "").trim();
  if (!name || !studentId) return response.status(400).json({ error: "Name and student ID are required" });
  const result = await pool.query("UPDATE users SET name = $1, student_id = $2 WHERE id = $3 RETURNING *", [name, studentId, request.user.id]);
  response.json(clientUser(result.rows[0]));
});

app.get("/api/rooms", async (request, response) => {
  const values = [];
  const conditions = ["TRUE"];
  const add = (value) => { values.push(value); return `$${values.length}`; };
  if (request.query.search) { const search = add(`%${String(request.query.search).toLowerCase()}%`); conditions.push(`(LOWER(r.name) LIKE ${search} OR LOWER(r.building) LIKE ${search} OR EXISTS (SELECT 1 FROM unnest(r.equipment) item WHERE LOWER(item) LIKE ${search}))`); }
  if (request.query.building) conditions.push(`r.building = ${add(String(request.query.building))}`);
  if (request.query.minCapacity) conditions.push(`r.capacity >= ${add(Number(request.query.minCapacity) || 2)}`);
  if (request.query.equipment) {
    const equipment = String(request.query.equipment).split(",").filter(Boolean);
    if (equipment.length) conditions.push(`r.equipment @> ${add(equipment)}::text[]`);
  }
  try {
    const result = await pool.query(`
      SELECT r.*, CASE WHEN EXISTS (
        SELECT 1 FROM bookings b WHERE b.room_id = r.id AND b.status IN ('BOOKED', 'CHECKED_IN')
        AND b.booking_date = (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
        AND b.slot_start <= (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::time
        AND b.slot_end > (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::time
      ) THEN 'OCCUPIED' ELSE 'AVAILABLE' END AS status
      FROM rooms r WHERE ${conditions.join(" AND ")} ORDER BY r.building, r.floor, r.name`, values);
    response.json(result.rows.map(clientRoom));
  } catch (error) { response.status(500).json({ error: error.message }); }
});

app.get("/api/rooms/:id/availability", async (request, response) => {
  const date = String(request.query.date || "");
  if (!validBookingDate(date)) return response.status(400).json({ error: "Date must be within the next 7 days" });
  try {
    const result = await pool.query("SELECT id, slot_id FROM bookings WHERE room_id = $1 AND booking_date = $2 AND status IN ('BOOKED', 'CHECKED_IN')", [request.params.id, date]);
    const booked = new Map(result.rows.map((row) => [row.slot_id, row.id]));
    response.json(slotDefinitions.map((slot) => ({ ...slot, booked: booked.has(slot.id), bookingId: booked.get(slot.id) })));
  } catch (error) { response.status(500).json({ error: error.message }); }
});

const bookingQuery = `SELECT b.*, r.name AS room_name, r.building AS room_building, r.floor AS room_floor
  FROM bookings b JOIN rooms r ON r.id = b.room_id`;

app.get("/api/bookings", authenticate, async (request, response) => {
  try {
    const result = await pool.query(`${bookingQuery} WHERE b.user_id = $1 ORDER BY b.booking_date ASC, b.slot_start ASC`, [request.user.id]);
    response.json(result.rows.map(clientBooking));
  } catch (error) { response.status(500).json({ error: error.message }); }
});

app.post("/api/bookings", authenticate, async (request, response) => {
  const roomId = String(request.body.roomId || "");
  const bookingDate = String(request.body.bookingDate || "");
  const slotId = String(request.body.slotId || "");
  const slot = slotDefinitions.find((item) => item.id === slotId);
  if (!request.user.student_id) return response.status(400).json({ error: "Complete your student profile before booking" });
  if (!roomId || !slot || !validBookingDate(bookingDate)) return response.status(400).json({ error: "Room, date and a valid time slot are required" });
  try {
    const result = await pool.query(`INSERT INTO bookings
      (id, pass_code, user_id, room_id, student_name, student_id, booking_date, slot_id, slot_label, slot_start, slot_end)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [randomUUID(), `VKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, request.user.id, roomId, request.user.name, request.user.student_id, bookingDate, slot.id, slot.label, slot.start, slot.end]);
    const booking = await pool.query(`${bookingQuery} WHERE b.id = $1`, [result.rows[0].id]);
    response.status(201).json(clientBooking(booking.rows[0]));
  } catch (error) {
    if (error.code === "23505") return response.status(409).json({ error: "This room or your account already has a booking for that time" });
    response.status(500).json({ error: error.message });
  }
});

app.delete("/api/bookings/:id", authenticate, async (request, response) => {
  try {
    const result = await pool.query(`UPDATE bookings SET status = 'CANCELLED' WHERE id = $1 AND user_id = $2 AND status = 'BOOKED' RETURNING id`, [request.params.id, request.user.id]);
    if (!result.rows[0]) return response.status(404).json({ error: "Booking was not found or cannot be cancelled" });
    const booking = await pool.query(`${bookingQuery} WHERE b.id = $1`, [request.params.id]);
    response.json(clientBooking(booking.rows[0]));
  } catch (error) { response.status(500).json({ error: error.message }); }
});

app.post("/api/bookings/:id/check-in", authenticate, async (request, response) => {
  try {
    const result = await pool.query(`UPDATE bookings SET status = 'CHECKED_IN', checked_in_at = NOW() WHERE id = $1 AND user_id = $2 AND status = 'BOOKED' RETURNING id`, [request.params.id, request.user.id]);
    if (!result.rows[0]) return response.status(404).json({ error: "Booking was not found or already checked in" });
    const booking = await pool.query(`${bookingQuery} WHERE b.id = $1`, [request.params.id]);
    response.json(clientBooking(booking.rows[0]));
  } catch (error) { response.status(500).json({ error: error.message }); }
});

const distPath = path.resolve(process.cwd(), "dist");
app.use(express.static(distPath));
app.use((request, response, next) => {
  if (request.method !== "GET" || request.path.startsWith("/api")) return next();
  return response.sendFile(path.join(distPath, "index.html"));
});

initDatabase()
  .then(() => app.listen(port, "0.0.0.0", () => console.log(`VKU Reserve listening on ${port}`)))
  .catch((error) => {
    console.error("Database initialization failed:", error.message);
    if (error.code === "28P01") {
      console.error("PostgreSQL rejected the username/password in DATABASE_URL. Update .env with your real local postgres password, or run: docker compose up -d postgres");
    }
    if (error.code === "3D000") {
      console.error("The database in DATABASE_URL does not exist yet. Create it first, or run: docker compose up -d postgres");
    }
    process.exit(1);
  });
