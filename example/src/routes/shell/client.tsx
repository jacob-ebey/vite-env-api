"use client";

import { useNavigation } from "framework/client";

export function PendingIndicator() {
	const navigation = useNavigation();

	if (!navigation.pending) {
		return null;
	}

	return (
		<progress className="fixed top-0 left-0 right-0 z-50 h-1 progress progress-accent" />
	);
}
