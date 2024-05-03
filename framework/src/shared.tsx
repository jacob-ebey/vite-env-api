const g = (
	typeof window !== "undefined"
		? window
		: typeof globalThis !== "undefined"
			? globalThis
			: typeof global !== "undefined"
				? global
				: {}
) as typeof globalThis;

export function getOrCreateGlobal<K extends keyof typeof globalThis>(
	key: K,
	create: () => (typeof globalThis)[K],
): (typeof globalThis)[K] {
	if (!g[key]) {
		g[key] = create();
	}
	return g[key];
}

export function setGlobal<K extends keyof typeof globalThis>(
	key: K,
	value: (typeof globalThis)[K],
) {
	g[key] = value;
}

export type FormOptionsProps = {
	preventScrollReset?: boolean;
	revalidate?: boolean | string[];
};

export function FormOptions({
	preventScrollReset,
	revalidate,
}: FormOptionsProps) {
	const options = [];

	if (preventScrollReset) {
		options.push(
			<input
				type="hidden"
				key="RSC-PreventScrollReset"
				name="RSC-PreventScrollReset"
				value="yes"
			/>,
		);
	}

	if (typeof revalidate === "boolean") {
		if (!revalidate) {
			options.push(
				<input
					type="hidden"
					key="RSC-Revalidate"
					name="RSC-Revalidate"
					value="no"
				/>,
			);
		}
	} else if (Array.isArray(revalidate)) {
		const value = JSON.stringify(revalidate);
		options.push(
			<input
				type="hidden"
				key="RSC-Revalidate"
				name="RSC-Revalidate"
				value={value}
			/>,
		);
	}

	return <>{options}</>;
}
