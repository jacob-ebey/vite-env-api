import { z } from "zod";

export const sendMessageSchema = z.object({
  message: z
    .string({
      required_error: "Message is required",
    })
    .trim()
    .min(1, "Message is required"),
});
