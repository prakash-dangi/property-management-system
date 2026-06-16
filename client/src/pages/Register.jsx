import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "../utils/registerSchema";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";

// currently owner registeration only

export default function Register() {
	const navigate = useNavigate();

	const  {
		register,
		handleSubmit,
		formState: {
			errors
		}
	} = useForm({ resolver: zodResolver(registerSchema)});

	const onSubmit = async (data) => {
		try {
			await api.post("/api/auth/register", data);
			toast.success("Register successful");

			navigate("/login");
		} catch (error) {
    		toast.error(
        		error.response?.data?.message || "Registration failed"
    		);
		}
	};

	return (
		<div>
			<h1>Register</h1>

			<form onSubmit={handleSubmit(onSubmit)}>
				<input placeholder="Name" {...register("name")}/>
				<p>{errors.name?.message}</p>

				<input placeholder="Email" {...register("email")}/>
				<p>{errors.email?.message}</p>

				<input placeholder="Phone" {...register("phone")}/>
				<p>{errors.phone?.message}</p>

				<input type="password" placeholder="Password" {...register("password")}/>
				<p>{errors.password?.message}</p>

				<button type="submit">Register</button>
			</form>
		</div>
	);
}
