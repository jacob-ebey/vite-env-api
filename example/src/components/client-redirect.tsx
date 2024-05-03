"use client";

import * as React from "react";

import { redirect } from "framework/client";

export function ClientRedirect({
	preventScrollReset,
	to,
}: { preventScrollReset?: boolean; to: string }) {
	const ref = React.useRef(false);
	const [redirectTo, setRedirectTo] = React.useState<string>(to);
	if (to !== redirectTo) {
		setRedirectTo(to);
	}

	React.useEffect(() => {
		if (!ref.current) {
			ref.current = true;
			redirect(redirectTo, undefined, preventScrollReset);
		}
	}, [preventScrollReset, redirectTo]);

	return null;
}
