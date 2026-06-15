import { useEffect } from "react";
import useAuthStore from "../store/authStore";

export default function AuthInitializer() {
	const initializeAuth = useAuthStore(state => state.initializeAuth);

	useEffect(() => {
		initializeAuth();
	}, []);

	return null;
}
