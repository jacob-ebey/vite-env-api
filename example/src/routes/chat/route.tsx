import { desc, eq } from "drizzle-orm";

import { chat } from "@/db/schema";
import { getDB } from "@/db/server";
import { getUserId } from "@/user/server";

export default async function ChatLayoutRoute({
	children,
}: {
	children?: React.ReactNode;
}) {
	const userId = getUserId();
	const db = getDB();
	db.query.chat.findMany({
		where: eq(chat.userId, userId),
		orderBy: ({ createdAt }, { desc }) => desc(createdAt),
	});

	return (
		<div className="grid flex-1 grid-cols-12 gap-6">
			<aside className="hidden col-span-12 border-r lg:block lg:col-span-3 bg-base-200 border-base-content">
				Sidebar
			</aside>
			<main className="col-span-12 overflow-y-auto lg:col-span-9">
				<div>{children}</div>
			</main>
		</div>
	);
}
