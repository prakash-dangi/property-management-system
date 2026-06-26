import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import RoomList from "../pages/Rooms/RoomList";
import RoleRoute from "../components/RoleRoute";
import AdminLayout from "../layouts/AdminLayout";
import TenantList from "../pages/Tenants/TenantList";
import TenantForm from "../pages/Tenants/TenantForm";
import ProtectedRoute from "../components/ProtectedRoute";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

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
				</Route>

				<Route
					path="*"
					element={<Navigate to="/login" replace />}
				/>
			</Routes>
		</BrowserRouter>
	);
}

