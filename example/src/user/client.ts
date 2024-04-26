import { useServerContext } from "framework/client";

import { USER_ID_KEY } from "./shared";

export function useUserId() {
	return useServerContext(USER_ID_KEY);
}
