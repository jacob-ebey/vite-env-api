import { z } from "zod";

export const loginFormSchema = z.object({
	username: z
		.string({
			required_error: "Email is required",
		})
		.trim()
		.email("Invalid email address"),
	password: z
		.string({ required_error: "Password is required" })
		.min(1, "Password is required"),
});

const unrefinedSignupFormSchema = z.object({
	username: z
		.string({
			required_error: "Email is required",
		})
		.trim()
		.email("Invalid email address"),
	password: z
		.string({ required_error: "Password is required" })
		.min(1, "Password is required"),
	verifyPassword: z
		.string({ required_error: "Must verify password" })
		.min(1, "Must verify password"),
	displayName: z
		.string({
			required_error: "Display name is required",
		})
		.min(1, "Display name is required"),
	fullName: z
		.string({
			required_error: "Full name is required",
		})
		.min(1, "Full name is required"),
});

export const signupFormSchema = unrefinedSignupFormSchema.refine(
	(data) => data.password === data.verifyPassword,
	{
		message: "Passwords must match",
		path: ["verifyPassword"],
	},
) as unknown as typeof unrefinedSignupFormSchema;
