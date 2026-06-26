import useAuthStore from "../store/authStore";

export default function RoleRoute({children, roles}) {
	const user = useAuthStore(state => state.user);

	// Guard: user may be null during the initial auth check
	if (!user || !roles.includes(user.role)) {
		return (
			<h1>403 Forbidden</h1>
		);
	}
	
	return children;
}
