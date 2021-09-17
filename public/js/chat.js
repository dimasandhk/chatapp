const socket = io();

const msgTemplate = document.getElementById("message-template").innerHTML;
const locationTemplate = document.getElementById("location-message-template").innerHTML;
socket.on("message", (msg) => {
	console.log(msg);

	const html = Mustache.render(msgTemplate, {
		msg: msg.text,
		createdAt: moment(msg.createdAt).format("H:mm")
	});
	document.getElementById("messages").insertAdjacentHTML("beforeend", html);
});

socket.on("locationMessage", (url) => {
	const html = Mustache.render(locationTemplate, {
		url: url.text,
		createdAt: moment(url.createdAt).format("H:mm")
	});
	document.getElementById("messages").insertAdjacentHTML("beforeend", html);
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
