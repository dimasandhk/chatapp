const express = require("express");
const app = express();

const Filter = require("bad-words");
const socketio = require("socket.io");

const http = require("http");
const server = http.createServer(app);
const io = socketio(server);

const path = require("path");
const PORT = process.env.PORT || 3030;

const { generateMessage } = require("./utils/messages");
const { addUser, removeUser, getUser, getUsersInRoom } = require("./utils/users");

app.use(express.static(path.join(__dirname, "../public")));

// let count = 0;
io.on("connection", (socket) => {
	console.log("New Websocket Connection");

	// !!! Socket Room
	socket.on("join", (optData, callback) => {
		const { error, user } = addUser({ id: socket.id, ...optData });
		if (error) return callback(error);

		const broadcastRoom = socket.broadcast.to(user.room);
		socket.join(user.room);

		socket.emit("message", generateMessage("Chat System (☞ﾟヮﾟ)☞", "Welcome!"));
		broadcastRoom.emit(
			"message",
			generateMessage("Chat System (☞ﾟヮﾟ)☞", `${user.username} has joined!`)
		);

		io.to(user.room).emit("roomData", {
			room: user.room,
			users: getUsersInRoom(user.room)
		});

		callback();
	});

	socket.on("sendMessage", (msg, callback) => {
		const user = getUser(socket.id);
		const filtered = new Filter();

		io.to(user.room).emit("message", generateMessage(user.username, filtered.clean(msg)));
		callback("Sent!");
	});

	socket.on("sendLocation", (position, callback) => {
		const user = getUser(socket.id);

		io.to(user.room).emit(
			"locationMessage",
			generateMessage(user.username, `https://google.com/maps?q=${position.lat},${position.long}`)
		);
		callback("Location shared!");
	});

	socket.on("disconnect", () => {
		const user = removeUser(socket.id);
		if (user) {
			io.to(user.room).emit("message", generateMessage(`${user.username} has Left`));
			io.to(user.room).emit("roomData", {
				room: user.room,
				users: getUsersInRoom(user.room)
			});
		}
	});
});

server.listen(PORT, () => console.log(`Up on port ${PORT}`));
