import { and, eq } from "drizzle-orm";
import * as React from "react";
import { URLPattern } from "urlpattern-polyfill";

import * as framework from "framework";

import { Routes } from "@/app";
import { chat } from "@/db/schema";
import { getDB } from "@/db/server";
import { getUserId } from "@/user/server";

import { sendMessage } from "./actions";
import { SendMessageForm } from "./client";
import { AIMessage, UserMessage } from "./shared";

export default async function ChatRoute() {
	const url = framework.getURL();
	const sendMessageAction = framework.getActionResult(sendMessage);
	const userId = getUserId();
	const db = getDB();

	// await new Promise((resolve) => setTimeout(resolve, 1000));

	const matched = new URLPattern({ pathname: "/chat/:chatId?" }).exec(url);
	const chatId = matched?.pathname.groups.chatId;

	const initialChat = chatId
		? await db.query.chat.findFirst({
				where: and(eq(chat.userId, userId), eq(chat.id, chatId)),
				with: {
					messages: {
						orderBy: ({ order }, { desc }) => desc(order),
						columns: {
							id: true,
							message: true,
							userId: true,
						},
					},
				},
			})
		: null;

	return (
		<div>
			<div className="pb-24">
				<div className="p-4">
					<SendMessageForm
						key={initialChat?.id}
						chatId={initialChat?.id}
						action={sendMessage}
						initialState={sendMessageAction.result}
					>
						{initialChat?.messages.map((message) => (
							<React.Fragment key={message.id}>
								{message.userId ? (
									<UserMessage key={message.id}>{message.message}</UserMessage>
								) : (
									<AIMessage key={message.id}>{message.message}</AIMessage>
								)}
							</React.Fragment>
						))}
					</SendMessageForm>
				</div>
			</div>
		</div>
	);
}
