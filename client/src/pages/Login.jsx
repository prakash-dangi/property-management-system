import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "../utils/loginSchema";
import useAuthStore from "../store/authStore";
import { useNavigate } from "react-router-dom";

// currently owner login only

export default function Login() {
    const login = useAuthStore(state => state.login);

    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        formState: {
            errors
        }
    } = useForm({
        resolver: zodResolver(loginSchema)
    });

    const onSubmit = async (data) => {
        try {
            await login(data);

            navigate("/dashboard");
        } catch {
            alert("Login failed");
        }
    };

    return (
        <div>

            <h1>Login</h1>

            <form onSubmit={handleSubmit(onSubmit)}>
                <input placeholder="Email" {...register("email")}/>
                <p>{errors.email?.message}</p>

                <input type="password" placeholder="Password" {...register("password")}/>
                <p>{errors.password?.message}</p>

                <button type="submit">Login</button>
            </form>
        </div>
    );
}

