"use server";

import { chat } from "@/db/schema";
import { getDB } from "@/db/server";
import { actionRequiresUserId } from "@/user/server";
import { eq } from "drizzle-orm";

export async function clearChats() {
	const userId = actionRequiresUserId();
	const db = getDB();

	await db.delete(chat).where(eq(chat.userId, userId));
}
