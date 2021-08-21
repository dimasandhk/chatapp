const socket = io();

socket.on("message", (msg) => {
	console.log(msg);
});

const form = document.querySelector("form");
const input = document.querySelector("input");

form.addEventListener("submit", (e) => {
	e.preventDefault();
	socket.emit("sendMessage", input.value);
});

// socket.on("countUpdated", (count) => {
// 	console.log(count);
// });

// const btn = document.getElementById("increment");
// btn.addEventListener("click", () => {
// 	console.log("objecclickt");
// 	socket.emit("increment");
// });
