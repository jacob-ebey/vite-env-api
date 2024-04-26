import * as React from "react";

import { useForm as useConformForm } from "@conform-to/react";
import type { FormOptions, Pretty } from "@conform-to/react/context";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import type { ZodTypeAny, infer as zodInfer, input as zodInput } from "zod";

import { useHydrated } from "@/framework/client";

type OrUnknown<T> = T extends Record<string, unknown>
	? T
	: Record<string, unknown>;

export function useForm<Schema extends ZodTypeAny>({
	id,
	schema,
	...rest
}: {
	schema: Schema;
} & Pretty<
	Omit<
		FormOptions<
			OrUnknown<zodInput<Schema>>,
			string[],
			OrUnknown<zodInfer<Schema>>
		>,
		"constraint" | "formId"
	> & {
		/**
		 * The form id. If not provided, a random id will be generated.
		 */
		id?: string;
		/**
		 * Enable constraint validation before the dom is hydated.
		 *
		 * Default to `true`.
		 */
		defaultNoValidate?: boolean;
	}
>) {
	const defaultId = React.useId();
	const hydrated = useHydrated();
	const [form, fields] = useConformForm<
		OrUnknown<zodInput<Schema>>,
		OrUnknown<zodInfer<Schema>>,
		string[]
	>({
		...rest,
		id: id ?? defaultId,
		constraint: getZodConstraint(schema),
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		onValidate: (context): any => {
			return parseWithZod<Schema>(context.formData, {
				schema,
			});
		},
	});

	return React.useMemo(() => {
		const proxyForm = new Proxy(
			{ noValidate: false },
			{
				get(_, key: keyof typeof form) {
					if (key === "noValidate" && !hydrated) {
						return false;
					}
					return form[key];
				},
			},
		) as typeof form;

		return [proxyForm, fields] as const;
	}, [form, fields, hydrated]);
}
