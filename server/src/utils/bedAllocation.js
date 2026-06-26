const Tenant = require("../models/Tenant");

// Finds the first available bed number in room.
// Returns a number (e.g. 1, 2, 3) or null if the room is full.
// roomId - ObjectId of the room
// capacity - room.capacity (the max beds)

const getAvailableBed = async (roomId, capacity) => {
	// Get bed numbers of all ACTIVE tenants in this room
	const activeTenants = await Tenant.find({
		room: roomId,
		status: "active"
	}).select("bedNumber");

	const takenBeds = activeTenants.map(t => t.bedNumber);

	// Find the first gap in sequence 1, 2, 3 .. capacity
	for (let i = 1; i <= capacity; i++) {
		if (!takenBeds.includes(i)) {
			return i;
		}
	}

	// All beds are taken
	return null;
};

module.exports = getAvailableBed;
