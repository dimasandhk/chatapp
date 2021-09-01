const socket = io();

socket.on("message", (msg) => {
	console.log(msg);
});

const form = document.querySelector("form");
const input = document.querySelector("input");

form.addEventListener("submit", (e) => {
	e.preventDefault();

	input.setAttribute("disabled", "disabled");

	socket.emit("sendMessage", input.value, (scs) => {
		input.removeAttribute("disabled");
		input.value = "";
		input.focus();

		console.log(scs);
	});
});

const locationBtn = document.getElementById("sendLocation");
locationBtn.addEventListener("click", () => {
	if (!navigator.geolocation) return alert("Cannot use location feature");

	locationBtn.setAttribute("disabled", "disabled");
	navigator.geolocation.getCurrentPosition((pos) => {
		const obj = {
			lat: pos.coords.latitude,
			long: pos.coords.longitude
		};

		locationBtn.removeAttribute("disabled");
		socket.emit("sendLocation", obj, (scs) => console.log(scs));
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
