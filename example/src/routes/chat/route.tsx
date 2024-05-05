import * as React from "react";

import { RevalidationTargets } from "@/app";
import { Button } from "@/components/ui/button";

import { clearChats } from "../chats/actions";
import { ChatList } from "../chats/route";

export default function ChatLayoutRoute({
	children,
}: {
	children?: React.ReactNode;
}) {
	return (
		<div className="grid h-0 flex-1 md:grid-cols-[minmax(200px,30%)_1fr]">
			<aside className="hidden p-4 overflow-y-auto border-r md:block border-border">
				<React.Suspense key="chat-list">
					<div className="sticky top-0 z-20 flex items-center justify-between bg-background">
						<h2 className="mb-4 text-lg">Chat History</h2>
						<form action={clearChats} className="mb-4">
							<Button type="submit" variant="destructive" size="sm">
								Clear All
							</Button>
						</form>
					</div>
					<ChatList
						revalidate={JSON.stringify(RevalidationTargets.chatDetail)}
					/>
				</React.Suspense>
			</aside>
			<main className="overflow-y-auto" data-scroll-to-top>
				{children}
			</main>
		</div>
	);
	// return (
	//   <div
	//     className="relative flex flex-col flex-1 h-0 overflow-y-auto"
	//     data-scroll-to-top
	//   >
	//     <div className="flex flex-row flex-wrap flex-1">
	//       <aside className="hidden w-full px-4 pt-12 pb-24 md:block md:w-1/4">
	//         <React.Suspense key="chat-list">
	//           <ChatList
	//             revalidate={JSON.stringify(RevalidationTargets.chatDetail)}
	//           />
	//         </React.Suspense>
	//       </aside>
	//       <main className="flex-1 md:shadow-lg">{children}</main>
	//     </div>
	//   </div>
	// );
}
