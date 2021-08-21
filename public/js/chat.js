const socket = io();

socket.on("countUpdated", (count) => {
	console.log(count);
});

const btn = document.getElementById("increment");
btn.addEventListener("click", () => {
	console.log("objecclickt");
	socket.emit("increment");
});
