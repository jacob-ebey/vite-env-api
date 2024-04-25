"use client";

import type { FieldMetadata } from "@conform-to/react";
import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as markdown from "tiny-markdown-parser";

import { useHydrated } from "framework/client";
import { FormOptions } from "framework/shared";

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
  const hydrated = useHydrated();

  const [clientMessages, setClientMessages] = React.useState<React.ReactNode[]>(
    []
  );
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
  }, initialState);

  const allClientMessages = React.useMemo(() => {
    if (pendingMessage) {
      return [pendingMessage, <PendingAIMessage />, ...clientMessages];
    }
    if (formState && !formState.stream && formState.newMessages) {
      return [...formState.newMessages, ...clientMessages];
    }
    return clientMessages;
  }, [formState, pendingMessage, clientMessages]);

  const [form, fields] = useForm({
    id: "send-message-form",
    lastResult: formState?.lastResult,
    onValidate: (context) => {
      return parseWithZod(context.formData, { schema: sendMessageSchema });
    },
    shouldValidate: "onSubmit",
  });

  const { chatId, message } = fields;

  return (
    <div>
      <form
        className="mb-6"
        ref={formRef}
        id={form.id}
        action={hydrated ? dispatch : action}
        noValidate={hydrated}
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

        <input type="hidden" name={chatId.name} value={currentChatId} />

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
      <label className="input input-bordered border-0 border-b flex items-center gap-2 w-full pr-0 focus:outline-none focus-within:outline-none">
        <span className="sr-only">Send a message</span>
        {children}
        <SendMessageButton />
      </label>
      {field.errors && (
        <div
          id={field.descriptionId}
          className="text-xs text-error absolute top-full left-0 w-full mt-1"
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
    />
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

export function MarkdownRenderer({
  children,
}: {
  children: string | string[];
}) {
  const content = Array.isArray(children) ? children.join("") : children;

  const parsed = React.useMemo(() => markdown.parse(content), [content]);
  return (
    <div
      // biome-ignore lint/security/noDangerouslySetInnerHtml: safe enough
      dangerouslySetInnerHTML={{ __html: parsed }}
    />
  );
}
