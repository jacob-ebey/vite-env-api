import * as React from "react";

import { RevalidationTargets } from "@/app";

import { ChatList } from "../chats/route";

export default function ChatLayoutRoute({
	children,
}: {
	children?: React.ReactNode;
}) {
	return (
		<div
			className="relative flex flex-col flex-1 h-0 overflow-y-auto"
			data-scroll-to-top
		>
			<div className="flex flex-row flex-wrap flex-1">
				<aside className="hidden w-full px-4 pt-12 pb-24 md:block md:w-1/4">
					<React.Suspense key="chat-list">
						<ChatList
							revalidate={JSON.stringify(RevalidationTargets.chatDetail)}
						/>
					</React.Suspense>
				</aside>
				<main className="flex-1 md:shadow-lg">{children}</main>
			</div>
		</div>
	);
}
