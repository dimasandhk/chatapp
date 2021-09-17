const users = [];

// addUser, removeUser, getUser, getUsersInRoom

const addUser = ({ id, username, room }) => {
	// Clean the data
	username = username.trim().toLowerCase();
	room = room.trim().toLowerCase();

	// Validate
	if (!username || !room) return { error: "Username and Room are required" };

	// Check Existing User
	const existingUser = users.find((user) => user.room === room && user.username === username);
	if (existingUser) return { error: "Username is in use" };

	// Stored user
	const user = { id, username, room };
	users.push(user);

	return user;
};

const removeUser = (id) => {
	const index = users.findIndex((user) => user.id == id);
	if (index !== -1) return users.splice(index, 1)[0];
};

const getUser = (id) => users.find((user) => user.id === id);

const getUsersInRoom = (room) => {
	const usersInRoom = users.filter((user) => user.room === room);
	return usersInRoom;
};

module.exports = { getUser, removeUser, getUsersInRoom, addUser };
