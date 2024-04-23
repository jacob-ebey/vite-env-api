"use client";

import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { useHydrated } from "framework/client";
import { FormOptions } from "framework/shared";

import type { sendMessage } from "./actions";
import { sendMessageSchema } from "./schema";
import { PendingAIMessage, UserMessage } from "./shared";

type SendMessageFormProps = {
  action: typeof sendMessage;
  initialMessages: string[];
  initialState?: Awaited<ReturnType<typeof sendMessage>>;
};

export function SendMessageForm({
  action,
  initialMessages,
  initialState,
}: SendMessageFormProps) {
  const hydrated = useHydrated();

  const [messages, setMessages] =
    React.useState<React.ReactNode[]>(initialMessages);
  const [pendingMessage, setPendingMessage] =
    React.useOptimistic<React.ReactNode | null>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const [formState, dispatch, isPending] = React.useActionState<
    ReturnType<typeof action> | undefined,
    Parameters<typeof action>[0]
  >(async (_, formData) => {
    const parsed = parseWithZod(formData, { schema: sendMessageSchema });
    if (parsed.status === "success") {
      setPendingMessage(<UserMessage>{parsed.value.message}</UserMessage>);
    }

    const result = await action(formData, true);

    if (result?.newMessages) {
      if (formState && !formState.stream && formState.newMessages) {
        setMessages((messages) => [
          ...result.newMessages,
          ...formState.newMessages,
          ...messages,
        ]);
      } else {
        setMessages((messages) => [...result.newMessages, ...messages]);
      }
    }

    return result;
  }, initialState);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  React.useLayoutEffect(() => {
    if (!pendingMessage && hydrated) {
      (
        formRef.current?.elements.namedItem(message.name) as HTMLInputElement
      )?.focus();
    }
  }, [pendingMessage]);

  const allMessages = React.useMemo(() => {
    if (pendingMessage) {
      return [<PendingAIMessage />, pendingMessage, ...messages];
    }
    if (formState && !formState.stream && formState.newMessages) {
      return [...formState.newMessages, ...messages];
    }
    return messages;
  }, [formState, pendingMessage, messages]);

  const [form, fields] = useForm({
    id: "send-message-form",
    lastResult: formState?.lastResult,
    onValidate: (context) => {
      return parseWithZod(context.formData, { schema: sendMessageSchema });
    },
    shouldValidate: "onSubmit",
  });

  const { message } = fields;

  return (
    <div className="flex flex-col gap-6">
      <form
        ref={formRef}
        id={form.id}
        action={hydrated ? dispatch : action}
        noValidate={hydrated}
        className="relative"
        onSubmit={(event) => {
          if (isPending) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          form.onSubmit(event);
        }}
      >
        <FormOptions revalidate={false} />

        <label className="input input-bordered border-0 border-b flex items-center gap-2 w-full pr-0 focus:outline-none focus-within:outline-none">
          <span className="sr-only">Send a message</span>
          <input
            type="text"
            className="grow"
            placeholder="Message"
            name={message.name}
            aria-describedby={
              message.errors ? message.descriptionId : undefined
            }
            disabled={isPending}
          />
          <SendMessageButton />
        </label>
        {message.errors && (
          <div
            id={message.descriptionId}
            className="text-xs text-error absolute top-full left-0 w-full mt-1"
            role="alert"
          >
            {message.errors}
          </div>
        )}
      </form>
      {allMessages.map((message, key) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
        <React.Fragment key={key}>{message}</React.Fragment>
      ))}
    </div>
  );
}

function SendMessageButton() {
  const form = ReactDOM.useFormStatus();

  if (form.pending) {
    return (
      <div className="h-full aspect-square flex items-center justify-center">
        <span className="loading loading-spinner loading-sm">
          <span className="sr-only">Sending message</span>
        </span>
      </div>
    );
  }

  return (
    <button
      type="submit"
      className="h-full aspect-square flex items-center justify-center btn btn-ghost"
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
