const Tenant = require("../models/Tenant");
const User = require("../models/User");
const Room = require("../models/Room");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const getTenantFinancialSummary = require("../utils/tenantSummary");
const getAvailableBed = require("../utils/bedAllocation");
const generateTempPassword = require("../utils/generateTempPassword");
const sendTenantCredentials = require("../utils/sendTenantCredentials");

// Create Tenant
exports.createTenant = async (req, res, next) => {
	try {
		const { hostelId } = req.params;
		const { name, email, phone, roomId } = req.body;

		// Check email is not already taken
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(400).json({ success: false, message: "Email already exists" });
		}

		// Validate room - must exist and belong to the hostel
		const room = await Room.findOne({ _id: roomId, hostel: hostelId });
		if (!room) {
			return res.status(404).json({ success: false, message: "Room not found in this hostel" });
		}

		// Check room is not under maintenance
		if (room.status === "maintenance") {
			return res.status(400).json({ success: false, message: "Room is under maintenance" });
		}

		// Count active tenants
		const activeCount = await Tenant.countDocuments({ room: room._id, status: "active" });
		if (activeCount >= room.capacity) {
			return res.status(400).json({ success: false, message: "Room is full" });
		}

		// Find the first available bed number
		const bedNumber = await getAvailableBed(room._id, room.capacity);
		if (!bedNumber) {
			return res.status(400).json({ success: false, message: "No bed available" });
		}

		// Create user account for the tenant
		const tempPassword = generateTempPassword();
		const hashedPassword = await bcrypt.hash(tempPassword, 10);

		const user = await User.create({
			name,
			email,
			password: hashedPassword,
			role: "tenant",
			phone,
			mustChangePassword: true
		});

		// Create the Tenant document with the allocated bed
		const tenant = await Tenant.create({
			user: user._id,
			hostel: hostelId,
			room: room._id,
			bedNumber,
			phone
		});

		if (req.file) {
			tenant.idProof = {
				url: req.file.path,
				publicId: req.file.filename,
				uploadedAt: new Date()
			};
			await tenant.save();
		}

		// Add tenant reference to the Room's tenants array
		await Room.findByIdAndUpdate(room._id, {
			$addToSet: { tenants: tenant._id }
		});

		// Update room status automatically
		// If this new tenant fills the last bed -> "occupied", else says "available"
		const newOccupancy = activeCount + 1;
		await Room.findByIdAndUpdate(room._id, {
			status: newOccupancy >= room.capacity ? "occupied" : "available"
		});

		// Send credentials email asynchronously (don't block the response)
		sendTenantCredentials(email, tempPassword).catch(err => {
			console.error("Failed to send email to", email, err);
		});

		res.status(201).json({
			success: true,
			tenant,
			credentials: {
				email,
				tempPassword
			}
		});
	} catch (error) {
		next(error);
	}
};

exports.getTenants = async (req, res, next) => {
	try {
		const { hostelId } = req.params;
		const { status, room, search } = req.query;

		// Force scoping to current hostel
		const query = { hostel: hostelId };

		if (status) query.status = status;
		if (room) query.room = room;

		let tenants = await Tenant.find(query)
			.populate("user", "-password")
			.populate("room");

		// Client side filtering for names (can be moved to DB regex later)
		if (search) {
			tenants = tenants.filter(tenant =>
				tenant.user?.name?.toLowerCase().includes(search.toLowerCase())
			);
		}

		res.json({ success: true, count: tenants.length, tenants });
	} catch (error) {
		next(error);
	}
};

exports.getTenantById = async (req, res, next) => {
	try {
		const { hostelId, id } = req.params;

		const tenant = await Tenant.findOne({ _id: id, hostel: hostelId })
			.populate("user", "-password")
			.populate("room");

		if (!tenant) {
			return res.status(404).json({ success: false, message: "Tenant not found" });
		}


		res.json({ success: true, tenant });
	} catch (error) {
		next(error)
	}
};

