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

const locationBtn = document.getElementById("sendLocation");
locationBtn.addEventListener("click", () => {
	if (!navigator.geolocation) return alert("Cannot use location feature");

	navigator.geolocation.getCurrentPosition((pos) => {
		const obj = {
			lat: pos.coords.latitude,
			long: pos.coords.longitude
		};

		socket.emit("sendLocation", obj);
	});
});

// socket.on("countUpdated", (count) => {
// 	console.log(count);
// });

// const btn = document.getElementById("increment");
// btn.addEventListener("click", () => {
// 	console.log("objecclickt");
// 	socket.emit("increment");
// });
