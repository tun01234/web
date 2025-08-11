import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const PORT       = process.env.PORT || 3000;
const GAMES      = Number(process.env.GAMES || 36);
const MAX        = 85;
const STEP_MIN   = -2, STEP_MAX = 2;
const INTERVALMS = Number(process.env.INTERVAL_MS || 20_000);

const app = express();

// CORS for REST
app.use((req, res, next) => {
  const ORIGIN = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// static UI
app.use(express.static("web"));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.ALLOWED_ORIGIN || "*" },
  transports: ["websocket","polling"]
});

// state
let state = Object.fromEntries(Array.from({ length: GAMES }, (_, i) => [`game${i+1}`, 50]));

app.get("/state",  (_req, res) => res.json(state));
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

io.on("connection", s => {
  s.emit("state", state);
  s.on("tickNow", () => tick(true));
});

const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const rint=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;

function tick(emitOnly=false) {
  if (!emitOnly) for (const k of Object.keys(state)) state[k] = clamp(state[k] + rint(STEP_MIN, STEP_MAX), 0, MAX);
  io.emit("state", state);
}

setInterval(() => tick(false), INTERVALMS);

httpServer.listen(PORT, () => console.log("Server ▶", PORT));
