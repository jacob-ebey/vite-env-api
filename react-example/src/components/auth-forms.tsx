"use client";

import type { FieldMetadata } from "@conform-to/react";
import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import cn from "clsx";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { useHydrated } from "framework/client";

import type { login, signup } from "@/user/actions";
import { loginFormSchema, signupFormSchema } from "@/user/schema";

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
        <span className="sr-only">Email</span>
        <Input
          field={username}
          type="email"
          placeholder="Email"
          autoComplete="current-email"
        />
      </InputLabel>

      <InputLabel field={password}>
        <span className="sr-only">Password</span>
        <Input
          field={password}
          type="password"
          placeholder="Password"
          autoComplete="current-password"
        />
      </InputLabel>

      <LoginButton />
    </form>
  );
}

type SignupFormProps = {
  action: typeof signup;
  initialState?: Awaited<ReturnType<typeof signup>>;
};

export function SignupForm({ action, initialState }: SignupFormProps) {
  const hydrated = useHydrated();
  const [lastResult, dispatch, isPending] = React.useActionState<
    ReturnType<typeof signup> | undefined,
    FormData
  >(async (_, formData) => {
    return await action(formData);
  }, initialState);

  const [form, fields] = useForm({
    id: "signup-form",
    lastResult,
    onValidate: (context) => {
      return parseWithZod(context.formData, { schema: signupFormSchema });
    },
    shouldValidate: "onBlur",
  });

  const {
    username: email,
    password,
    verifyPassword,
    displayName,
    fullName,
  } = fields;

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
      <InputLabel field={email}>
        <span className="sr-only">Email</span>
        <Input
          field={email}
          type="email"
          placeholder="Email"
          autoComplete="current-email"
        />
      </InputLabel>

      <InputLabel field={password}>
        <span className="sr-only">Password</span>
        <Input
          field={password}
          type="password"
          placeholder="Password"
          autoComplete="new-password"
        />
      </InputLabel>

      <InputLabel field={verifyPassword}>
        <span className="sr-only">Verify Password</span>
        <Input
          field={verifyPassword}
          type="password"
          placeholder="Verify Password"
          autoComplete="new-password"
        />
      </InputLabel>

      <InputLabel field={displayName}>
        <span className="sr-only">Display Name</span>
        <Input
          field={displayName}
          type="text"
          placeholder="Display Name"
          autoComplete="nickname"
        />
      </InputLabel>

      <InputLabel field={fullName}>
        <span className="sr-only">Full Name</span>
        <Input
          field={fullName}
          type="text"
          placeholder="Full Name"
          autoComplete="name"
        />
      </InputLabel>

      <SignupButton />
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
  field: FieldMetadata<string>;
}) {
  return (
    <input
      name={field.name}
      defaultValue={field.value}
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

function SignupButton() {
  const form = ReactDOM.useFormStatus();

  return (
    <button type="submit" className="btn btn-primary" disabled={form.pending}>
      {form.pending ? "Signing Up" : "Sign Up"}
    </button>
  );
}
