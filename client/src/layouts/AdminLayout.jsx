import { Link, Outlet } from "react-router-dom";
import useAuthStore from "../store/authStore";
import useRoomStore from "../store/roomStore";
import ThemeToggle from "../components/ThemeToggle";

export default function AdminLayout() {

	const user =
		useAuthStore(
			state => state.user
		);

	const logout =
		useAuthStore(
			state => state.logout
		);

	const selectedHostel = useRoomStore(state => state.selectedHostel);

	return (

		<div className="min-h-screen flex">

			{/* Sidebar */}

			<aside
				className="
                hidden
                lg:flex
                w-64
                flex-col
                bg-gray-800
                text-white
                p-4
                "
			>

				<h2 className="text-xl font-bold mb-8">
					Hostel Management System
				</h2>

				<nav
					className="
                    flex
                    flex-col
                    gap-3
                    "
				>

					<Link to="/dashboard">
						Dashboard
					</Link>

					<Link to="/dashboard/rooms">
						Rooms
					</Link>

					<Link to="/dashboard/tenants">
						Tenants
					</Link>

					<Link to="/billing">
						Billing
					</Link>

					<Link to="/complaints">
						Complaints
					</Link>

					<Link to="/notices">
						Notices
					</Link>

					<Link to="/settings">
						Settings
					</Link>

				</nav>

			</aside>

			{/* Content Area */}

			<div className="flex-1">

				{/* Topbar */}

				<header
					className="
                    flex
                    justify-between
                    items-center
                    p-4
                    border-b
                    "
				>

					<div>

						<h3 className="text-sm font-medium text-gray-600">
							{selectedHostel ? selectedHostel.name : "Select a hostel"}
						</h3>

					</div>

					<div
						className="
                        flex
                        items-center
                        gap-4
                        "
					>

						<img
							src="https://placehold.co/40"
							alt="avatar"
							className="
                            rounded-full
                            "
						/>

						<span>
							{user?.name}
						</span>

						<ThemeToggle />

						<button
							onClick={logout}
							className="
                            px-3
                            py-1
                            border
                            rounded
                            "
						>
							Logout
						</button>

					</div>

				</header>

				<main
					className="p-6"
				>

					<Outlet />

				</main>

			</div>

		</div>
	);
}
