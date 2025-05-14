const socket = io();

// Templates
const msgTemplate = document.getElementById("message-template").innerHTML;
const locationTemplate = document.getElementById(
  "location-message-template"
).innerHTML;
const sidebarTemplate = document.getElementById("sidebar-template").innerHTML;

// DOM Elements
const $messages = document.getElementById("messages");
const $messageForm = document.querySelector("form");
const $messageFormInput = $messageForm.querySelector("input[name='message']"); // More specific selector
const $messageFormButton = $messageForm.querySelector("button.send-btn"); // More specific selector
const $sendLocationButton = document.getElementById("sendLocation");
const $heartbeatStatus = document.getElementById("heartbeat-status");
const $sidebar = document.getElementById("sidebar");

// Options (Query Strings)
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});
const currentUserIsAdmin = username.toLowerCase().includes("dimas");

const autoscroll = () => {
  const $newMessage = $messages.lastElementChild;
  if (!$newMessage) return;
  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;
  const visibleHeight = $messages.offsetHeight;
  const containerHeight = $messages.scrollHeight;
  const scrollOffset = $messages.scrollTop + visibleHeight;
  if (containerHeight - newMessageHeight <= scrollOffset + 1) {
    $messages.scrollTop = $messages.scrollHeight;
  }
};

socket.on("message", (msg) => {
  const html = Mustache.render(msgTemplate, {
    username: msg.username,
    msg: msg.text,
    createdAt: moment(msg.createdAt).format("H:mm"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("locationMessage", (url) => {
  const html = Mustache.render(locationTemplate, {
    username: url.username,
    url: url.text,
    createdAt: moment(url.createdAt).format("H:mm"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("roomData", ({ room: currentRoom, users }) => {
  // Renamed room to currentRoom to avoid conflict
  const usersWithContext = users.map((user) => ({
    ...user,
    isCurrentUser: user.username.toLowerCase() === username.toLowerCase(),
    currentUserIsAdmin: currentUserIsAdmin,
  }));
  const html = Mustache.render(sidebarTemplate, {
    room: currentRoom, // Use the renamed variable
    users: usersWithContext,
  });
  $sidebar.innerHTML = html;
});

// --- Visible Heartbeat Logic (Client) ---
let lastPingFromServerTimestamp = 0;
let lastPongSentTimestamp = 0;
socket.on("custom_ping", (data) => {
  lastPingFromServerTimestamp = Date.now();
  console.log(
    `Client: Received custom_ping (ID: ${data.pingId}), sending pong.`
  );
  socket.emit("custom_pong", { pingId: data.pingId });
  lastPongSentTimestamp = Date.now();
  if ($heartbeatStatus) {
    $heartbeatStatus.textContent = `Heartbeat: Ping @ ${moment(
      lastPingFromServerTimestamp
    ).format("H:mm:ss")}. Pong sent.`;
    $heartbeatStatus.style.color = "darkorange";
  }
});
setInterval(() => {
  if (!$heartbeatStatus) return;
  const now = Date.now();
  if (lastPingFromServerTimestamp === 0 && socket.connected) {
    $heartbeatStatus.textContent =
      "Heartbeat: Connected. Awaiting server ping...";
    $heartbeatStatus.style.color = "blue";
  } else if (
    socket.connected &&
    now - lastPingFromServerTimestamp > VISIBLE_HEARTBEAT_INTERVAL + 2000
  ) {
    // Use constant if available
    $heartbeatStatus.textContent = `Heartbeat: No ping since ${moment(
      lastPingFromServerTimestamp
    ).format("H:mm:ss")}. Check connection.`;
    $heartbeatStatus.style.color = "red";
  } else if (socket.connected) {
    if (
      (now - lastPongSentTimestamp < 3000 &&
        lastPongSentTimestamp >= lastPingFromServerTimestamp) ||
      now - lastPingFromServerTimestamp < 3000
    ) {
      $heartbeatStatus.textContent = `Heartbeat: Active (${moment().format(
        "H:mm:ss"
      )})`;
      $heartbeatStatus.style.color = "green";
    } else if (
      $heartbeatStatus.style.color !== "red" &&
      $heartbeatStatus.style.color !== "darkorange"
    ) {
      $heartbeatStatus.textContent = `Heartbeat: Monitoring... (${moment().format(
        "H:mm:ss"
      )})`;
      $heartbeatStatus.style.color = "darkolivegreen";
    }
  } else {
    $heartbeatStatus.textContent = "Heartbeat: Disconnected.";
    $heartbeatStatus.style.color = "grey";
  }
}, 2500);
const VISIBLE_HEARTBEAT_INTERVAL = 7000; // Define for client-side check, should match server
// --- End Visible Heartbeat Logic (Client) ---

// --- Handle Kick Event (Client) ---
$sidebar.addEventListener("click", (e) => {
  if (e.target.classList.contains("kick-btn")) {
    if (!currentUserIsAdmin) {
      alert("You do not have permission to kick users.");
      return;
    }
    const targetSocketId = e.target.dataset.id;
    if (
      confirm(
        `Are you sure you want to kick this user? (ID: ${targetSocketId})`
      )
    ) {
      console.log(`Client: Attempting to kick user with ID: ${targetSocketId}`);
      socket.emit("kickUser", { targetSocketId, room }, (response) => {
        // Send current room
        if (typeof response === "string" && response.startsWith("Error:")) {
          alert(response);
          console.error("Kick error:", response);
        } else {
          alert(response); // Should be "User kicked successfully."
          console.log("Kick success:", response);
        }
      });
    }
  }
});
socket.on("kicked", (data) => {
  alert(`${data.text}\nYou will be redirected to the join page.`);
  location.href = "/";
});
// --- End Handle Kick Event (Client) ---

$messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  $messageFormButton.setAttribute("disabled", "disabled");
  const message = $messageFormInput.value;
  socket.emit("sendMessage", message, (response) => {
    $messageFormButton.removeAttribute("disabled");
    $messageFormInput.value = "";
    $messageFormInput.focus();
    if (response !== "Sent!") {
      console.error("Server send error:", response);
      const errorDiv = document.createElement("div");
      errorDiv.classList.add("message"); // Use existing message styling
      errorDiv.innerHTML = `<p><span class="message__name">Chat System (☞ﾟヮﾟ)☞</span> <span class="message__meta">${moment().format(
        "H:mm"
      )}</span></p><p style="color:red;">${response}</p>`;
      $messages.insertAdjacentElement("beforeend", errorDiv);
      autoscroll();
    } else {
      console.log("Message status:", response);
    }
  });
});

$sendLocationButton.addEventListener("click", () => {
  if (!navigator.geolocation)
    return alert("Geolocation is not supported by your browser.");
  $sendLocationButton.setAttribute("disabled", "disabled");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      socket.emit(
        "sendLocation",
        { lat: position.coords.latitude, long: position.coords.longitude },
        (response) => {
          $sendLocationButton.removeAttribute("disabled");
          console.log("Location status:", response);
        }
      );
    },
    () => {
      alert("Unable to retrieve your location.");
      $sendLocationButton.removeAttribute("disabled");
    }
  );
});

socket.emit("join", { username, room }, (error) => {
  if (error) {
    alert(error);
    location.href = "/";
  } else {
    console.log("Client: Successfully joined room.");
    if ($heartbeatStatus) {
      $heartbeatStatus.textContent =
        "Heartbeat: Joined. Awaiting server ping...";
      $heartbeatStatus.style.color = "blue";
    }
  }
});
