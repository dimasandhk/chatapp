const socket = io();

const msgTemplate = document.getElementById("message-template").innerHTML;
const locationTemplate = document.getElementById("location-message-template").innerHTML;
const sidebarTemplate = document.getElementById("sidebar-template").innerHTML;

// Query Strings
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

socket.on("message", (msg) => {
	console.log(msg);

	const html = Mustache.render(msgTemplate, {
		username: msg.username || "Admin",
		msg: msg.text,
		createdAt: moment(msg.createdAt).format("H:mm")
	});
	document.getElementById("messages").insertAdjacentHTML("beforeend", html);
});

socket.on("locationMessage", (url) => {
	const html = Mustache.render(locationTemplate, {
		username: url.username,
		url: url.text,
		createdAt: moment(url.createdAt).format("H:mm")
	});
	document.getElementById("messages").insertAdjacentHTML("beforeend", html);
});

socket.on("roomData", ({ room, users }) => {
	const html = Mustache.render(sidebarTemplate, {
		room,
		users
	});

	document.getElementById("sidebar").innerHTML = html;
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

socket.emit("join", { username, room }, (error) => {
	if (error) {
		alert(error);
		location.href = "/";
	}
});
