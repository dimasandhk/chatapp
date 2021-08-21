const express = require("express");
const app = express();
const socketio = require("socket.io");

const http = require("http");
const server = http.createServer(app);
const io = socketio(server);

const path = require("path");
const PORT = process.env.PORT || 3030;

app.use(express.static(path.join(__dirname, "../public")));

let count = 0;
io.on("connection", (socket) => {
	console.log("New Websocket Connection");

	socket.emit("countUpdated", count);
	socket.on("increment", () => {
		count++;
		// socket.emit("countUpdated", count);
		io.emit("countUpdated", count);
	});
});

server.listen(PORT, () => console.log(`Up on port ${PORT}`));