exports.updateTenant = async (req, res, next) => {
	try {
		const { hostelId, id } = req.params;

		// Only allow safe fields to be updated directly
		const { phone, emergencyContact, notes, status, roomId } = req.body;

		const tenant = await Tenant.findOne({ _id: id, hostel: hostelId });
		if (!tenant) {
			return res.status(404).json({ success: false, message: "Tenant not found" });
		}

		// Update simple fields if provided
		if (phone) tenant.phone = phone;
		if (emergencyContact) tenant.emergencyContact = emergencyContact;
		if (notes !== undefined) tenant.notes = notes;

		// Handle status change
		if (status && status !== tenant.status) {
			const oldStatus = tenant.status;
			tenant.status = status;

			// free bed if tenant is leaving or becoming inactive
			// recalculate room status
			if (status === "vacated" || status === "inactive") {
				// Fetch room to get capacity for the status comparison
				const room = await Room.findById(tenant.room);
				const remainingActive = await Tenant.countDocuments({
					room: tenant.room,
					status: "active",
					_id: { $ne: tenant._id } // exclude current tenant
				});

				// Set room to occupied only if remaining active tenants fill it; else available
				await Room.findByIdAndUpdate(tenant.room, {
					status: remainingActive >= room.capacity ? "occupied" : "available"
				});

				// Remove from room's tenant array if leaving permanently
				if (status === "vacated") {
					await Room.findByIdAndUpdate(tenant.room, {
						$pull: { tenants: tenant._id }
					});
				}
			}

			// If reactivating a tenant (inactive -> active), check bed/capacity again
			if (status === "active" && oldStatus !== "active") {
				const room = await Room.findById(tenant.room);
				const activeCount = await Tenant.countDocuments({
					room: tenant.room,
					status: "active"
				});

				if (activeCount >= room.capacity) {
					return res.status(400).json({ success: false, message: "Room is now full, cannot reactivate" });
				}

				// Re-asign a bed (their old bed may be taken)
				const newBed = await getAvailableBed(tenant.room, room.capacity);
				if (!newBed) {
					return res.status(400).json({ success: false, message: "No bed available" });
				}
				tenant.bedNumber = newBed;
			}
		}

		// Handle room transfer
		if (roomId && roomId.toString() !== tenant.room.toString()) {
			const newRoom = await Room.findOne({ _id: roomId, hostel: hostelId });
			if (!newRoom) {
				return res.status(404).json({ success: false, message: "New room not found" });
			}

			if (newRoom.status === "maintenance") {
				return res.status(400).json({ success: false, message: "Target room is under maintenance" });
			}

			const activeInNewRoom = await Tenant.countDocuments({ room: newRoom._id, status: "active" });
			if (activeInNewRoom >= newRoom.capacity) {
				return res.status(400).json({ success: false, message: "Target room is full" });
			}

			const newBed = await getAvailableBed(newRoom._id, newRoom.capacity);
			if (!newBed) {
				return res.status(400).json({ success: false, message: "No bed available in target room" });
			}

			const oldRoomId = tenant.room;

			// Update old room - remove tenant reference, recalculate status
			await Room.findByIdAndUpdate(oldRoomId, { $pull: { tenants: tenant._id } });
			const remainingInOldRoom = await Tenant.countDocuments({
				room: oldRoomId, status: "active", _id: { $ne: tenant._id }
			});

			const oldRoom = await Room.findById(oldRoomId);
			await Room.findByIdAndUpdate(oldRoomId, {
				status: remainingInOldRoom >= oldRoom.capacity ? "occupied" : "available"
			});

			// Move tenant to new room
			tenant.room = newRoom._id;
			tenant.bedNumber = newBed;

			// Update new room
			await Room.findByIdAndUpdate(newRoom._id, { $addToSet: { tenants: tenant._id } });
			const newOccupancy = activeInNewRoom + 1;
			await Room.findByIdAndUpdate(newRoom._id, {
				status: newOccupancy >= newRoom.capacity ? "occupied" : "available"
			});
		}

		await tenant.save();
		res.json({ success: true, tenant });
	} catch (error) {
		next(error);
	}
};

exports.uploadIdProof = async (req, res, next) => {
	try {
		const { hostelId, id } = req.params;

		if (!req.file) {
			return res.status(400).json({ success: false, message: "No file uploaded" });
		}

		const tenant = await Tenant.findOne({ _id: id, hostel: hostelId });
		if (!tenant) {
			return res.status(404).json({ success: false, message: "Tenant not found" });
		}

		tenant.idProof = {
			url: req.file.path,
			publicId: req.file.filename,
			uploadedAt: new Date()
		};

		await tenant.save();

		res.json({ success: true, message: "ID proof uploaded successfully", idProof: tenant.idProof });
	} catch (error) {
		next(error);
	}
};

