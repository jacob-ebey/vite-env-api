import { Routes } from "@/app";
import { getChatsForUser } from "@/cache/chat";
import { Button } from "@/components/ui/button";

import { clearChats } from "./actions";

export default function ChatListRoute() {
	return (
		<main className="flex-1 h-0 p-4 overflow-y-auto">
			<div className="sticky top-0 z-20 flex items-center justify-between bg-background">
				<h2 className="mb-4 text-lg">Chat History</h2>
				<form action={clearChats} className="mb-4">
					<Button type="submit" variant="destructive" size="sm">
						Clear All
					</Button>
				</form>
			</div>

			<ChatList />
		</main>
	);
}

export async function ChatList({ revalidate }: { revalidate?: string }) {
	const chats = await getChatsForUser();

	// short date / time format
	const dateFormatter = new Intl.DateTimeFormat("en-US", {
		year: "2-digit",
		month: "numeric",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
		second: "numeric",
		timeZoneName: "short",
		timeZone: "America/Los_Angeles",
	});
	const formatDate = (str: string) => {
		const [date, time] = str.split(" ");
		const [year, month, day] = date.split("-");
		const [hour, minute, second] = time.split(":");
		return dateFormatter.format(
			new Date(
				Date.UTC(
					Number.parseInt(year, 10),
					Number.parseInt(month, 10) - 1,
					Number.parseInt(day, 10),
					Number.parseInt(hour, 10),
					Number.parseInt(minute, 10),
					Number.parseInt(second, 10),
				),
			),
		);
	};

	return (
		<>
			<ul className="flex flex-col gap-4 mx-auto">
				{chats.map((chat) => (
					<li key={chat.id}>
						<a
							href={Routes.chatDetail.pathname(chat.id)}
							data-revalidate={revalidate}
							className="block group"
						>
							<span className="group-hover:underline group-focus:underline">
								<span className="block">{chat.name}</span>
								<span className="text-xs text-info-content">
									{formatDate(chat.createdAt)}
								</span>
							</span>
						</a>
					</li>
				))}
			</ul>
		</>
	);
}
