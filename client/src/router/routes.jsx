import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import RoomList from "../pages/Rooms/RoomList";
import RoleRoute from "../components/RoleRoute";
import AdminLayout from "../layouts/AdminLayout";
import TenantList from "../pages/Tenants/TenantList";
import TenantForm from "../pages/Tenants/TenantForm";
import TenantDetail from "../pages/Tenants/TenantDetail";
import ProtectedRoute from "../components/ProtectedRoute";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import TenantLayout from "../layouts/TenantLayout";
import TenantHome from "../pages/TenantPortal/TenantHome";
import TenantProfile from "../pages/TenantPortal/TenantProfile";
import TenantInvoices from "../pages/TenantPortal/TenantInvoices";
import TenantComplaints from "../pages/TenantPortal/TenantComplaints";
import TenantNotices from "../pages/TenantPortal/TenantNotices";
import RoomDetail from "../pages/Rooms/RoomDetail";

export default function AppRoutes() {
	return (
		<BrowserRouter>
			<Routes>
				<Route
					path="/login"
					element={<Login />}
				/>

				<Route
					path="/register"
					element={<Register />}
				/>

				<Route
					path="/dashboard"
					element={
						<ProtectedRoute>
							<RoleRoute roles={["owner", "staff"]}>
								<AdminLayout />
							</RoleRoute>
						</ProtectedRoute>
					}
				>
					{/* Nested routes - render inside AdminLayout's <Outlet /> */}
					<Route index element={<Dashboard />} />
					<Route path="rooms" element={<RoomList />} />
					<Route path="tenants" element={<TenantList />} />
					<Route path="tenants/new" element={<TenantForm />} />
					<Route path="tenants/:id" element={<TenantDetail />} />
					<Route path="rooms/:id" element={<RoomDetail />} />
				</Route>

				<Route
					path="*"
					element={<Navigate to="/login" replace />}
				/>

				<Route
					path="/portal"
					element={
						<ProtectedRoute>
							<RoleRoute roles={["tenant"]}>
								<TenantLayout />
							</RoleRoute>
						</ProtectedRoute>
					}
				>
					<Route index element={<TenantHome />} />
					<Route path="profile" element={<TenantProfile />} />
					<Route path="invoices" element={<TenantInvoices />} />
					<Route path="complaints" element={<TenantComplaints />} />
					<Route path="notices" element={<TenantNotices />} />
				</Route>
			</Routes>
		</BrowserRouter>
	);
}

