import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

export const registerSchema = z.object({
    name: z.string().min(2, "Name is required"),
    email: z.email(),
    phone: z.string().refine((value) => isValidPhoneNumber(value),
	    {
		    message: "Invalid phone number"
	    }
    ),
    password: z.string().min(6)
});