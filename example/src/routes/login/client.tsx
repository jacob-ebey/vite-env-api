"use client";

import { useNavigation } from "framework/client";

import { Routes } from "@/app";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@/forms/client";
import type { login } from "@/user/actions";
import { loginFormSchema } from "@/user/schema";

type LoginFormProps = {
  action: typeof login;
  initialState?: Awaited<ReturnType<typeof login>>;
};

export function LoginForm({ action, initialState }: LoginFormProps) {
  const { pending } = useNavigation();
  const [form, fields] = useForm({
    id: "login-form",
    lastResult: initialState,
    schema: loginFormSchema,
    shouldValidate: "onBlur",
  });

  const { password, username: email } = fields;

  return (
    <form
      id={form.id}
      noValidate={form.noValidate}
      action={action}
      className="flex flex-col gap-4 mt-4"
      onSubmit={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }
        form.onSubmit(event);
      }}
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Log in</CardTitle>
          <CardDescription>
            Enter your email below to log in to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={email.id}>Email</Label>
            <Input
              id={email.id}
              name={email.name}
              defaultValue={email.value}
              autoComplete="email"
              aria-describedby={email.errors ? email.descriptionId : undefined}
              type="email"
              placeholder="m@example.com"
              required
            />
            {email.errors && (
              <Label className="text-destructive" id={email.descriptionId}>
                {email.errors}
              </Label>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={password.id}>Password</Label>
            <Input
              id={password.id}
              name={password.name}
              autoComplete="current-password"
              aria-describedby={
                password.errors ? password.descriptionId : undefined
              }
              type="password"
              required
            />
            {password.errors && (
              <Label className="text-destructive" id={password.descriptionId}>
                {password.errors}
              </Label>
            )}
          </div>
          <Button className="w-full">Log in</Button>
          <div className="text-sm text-center">
            Don&apos;t have an account?{" "}
            <a href={Routes.signup.pathname()} className="underline">
              Sign up
            </a>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
