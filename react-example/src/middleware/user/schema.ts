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
