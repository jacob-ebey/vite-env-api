import * as React from "react";

import { getDB } from "@/db/server";
import { getUserId } from "@/user/server";

export const getChatsForUser = React.cache(async () => {
	const userId = getUserId();
	const db = getDB();

	return db.query.chat.findMany({
		where: (chat, { eq }) => eq(chat.userId, userId),
		orderBy: ({ createdAt }, { desc }) => desc(createdAt),
		columns: {
			createdAt: true,
			id: true,
			name: true,
		},
	});
});
