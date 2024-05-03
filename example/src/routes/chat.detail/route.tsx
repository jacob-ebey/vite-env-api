import { and, eq } from "drizzle-orm";
import * as React from "react";
import { URLPattern } from "urlpattern-polyfill";

import * as framework from "framework";

import { chat } from "@/db/schema";
import { getDB } from "@/db/server";
import { getUserId } from "@/user/server";

import { sendMessage } from "./actions";
import { SendMessageForm } from "./client";
import { AIMessage, UserMessage } from "./shared";
import { Routes } from "@/app";

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
			<nav className="sticky top-0 md:hidden bg-base-100">
				<a href={Routes.chatList.pathname()} className="btn btn-ghost">
					Back to Chat List
				</a>
			</nav>
			<div className="pb-24 md:pt-12">
				<div className="w-full max-w-2xl px-4 mx-auto">
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
