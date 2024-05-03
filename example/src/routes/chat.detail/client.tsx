"use client";

import type { FieldMetadata } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { useEnhancedActionState } from "framework/client";
import { FormOptions } from "framework/shared";

import { useForm } from "@/forms/client";

import type { sendMessage } from "./actions";
import { sendMessageSchema } from "./schema";
import { PendingAIMessage, UserMessage } from "./shared";

type SendMessageFormProps = {
	action: typeof sendMessage;
	chatId?: string;
	children?: React.ReactNode;
	initialState?: Awaited<ReturnType<typeof sendMessage>>;
};

export function SendMessageForm({
	action,
	chatId: currentChatId,
	children,
	initialState,
}: SendMessageFormProps) {
	const [clientMessages, setClientMessages] = React.useState<React.ReactNode[]>(
		[],
	);
	const [pendingMessage, setPendingMessage] =
		React.useOptimistic<React.ReactNode | null>(null);
	const formRef = React.useRef<HTMLFormElement | null>(null);
	const messageInputRef = React.useRef<HTMLInputElement | null>(null);

	const [formState, dispatch, isPending] = useEnhancedActionState(
		action,
		async (formState, formData) => {
			const parsed = parseWithZod(formData, { schema: sendMessageSchema });
			if (parsed.status === "success") {
				setPendingMessage(<UserMessage>{parsed.value.message}</UserMessage>);
			}

			formRef.current?.reset();
			messageInputRef.current?.focus();

			const result = await action(formData, true);

			if (result?.newMessages) {
				if (formState && !formState.stream && formState.newMessages) {
					setClientMessages((messages) => [
						...result.newMessages,
						...formState.newMessages,
						...messages,
					]);
				} else {
					setClientMessages((messages) => [...result.newMessages, ...messages]);
				}
			}

			return result;
		},
		initialState,
	);

	const allClientMessages = React.useMemo(() => {
		if (pendingMessage) {
			return [
				pendingMessage,
				<PendingAIMessage key="pending" />,
				...clientMessages,
			];
		}
		if (formState && !formState.stream && formState.newMessages) {
			return [...formState.newMessages, ...clientMessages];
		}
		return clientMessages;
	}, [formState, pendingMessage, clientMessages]);

	const [form, fields] = useForm({
		schema: sendMessageSchema,
		id: "send-message-form",
		lastResult: formState?.lastResult,
		shouldValidate: "onSubmit",
	});

	const { chatId, message } = fields;

	return (
		<div>
			<form
				id={form.id}
				noValidate={form.noValidate}
				className="fixed bottom-0 left-0 right-0 px-4 pb-6 bg-base-100 md:px-0 md:relative md:bottom-auto md:left-auto md:right-auto"
				ref={formRef}
				action={dispatch}
				onSubmit={(event) => {
					if (isPending) {
						event.preventDefault();
						event.stopPropagation();
						return;
					}
					form.onSubmit(event);
				}}
			>
				<FormOptions preventScrollReset revalidate={false} />

				<input
					ref={messageInputRef}
					type="hidden"
					name={chatId.name}
					value={currentChatId}
				/>

				<SendMessageLabel field={message}>
					<SendMessageInput field={message} />
				</SendMessageLabel>
			</form>
			{allClientMessages.map((message, key) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
				<React.Fragment key={key}>{message}</React.Fragment>
			))}
			{children}
		</div>
	);
}

function SendMessageLabel({
	children,
	field,
}: {
	children: React.ReactNode;
	field: FieldMetadata;
}) {
	return (
		<div className="relative">
			<label className="flex items-center w-full gap-2 pr-0 border-0 border-b input input-bordered focus:outline-none focus-within:outline-none">
				<span className="sr-only">Send a message</span>
				{children}
				<SendMessageButton />
			</label>
			{field.errors && (
				<div
					id={field.descriptionId}
					className="absolute left-0 w-full mt-1 text-xs text-error top-full"
					role="alert"
				>
					{field.errors}
				</div>
			)}
		</div>
	);
}

function SendMessageInput({ field }: { field: FieldMetadata<string> }) {
	const form = ReactDOM.useFormStatus();

	return (
		<input
			type="text"
			className="grow"
			placeholder="Message"
			name={field.name}
			defaultValue={field.value}
			aria-describedby={field.errors ? field.descriptionId : undefined}
			disabled={form.pending}
			required
		/>
	);
}

function SendMessageButton() {
	const form = ReactDOM.useFormStatus();

	if (form.pending) {
		return (
			<div className="flex items-center justify-center h-full aspect-square">
				<span className="loading loading-spinner loading-sm">
					<span className="sr-only">Sending message</span>
				</span>
			</div>
		);
	}

	return (
		<button
			type="submit"
			className="flex items-center justify-center h-full aspect-square btn btn-ghost"
		>
			<svg
				fill="none"
				viewBox="0 0 24 24"
				strokeWidth={1.5}
				stroke="currentColor"
				className="w-6 h-6"
			>
				<title>Send</title>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
				/>
			</svg>
		</button>
	);
}

export function FocusSendMessageForm() {
	React.useLayoutEffect(() => {
		const form = document.getElementById("send-message-form");
		if (form) {
			setTimeout(() => {
				form.querySelector<HTMLInputElement>("input[type=text]")?.focus();
			}, 1);
		}
	}, []);

	return null;
}
