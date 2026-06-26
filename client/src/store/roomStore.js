import { create } from "zustand";

const useRoomStore = create((set) => ({
	// The hostel user has currently select to manage.
	// null means "no hostel selected yet".
	selectedHostel: null,

	// Call this when the user picks a hostel from the dropdown.
	// hostel is the full hostel object (both _id and name).
	setSelectedHostel: (hostel) => set({ selectedHostel: hostel }),

	// Clear selection (ex: on logout)
	clearSelectedHostel: () => set({ selectedHostel: null }),
}));

export default useRoomStore;
