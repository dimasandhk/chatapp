const express = require("express");
const app = express();

const Filter = require("bad-words");
const socketio = require("socket.io");

// --- HTTPS and WSS requirements ---
const https = require("https");
const fs = require("fs");
const path = require("path");

// --- SSL Configuration ---
let server;
try {
  const options = {
    key: fs.readFileSync(path.join(__dirname, "../ssl/key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "../ssl/cert.pem")),
  };
  server = https.createServer(options, app);
} catch (error) {
  console.warn(
    "SSL certificates not found or unreadable. Falling back to HTTP. WSS will not be available."
  );
  console.warn("To enable WSS, create ssl/key.pem and ssl/cert.pem.");
  const http = require("http");
  server = http.createServer(app);
}
// --- End HTTPS and WSS requirements ---

const io = socketio(server, {
  pingInterval: 10000,
  pingTimeout: 5000,
});

const PORT = process.env.PORT || 3030;

const { generateMessage } = require("./utils/messages");
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./utils/users");

app.use(express.static(path.join(__dirname, "../public")));

// --- Connection Limiting Configuration ---
const MAX_TOTAL_CONNECTIONS = 100;
const MAX_IP_CONNECTIONS = 5;
let currentTotalConnections = 0;
const ipConnectionCounts = new Map();

// --- Visible Heartbeat Configuration ---
const VISIBLE_HEARTBEAT_INTERVAL = 7000;

// Helper function to check for admin privileges
const isAdmin = (username) => {
  if (!username) return false;
  return username.toLowerCase().includes("dimas");
};

io.on("connection", (socket) => {
  const clientIp = socket.handshake.address;

  // --- Connection Limiting Logic ---
  if (currentTotalConnections >= MAX_TOTAL_CONNECTIONS) {
    console.log(
      `Max total connections (${MAX_TOTAL_CONNECTIONS}) reached. Rejecting new connection from ${clientIp}.`
    );
    socket.disconnect(true);
    return;
  }
  const currentIpCount = ipConnectionCounts.get(clientIp) || 0;
  if (currentIpCount >= MAX_IP_CONNECTIONS) {
    console.log(
      `Max connections for IP ${clientIp} (${MAX_IP_CONNECTIONS}) reached. Rejecting.`
    );
    socket.disconnect(true);
    return;
  }
  currentTotalConnections++;
  ipConnectionCounts.set(clientIp, currentIpCount + 1);
  console.log(
    `New Websocket Connection from ${clientIp}. IP count: ${
      ipConnectionCounts.get(clientIp) || 0
    }. Total connections: ${currentTotalConnections}`
  );
  // --- End Connection Limiting Logic ---

  // --- Visible Heartbeat (Server) ---
  let visibleHeartbeatIntervalId;
  const startVisibleHeartbeat = () => {
    if (visibleHeartbeatIntervalId) clearInterval(visibleHeartbeatIntervalId);
    visibleHeartbeatIntervalId = setInterval(() => {
      const user = getUser(socket.id);
      const pingId = Date.now();
      console.log(
        `Server: Sending custom_ping (ID: ${pingId}) to ${
          user ? user.username : socket.id
        }`
      );
      socket.emit("custom_ping", { pingId });
    }, VISIBLE_HEARTBEAT_INTERVAL);
  };
  socket.on("custom_pong", (data) => {
    const user = getUser(socket.id);
    console.log(
      `Server: Received custom_pong for pingId ${data.pingId} from ${
        user ? user.username : socket.id
      }`
    );
  });
  // --- End Visible Heartbeat (Server) ---

  socket.on("join", (optData, callback) => {
    const { error, user } = addUser({ id: socket.id, ...optData });
    if (error) return callback(error);

    socket.join(user.room);
    startVisibleHeartbeat();

    socket.emit("message", generateMessage("Chat System (☞ﾟヮﾟ)☞", "Welcome!"));
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage("Chat System (☞ﾟヮﾟ)☞", `${user.username} has joined!`)
      );

    const usersInRoom = getUsersInRoom(user.room).map((u) => ({
      ...u,
      isAdmin: isAdmin(u.username),
    }));
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: usersInRoom,
    });
    callback();
  });

  socket.on("sendMessage", (msg, callback) => {
    const user = getUser(socket.id);
    if (!user) return callback("Error: Not joined. Please join a room first.");
    const filter = new Filter();
    if (filter.isProfane(msg)) return callback("Profanity is not allowed.");
    io.to(user.room).emit(
      "message",
      generateMessage(user.username, filter.clean(msg))
    );
    callback("Sent!");
  });

  socket.on("sendLocation", (position, callback) => {
    const user = getUser(socket.id);
    if (!user) return callback("Error: Not joined. Please join a room first.");
    io.to(user.room).emit(
      "locationMessage",
      generateMessage(
        user.username,
        `https://google.com/maps?q=${position.lat},${position.long}`
      )
    );
    callback("Location shared!");
  });

  socket.on("kickUser", ({ targetSocketId, room }, callback) => {
    const kicker = getUser(socket.id);
    if (!kicker) return callback("Error: You are not properly joined.");
    if (!isAdmin(kicker.username))
      return callback("Error: You do not have permission to kick users.");

    const targetUser = getUser(targetSocketId);
    if (!targetUser)
      return callback("Error: Target user not found or already disconnected.");
    if (targetUser.room !== kicker.room || targetUser.room !== room)
      return callback("Error: Target user is not in this room.");
    if (targetUser.id === kicker.id)
      return callback("Error: You cannot kick yourself.");

    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (!targetSocket)
      return callback("Error: Could not find target user's connection.");

    targetSocket.emit(
      "kicked",
      generateMessage(
        "Chat System (☞ﾟヮﾟ)☞",
        `You have been kicked from the room by ${kicker.username}.`
      )
    );
    targetSocket.disconnect(true);

    io.to(kicker.room).emit(
      "message",
      generateMessage(
        "Chat System (☞ﾟヮﾟ)☞",
        `${targetUser.username} has been kicked by ${kicker.username}.`
      )
    );
    callback("User kicked successfully.");
  });

  socket.on("disconnect", () => {
    if (visibleHeartbeatIntervalId) {
      clearInterval(visibleHeartbeatIntervalId);
      console.log(`Server: Stopped visible heartbeat for ${socket.id}`);
    }

    currentTotalConnections--;
    const countForIp = ipConnectionCounts.get(clientIp);
    if (countForIp && countForIp > 1) {
      ipConnectionCounts.set(clientIp, countForIp - 1);
    } else {
      ipConnectionCounts.delete(clientIp);
    }
    console.log(
      `Socket from ${clientIp} disconnected. IP count: ${
        ipConnectionCounts.get(clientIp) || 0
      }. Total connections: ${currentTotalConnections}`
    );
    if (currentTotalConnections < 0) currentTotalConnections = 0;

    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage(
          "Chat System (☞ﾟヮﾟ)☞",
          `${user.username} has left or been disconnected.`
        )
      );
      const usersInRoom = getUsersInRoom(user.room).map((u) => ({
        ...u,
        isAdmin: isAdmin(u.username),
      }));
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: usersInRoom,
      });
    }
  });
});

server.listen(PORT, () =>
  console.log(
    `Server is up on port ${PORT}. Access via ${
      server instanceof https.Server ? "https" : "http"
    }://localhost:${PORT}`
  )
);
