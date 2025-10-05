// CommonJS version
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
app.get("/", (_, res) => res.send("ok"));
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173", // Vite
      "http://localhost:8000", // melon boilerplate dev server
      "https://your-frontend.example.com"
    ],
    methods: ["GET", "POST"],
  },
  transports: ["websocket"],
});

// roomId -> Map<socketId, playerState>
const rooms = new Map();
const getRoom = (id) => rooms.get(id) || (rooms.set(id, new Map()), rooms.get(id));

io.on("connection", (socket) => {
  let last = 0;
  const minMs = 100; // 10 Hz

  socket.on("join", ({ roomId = "main", name = "Guest", image = "" } = {}) => {
    socket.data.roomId = roomId;
    socket.join(roomId);
    const room = getRoom(roomId);

    const me = { id: socket.id, name, avatar: image, x: 200, y: 200, dir: "D" };
    room.set(socket.id, me);

    socket.emit("state:init", Array.from(room.values()));
    socket.to(roomId).emit("player:add", me);
  });

  socket.on("state", (p = {}) => {
    const now = Date.now();
    if (now - last < minMs) return;
    last = now;

    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = getRoom(roomId);
    const cur = room.get(socket.id);
    if (!cur) return;

    const x = Number(p.x), y = Number(p.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    cur.x = x; cur.y = y; cur.dir = p.dir || cur.dir;
    socket.to(roomId).emit("player:upd", cur);
  });

  function cleanup() {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = getRoom(roomId);
    if (room.delete(socket.id)) {
      socket.to(roomId).emit("player:del", socket.id);
      if (room.size === 0) rooms.delete(roomId);
    }
  }
  socket.on("leave", cleanup);
  socket.on("disconnect", cleanup);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("WS server on :" + PORT));
