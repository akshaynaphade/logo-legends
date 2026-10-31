const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.get("/", (_req, res) => res.json({ service: "Logo Legends realtime server", ok: true }));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN || "*", methods: ["GET", "POST"] } });

const PORT = process.env.PORT || 4000;
const rooms = new Map();
const QUESTIONS = [
  { brand: "Koenigsegg", clue: "Swedish hypercar maker; its emblem features a shield.", options: ["Koenigsegg", "Pagani", "Rimac", "Spyker"] },
  { brand: "Pagani", clue: "Italian hypercar maker founded by Horacio; known for a stylized wordmark.", options: ["Pagani", "Bugatti", "Maserati", "Abarth"] },
  { brand: "Genesis", clue: "Luxury marque with a winged crest, spun off from a Korean manufacturer.", options: ["Genesis", "Bentley", "Aston Martin", "Lincoln"] },
  { brand: "Rimac", clue: "Croatian electric hypercar maker with a distinctive geometric emblem.", options: ["Rimac", "Lotus", "Lucid", "Polestar"] },
  { brand: "Spyker", clue: "Dutch marque whose badge evokes an aircraft propeller.", options: ["Spyker", "Saab", "Aston Martin", "Wiesmann"] },
  { brand: "Isuzu", clue: "Japanese manufacturer whose name comes from a river.", options: ["Isuzu", "Suzuki", "Daihatsu", "Hino"] },
  { brand: "Lancia", clue: "Italian brand with a historic shield-and-spear emblem.", options: ["Lancia", "Alfa Romeo", "Fiat", "DS"] },
  { brand: "Wiesmann", clue: "German sports-car maker known for a gecko emblem.", options: ["Wiesmann", "Morgan", "TVR", "Donkervoort"] },
  { brand: "Lucid", clue: "American electric-car company with a minimalist wordmark.", options: ["Lucid", "Rivian", "Fisker", "Faraday Future"] },
  { brand: "Abarth", clue: "Performance marque whose badge includes a scorpion.", options: ["Abarth", "Lancia", "Cupra", "Alpine"] }
];

function publicState(room) {
  const q = room.status === "playing" ? QUESTIONS[room.round] : null;
  return {
    code: room.code, status: room.status, round: room.round,
    question: q ? { number: room.round + 1, total: QUESTIONS.length, clue: q.clue, brand: q.brand, options: q.options } : null,
    buzzedBy: room.buzzedBy ? room.players.get(room.buzzedBy)?.name || "A player" : null,
    buzzedById: room.buzzedBy,
    answeredPlayerIds: [...room.answered],
    answer: room.answer,
    players: [...room.players.values()].map(p => ({ id: p.id, name: p.name, score: p.score, connected: p.connected })),
    hostId: room.hostId
  };
}
function emitRoom(room) { io.to(room.code).emit("state", publicState(room)); }
function makeCode() {
  let code;
  do { code = crypto.randomBytes(3).toString("hex").toUpperCase(); } while (rooms.has(code));
  return code;
}
function sendError(socket, message) { socket.emit("gameError", message); }

io.on("connection", socket => {
  socket.on("createRoom", ({ name } = {}) => {
    const clean = String(name || "").trim().slice(0, 20);
    if (!clean) return sendError(socket, "Enter a player name.");
    const code = makeCode();
    const player = { id: socket.id, name: clean, score: 0, connected: true };
    const room = { code, hostId: socket.id, players: new Map([[socket.id, player]]), status: "lobby", round: 0, buzzedBy: null, answer: null, answered: new Set() };
    rooms.set(code, room); socket.join(code);
    socket.emit("joined", { code, playerId: socket.id }); emitRoom(room);
  });

  socket.on("joinRoom", ({ code, name } = {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    const clean = String(name || "").trim().slice(0, 20);
    if (!room) return sendError(socket, "Room not found.");
    if (!clean) return sendError(socket, "Enter a player name.");
    if (room.status !== "lobby") return sendError(socket, "This game has already started.");
    if (room.players.size >= 8) return sendError(socket, "Room is full (8 players maximum).");
    const player = { id: socket.id, name: clean, score: 0, connected: true };
    room.players.set(socket.id, player); socket.join(room.code);
    socket.emit("joined", { code: room.code, playerId: socket.id }); emitRoom(room);
  });

  socket.on("startGame", ({ code } = {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.hostId !== socket.id) return sendError(socket, "Only the host can start the game.");
    if (room.players.size < 2) return sendError(socket, "At least two players are required.");
    room.status = "playing"; room.round = 0; room.buzzedBy = null; room.answer = null; room.answered.clear(); emitRoom(room);
  });

  socket.on("buzz", ({ code } = {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.status !== "playing" || room.buzzedBy || room.answered.has(socket.id) || !room.players.has(socket.id)) return;
    room.buzzedBy = socket.id; emitRoom(room);
  });

  socket.on("submitAnswer", ({ code, answer } = {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.status !== "playing" || room.buzzedBy !== socket.id || room.answer) return;
    const player = room.players.get(socket.id);
    if (!player) return;
    const correct = String(answer || "").trim().toLowerCase() === QUESTIONS[room.round].brand.toLowerCase();
    room.answered.add(socket.id);
    if (correct) {
      player.score += 100;
      room.answer = { correct: true, brand: QUESTIONS[room.round].brand, player: player.name };
    } else if (room.answered.size >= room.players.size) {
      room.answer = { correct: false, brand: QUESTIONS[room.round].brand, player: player.name, exhausted: true };
    } else {
      room.buzzedBy = null;
      room.answer = null;
    }
    emitRoom(room);
  });

  socket.on("nextRound", ({ code } = {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.hostId !== socket.id || room.status !== "playing" || !room.answer) return;
    if (room.round >= QUESTIONS.length - 1) room.status = "finished";
    else room.round++;
    room.buzzedBy = null; room.answer = null; room.answered.clear(); emitRoom(room);
  });

  socket.on("disconnect", () => {
    for (const room of rooms.values()) {
      const player = room.players.get(socket.id);
      if (player) { player.connected = false; emitRoom(room); }
    }
  });
});
server.listen(PORT, () => console.log(`Logo Legends server listening on ${PORT}`));
