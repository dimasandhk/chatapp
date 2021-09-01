const express = require("express");
const app = express();

const Filter = require("bad-words");
const socketio = require("socket.io");

const http = require("http");
const server = http.createServer(app);
const io = socketio(server);

const path = require("path");
const PORT = process.env.PORT || 3030;

app.use(express.static(path.join(__dirname, "../public")));

// let count = 0;
io.on("connection", (socket) => {
	console.log("New Websocket Connection");

	socket.emit("message", "Welcome!");
	socket.broadcast.emit("message", "A New User has Joined!");

	socket.on("sendMessage", (msg, callback) => {
		const filtered = new Filter();
		io.emit("message", filtered.clean(msg));
		callback("Sent!");
	});

	socket.on("sendLocation", (position, callback) => {
		io.emit("message", `https://google.com/maps?q=${position.lat},${position.long}`);
		callback("Location shared!");
	});

	socket.on("disconnect", () => io.emit("message", "A User has Left"));
});

server.listen(PORT, () => console.log(`Up on port ${PORT}`));
