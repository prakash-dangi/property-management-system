import { Link, Outlet, useLocation } from "react-router-dom";
import useAuthStore from "../store/authStore";

const NAV_ITEMS = [
	{ to: "/portal",			label: "My Room",		exact: true },
	{ to: "/portal/profile",	label: "My Profile"					},
	{ to: "/portal/invoices",	label: "Invoices"					},
	{ to: "/portal/complaints",	label: "Complaints"					},
	{ to: "/portal/notices",	label: "Notices"					},
];

export default function TenantLayout() {
	const user = useAuthStore(state => state.user);
	const logout = useAuthStore(state => state.logout);
	const { pathname } = useLocation();

	return (
		<div className="min-h-screen flex bg-gray-50">
			{/* Sidebar */}
			<aside className="hidden lg:flex w-64 flex-col bg-indigo-900 text-white p-5 gap-6">

				{/* Branding */}
				<div>
					<h2 className="text-lg font-bold">Tenant Portal</h2>
					<p className="text-indigo-300 text-xs mt-0.5 turncate">
						{user?.name}
					</p>
				</div>

				{/* Nav */}
				<nav className="flex flex-col gap-1 flex-1">
					{NAV_ITEMS.map(({ to, label, exact }) => {
						const isActive = exact ? pathname === to : pathname.startsWith(to);
						return (
							<Link
								key={to}
								to={to}
								className={`
									px-3 py-2 rounded-lg text-sm font-medium transition-colors
									${isActive
										? "bg-indigo-700 text-white"
										: "text-indigo-200 hover:bg-indigo-800 hover:text-white"
									}
								`}
							>
								{label}
							</Link>
						);
					})}
				</nav>

				{/* Logout at bottom */}
				<button
					onClick={logout}
					className="text-sm text-indigo-300 hover:text-white text-left px-3 py-2 rounded-lg hover:bg-indigo-800 transition-colors"
				>
					← Sign Out
				</button>
			</aside>

			{/* Mobile topbar */}
			<div className="lg:hidden fixed top=0 inset-x-0 z-30 bg-indigo-900 text-white flex items-center justify-between px-4 py-3">
				<span className="font-semibold text-sm">Tenant Portal</span>
				<button onClick={logout} className="text-xs text-indigo-300">Sign out</button>
			</div>

			{/* Content */}
			<div className="flex-1 flex flex-col">
				<main className="flex-1 p-6 pt-16 lg:pt-6">
					<Outlet />
				</main>
			</div>
		</div>
	);
}