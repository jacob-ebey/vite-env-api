import * as React from "react";

import type { Navigation } from "./router/browser.js";
import { NavigationContext, navigate, scrollToTop } from "./router/browser.js";
export { useServerContext } from "./router/client.js";

export type { Navigation };
export { navigate };

declare global {
	var __navigationContext: React.Context<Navigation>;
}

export function useNavigation() {
	return React.useContext(NavigationContext);
}

const emptySubscribe = () => () => {};

export function useHydrated() {
	return React.useSyncExternalStore(
		emptySubscribe,
		() => true,
		() => false,
	);
}

export function useEnhancedActionState<
	Action extends (formData: FormData) => unknown,
>(
	action: Action,
	clientAction: (
		state: Awaited<ReturnType<Action>> | undefined,
		formData: FormData,
	) => ReturnType<Action> | Promise<ReturnType<Action>>,
	initialState?: Awaited<ReturnType<Action>> | undefined,
	permalink?: string,
): [
	state: Awaited<ReturnType<Action>> | undefined,
	dispatch: Action | ((formData: FormData) => void),
	isPending: boolean,
] {
	const [state, dispatch, pending] = React.useActionState<
		ReturnType<Action> | undefined,
		FormData
	>(clientAction, initialState, permalink);
	const hydrated = useHydrated();
	if (hydrated) {
		return [state, dispatch, pending] as const;
	}
	return [state, action, pending] as const;
}

export function redirect(
	to: string,
	revalidate?: string,
	preventScrollReset = false,
) {
	const controller = new AbortController();
	return __startNavigation(
		to,
		controller,
		async (completeNavigation, aborted) => {
			const payload = await navigate(to, controller.signal, revalidate);
			if (window.location.href !== payload.url.href && !aborted()) {
				window.history.pushState(null, "", payload.url.href);
			}
			if (!aborted() && !preventScrollReset) {
				scrollToTop();
			}
			completeNavigation(payload);
		},
	);
}
