// @ts-expect-error - no types
import ReactServer from "react-server-dom-diy/client";

export function createServerReference(_: unknown, mod: string, name: string) {
	const id = `${mod}#${name}`;
	const reference = ReactServer.createServerReference(
		id,
		(id: string, args: unknown[]) => {
			return __callServer(id, args);
		},
	);

	Object.defineProperties(reference, {
		$$typeof: { value: Symbol.for("react.server.reference") },
		$$id: { value: id },
	});

	return reference;
}
