import useAuthStore from "../store/authStore";

export default function RoleRoute({children, roles}) {
	const user = useAuthStore(state => state.user);

	if (!roles.includes(user.role)) {
		return (
			<h1>403 Forbidden</h1>
		);
	}
	
	return children;
}
