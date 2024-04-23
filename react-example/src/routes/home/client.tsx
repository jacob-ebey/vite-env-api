"use client";

import type { FieldMetadata } from "@conform-to/react";
import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import cn from "clsx";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { useHydrated } from "framework/client";

import type { login } from "../../middleware/user/actions";
import { loginFormSchema } from "../../middleware/user/schema";

type LoginFormProps = {
  action: typeof login;
  initialState?: Awaited<ReturnType<typeof login>>;
};

export function LoginForm({ action, initialState }: LoginFormProps) {
  const hydrated = useHydrated();
  const [lastResult, dispatch, isPending] = React.useActionState<
    ReturnType<typeof login> | undefined,
    FormData
  >(async (_, formData) => {
    return await action(formData);
  }, initialState);

  const [form, fields] = useForm({
    id: "login-form",
    lastResult,
    onValidate: (context) => {
      return parseWithZod(context.formData, { schema: loginFormSchema });
    },
    shouldValidate: "onBlur",
  });

  const { password, username } = fields;

  return (
    <form
      id={form.id}
      action={hydrated ? dispatch : action}
      noValidate={hydrated}
      className="mt-4 flex flex-col gap-4"
      onSubmit={(event) => {
        if (isPending) {
          event.preventDefault();
          return;
        }
        form.onSubmit(event);
      }}
    >
      <InputLabel field={username}>
        Email
        <Input
          field={username}
          type="email"
          placeholder="daisy@site.com"
          autoComplete="current-email"
        />
      </InputLabel>

      <InputLabel field={password}>
        Password
        <Input
          field={password}
          type="password"
          placeholder="**************"
          autoComplete="current-password"
        />
      </InputLabel>

      <LoginButton />
    </form>
  );
}

function InputLabel({
  children,
  field,
}: {
  children?: React.ReactNode;
  field: FieldMetadata;
}) {
  return (
    <div>
      <label
        className={cn("input input-bordered flex items-center gap-2", {
          "input-error": !!field.errors,
        })}
      >
        {children}
      </label>
      {!!field.errors && (
        <ul id={field.descriptionId} className="text-error">
          {field.errors.map((error) => (
            <li key={error} className="mt-1">
              {error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Input({
  field,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  field: FieldMetadata;
}) {
  return (
    <input
      name={field.name}
      aria-describedby={field.errors ? field.descriptionId : undefined}
      className="grow"
      {...props}
    />
  );
}

function LoginButton() {
  const form = ReactDOM.useFormStatus();

  return (
    <button type="submit" className="btn btn-primary" disabled={form.pending}>
      {form.pending ? "Logging In" : "Login"}
    </button>
  );
}
