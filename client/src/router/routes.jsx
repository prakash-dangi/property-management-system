import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import ProtectedRoute from "../components/ProtectedRoute";
import RoleRoute from "../components/RoleRoute";
import AdminLayout from "../layouts/AdminLayout";

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
					<Route index element={<Dashboard />} />
				</Route>

				<Route
					path="*"
					element={<Navigate to="/login" replace />}
				/>
			</Routes>
		</BrowserRouter>
	);
}