exports.checkOutTenant = async (req, res, next) => {
	const session = await mongoose.startSession();
	try {
		session.startTransaction();

		const { hostelId, id } = req.params;

		// 1. Find tenant - scoped to this hostel for security
		const tenant = await Tenant.findOne({ _id: id, hostel: hostelId }).session(session);
		if (!tenant) {
			await session.abortTransaction();
			return res.status(404).json({ success: false, message: "Tenant not found"});
		}

		// 2. Must be active
		if (tenant.status !== "active") {
			await session.abortTransaction();
			return res.status(400).json({
				success: false,
				message: `Tenant is already ${tenant.status}`
			});
		}

		// 3. Financial check - currently a stub, will gate on real dues later
		const financials = await getTenantFinancialSummary(tenant._id);
		const force = req.query.force === "true";

		if (financials.pendingAmount > 0 && !force) {
			await session.abortTransaction();
			return res.status(400).json({
				success: false,
				message: "Tenant has pending dues. Use ?force=true to override.",
				pendingAmount: financials.pendingAmount
			});
		}

		// 4. Fetch room inside the transaction
		const room = await Room.findById(tenant.room).session(session);
		if (!room) {
			await session.abortTransaction();
			return res.status(404).json({ success: false, message: "Room not found"});
		}

		// 5. Mark tenant as vacated
		const checkOutDate = new Date();
		tenant.status = "vacated";
		tenant.checkOutDate = checkOutDate;
		await tenant.save({ session });

		// 6. Recount active tenants - the source of truth approach
		// (we never trust a cached counter)
		const remainingActive = await Tenant.countDocuments({
			room: room._id,
			status: "active"
		}).session(session);

		// 7. Remove from room's tenants reference array + update  room status
		room.status = remainingActive >= room.capacity ? "occupied" : "available";
		// Remove this tenant from the room's tenants array
		room.tenants = room.tenants.filter(
			tId  => tId.toString() !== tenant._id.toString()
		);
		await room.save({ session });

		// 8. Commit both writes automatically
		await session.commitTransaction();

		// 9. Calculate stay duration for the response summary
		const daysStayed = Math.ceil(
			(checkOutDate - tenant.checkInDate) / (1000*60*60*24)
		);

		res.json({
			success: true,
			message: `Tenant checked out successfully`,
			summary: {
				daysStayed,
				checkInDate: tenant.checkInDate,
				checkOutDate,
				bedNumber: tenant.bedNumber,
				pendingAmount: financials.pendingAmount
			},
			tenant,
			room
		});
	} catch (error) {
		// Always abort on any error to prevent partial writes
		try { await session.abortTransaction(); } catch (_) {}
		next(error);
	} finally { session.endSession()
	}
};

exports.getCheckInSummary = async (req, res, next) => {
	try {
		const { hostelId, id } = req.params;

		const tenant = await Tenant.findOne({ _id: id, hostel: hostelId })
			.populate("user", "name email phone")
			.populate("room", "roomNumber type rent floor");

		if (!tenant) {
			return res.status(404).json({ success: false, message: "Tenant not found" });
		}

		const financials = await getTenantFinancialSummary(tenant._id);

		// Use checkOutDate if already vacated; otherwise use now for a preview
		const endDate = tenant.checkOutDate || new Date();
		const daysStayed = Math.ceil(
				(endDate - tenant.checkInDate) / (1000 * 60 * 60 * 24)
		);

		// Expected checkout date is either explicitly set or estimated as 30 days from check in
		const expectedCheckOutDate = tenant.expectedCheckOutDate || new Date(tenant.checkInDate.getTime() + 30 * 24 * 60 * 60 * 1000);

		res.json({
			success: true,
			tenant: {
				_id: tenant._id,
				user: tenant.user,
				room: tenant.room,
				bedNumber: tenant.bedNumber,
				status: tenant.status,
				checkInDate: tenant.checkInDate,
				checkOutDate: tenant.checkOutDate,
				expectedCheckOutDate
			},

			summary: {
				daysStayed,
				totalPaid: financials.totalPaid,
				totalInvoiced: financials.totalInvoiced,
				pendingAmount: financials.pendingAmount,
				// Convenience: estimated total rent based on days * monthly rent
				estimatedRent: tenant.room?.rent
					? Math.round((tenant.room.rent / 30) * daysStayed)
					: null
			}
		});
	} catch (error) {
		next(error);
	}
};