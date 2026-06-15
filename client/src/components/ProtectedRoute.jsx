import useAuthStore from "../store/authStore";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({
    children
}) {

    const {
        isAuthenticated,
        loading
    } = useAuthStore();

    if (loading) {

        return (
            <h2>
                Loading...
            </h2>
        );
    }

    if (!isAuthenticated) {

        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    return children;
}
