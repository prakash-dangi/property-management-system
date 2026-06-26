import { useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { createRoom, updateRoom } from "../api/roomApi";
import useRoomStore from "../store/roomStore";

// Props: 
// open - boolean, wheather the model is visible
// onClose - function, called when model should close
// roomData - null (add mode) or room object (edit mode)
// onSuccess - function, called after successful save (to refresh the lsit)

export default function RoomModal({ open, onClose, roomData, onSuccess }) {

    const selectedHostel = useRoomStore(state => state.selectedHostel);
    
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting }
    } = useForm();

    // When roomData changes (user clicks Edit on a different room, 
    // or modal opens for Add), repopulate or clear the form.

    useEffect(() => {
        if (roomData) {
            reset(roomData); // Edit mode: fill with existing values
        } else {
            reset({
                roomNumber: "",
                floor: "",
                type: "",
                capacity: "",
                rent: "",
                amenities: []
        }); // Add mode: empty form
        }
    }, [roomData, reset]);

    const onSubmit = async (data) => {
        // Convert number fields from strings (HTML input always gives strings)
        const payload = {
            ...data,
            floor: data.floor ? Number(data.floor) : undefined,
            capacity: data.capacity ? Number(data.capacity) : undefined,
            rent: data.rent ? Number(data.rent) : undefined,
        };

        try {
            if (roomData) {
                // Edit mode
                await updateRoom(selectedHostel._id, roomData._id, payload);
                toast.success("Room updated successfully");
            } else {
                // Add mode
                await createRoom(selectedHostel._id, payload);
                toast.success("Room created successfully");
            }

            onSuccess(); // tell RoomList to re-fetch
            onClose(); // close the model
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
        }
    };

    // Don't render anything if model is closed.
    // This also means the form resets naturally next time it opens.
    if (!open) return null;

    const isEditMode = Boolean(roomData);

    return (
        // Backdrop: clicking outside closes the model
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            {/* Modal box: stop click from bubbling to backdrop */}
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">
                        {isEditMode ? "Edit Room" : "Add New Room"}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                    {/* Room Number */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Room Number <span className="text-red-500"></span>
                        </label>
                        <input type="text" placeholder="e.g. 101" {...register("roomNumber", {
                            required: "Room number is required"
                        })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus: ring-2 focus:ring-blue-500"/>
                        {errors.roomNumber && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.roomNumber.message}
                            </p>
                        )}
                    </div>

                    {/* Floor */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Floor
                        </label>
                        <input type="number" placeholder="e.g. 1" min="0" {...register("floor")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type
                        </label>
                        <select {...register("type")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select type</option>
                            <option value="single">Single</option>
                            <option value="double">Double</option>
                            <option value="triple">Triple</option>
                            <option value="dormitory">Dormitory</option>
                        </select>
                    </div>

                    {/* Capacity */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Capacity
                        </label>
                        <input 
                            type="number"
                            placeholder="e.g. 2"
                            min="1"
                            {...register("capacity")}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>

                    {/* Rent */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Rent (₹) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            placeholder="e.g. 5000"
                            min="0"
                            {...register("rent", {
                                required: "Rent is required"
                            })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                            {errors.rent && (
                                <p className="text-red-500 text-xs mt-1">
                                    {errors.rent.message}
                                </p>
                            )}
                    </div>

                    {/* Amenities (multi-select) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Amenities
                        </label>
                        <p className="text-xs text-gray-500 mb-1">
                            Hold Ctrl or Cmd (mac) to select multiple.
                        </p>
                        <select
                            multiple
                            {...register("amenities")}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-28">
                                <option value="wifi">WiFi</option>
                                <option value="ac">AC</option>
                                <option value="geyser">Geyser</option>
                                <option value="laundry">Laundry</option>
                                <option value="parking">Parking</option>
                                <option value="tv">TV</option>
                            </select>
                    </div>

                    {/*Submit*/}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancel</button>

                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">{isSubmitting ? "Saving..." : isEditMode ? "Update Room" : "Add Room"}
                            </button>
                    </div>
                </form>
            </div>
        </div>
    );
}