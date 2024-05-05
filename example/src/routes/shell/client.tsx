"use client";

import { useNavigation } from "framework/client";

export function PendingIndicator() {
	const navigation = useNavigation();

	if (!navigation.pending) {
		return null;
	}

	return (
		<div className="fixed top-0 left-0 right-0">
			<div className="h-0.5 w-full bg-muted overflow-hidden">
				<div className="w-full h-full animate-progress bg-muted-foreground origin-left-right" />
			</div>
		</div>
	);
}
