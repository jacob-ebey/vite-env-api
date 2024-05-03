"use server";

import { parseWithZod } from "@conform-to/zod";
import { createStreamableUI } from "ai/rsc";
import { and, eq } from "drizzle-orm";
import { Ollama } from "ollama";

import * as framework from "framework";

import { ClientRedirect } from "@/components/client-redirect";
import { chat, chatMessage } from "@/db/schema";
import { getDB } from "@/db/server";
import { Secrets } from "@/secrets/server";
import { actionRequiresUserId } from "@/user/server";

import { FocusSendMessageForm } from "./client";
import { sendMessageSchema } from "./schema";
import {
	AIMessage,
	ErrorMessage,
	PendingAIMessage,
	UserMessage,
} from "./shared";

export async function sendMessage(formData: FormData, stream = false) {
	const ollamaHost = framework.get(Secrets.OLLAMA_HOST);
	const db = getDB();

	const [userId, parsed] = await Promise.all([
		actionRequiresUserId(),
		parseWithZod(formData, {
			schema: sendMessageSchema,
		}),
	]);

	switch (parsed.status) {
		case "error": {
			return { lastResult: parsed.reply(), stream };
		}
		case "success": {
			const { chatId, message } = parsed.value;

			const existingDBChat = chatId
				? await db.query.chat.findFirst({
						where: and(eq(chat.id, chatId), eq(chat.userId, userId)),
						columns: { id: true, name: true },
						with: {
							messages: {
								orderBy: ({ id }, { asc }) => asc(id),
								columns: {
									id: true,
									message: true,
									userId: true,
								},
							},
						},
					})
				: undefined;

			if (chatId && !existingDBChat) {
				return {
					lastResult: parsed.reply({
						fieldErrors: {
							message: ["Chat not found."],
						},
						resetForm: false,
					}),
				};
			}

			const existingMessages = existingDBChat?.messages ?? [];

			const aiMessage = createStreamableUI(<PendingAIMessage />);
			const userMessage = createStreamableUI(
				<UserMessage>{message}</UserMessage>,
			);

			const ollama = new Ollama({ host: ollamaHost });

			const chatNamePromise = (async () => {
				if (existingDBChat) return existingDBChat.name;

				const response = await ollama.chat({
					model: "llama3",
					stream: false,
					messages: [
						{
							role: "system",
							content: "You are a short title generator.",
						},
						{
							role: "user",
							content: `It should be under 30 characters. Respond with ONLY the title. Determine a short title for a chat thread with the first message of:\n\`\`\`\n${message}\n\`\`\`.`,
						},
					],
				});
				return response.message.content;
			})();

			const redirectToPromise = (async () => {
				try {
					const response = await ollama.chat({
						model: "llama3",
						stream: true,
						messages: [
							...existingMessages.map((message) => ({
								role: message.userId ? "user" : "assistant",
								content: message.message,
							})),
							{
								role: "user",
								content: message,
							},
						],
					});

					let aiResponse = "";
					let lastSentLength = 0;
					for await (const chunk of response) {
						if (
							typeof chunk.message.content === "string" &&
							chunk.message.content
						) {
							aiResponse += chunk.message.content;
							const trimmed = aiResponse.trim();
							// send in chunks of 10 characters
							if (trimmed && trimmed.length - lastSentLength >= 10) {
								lastSentLength = trimmed.length;
								aiMessage.update(<AIMessage>{trimmed}...</AIMessage>);
							}
						}
					}

					const dbChat = await db.transaction(async (tx) => {
						let dbChat: undefined | { id: string } = existingDBChat;
						if (!existingDBChat) {
							dbChat = (
								await db
									.insert(chat)
									.values({
										name: await chatNamePromise,
										userId,
									})
									.returning({ id: chat.id })
							)[0];
						}

						if (!dbChat) {
							tx.rollback();
							return null;
						}

						const userMessage = await tx.insert(chatMessage).values({
							chatId: dbChat.id,
							message,
							order: existingMessages.length + 1,
							userId,
						});
						if (!userMessage.changes) {
							tx.rollback();
							return null;
						}
						const aiMessage = await tx.insert(chatMessage).values({
							chatId: dbChat.id,
							message: aiResponse,
							order: existingMessages.length,
						});
						if (!aiMessage.changes) {
							tx.rollback();
							return null;
						}
						return dbChat;
					});

					if (!dbChat) {
						throw new Error("Failed to save messages.");
					}

					const redirectTo = !existingDBChat ? `/chat/${dbChat.id}` : undefined;

					userMessage.done();
					aiMessage.done(
						<>
							<AIMessage>{aiResponse.trim()}</AIMessage>
							{redirectTo ? (
								<ClientRedirect preventScrollReset to={redirectTo} />
							) : (
								<FocusSendMessageForm />
							)}
						</>,
					);

					return redirectTo;
				} catch (error) {
					console.error(error);
					userMessage.done();
					aiMessage.done(
						<ErrorMessage>
							Failed to send message. Please try again.
						</ErrorMessage>,
					);
				}
			})();

			if (!stream && !existingDBChat) {
				const redirectTo = await redirectToPromise;
				if (redirectTo) {
					return framework.actionRedirects(redirectTo);
				}
			}

			return {
				lastResult: parsed.reply({ resetForm: true }),
				newMessages: [userMessage.value, aiMessage.value],
				stream,
			};
		}
	}
}
