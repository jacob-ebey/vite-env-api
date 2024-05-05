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
import type { signup } from "@/user/actions";
import { signupFormSchema } from "@/user/schema";

type SignupFormProps = {
  action: typeof signup;
  initialState?: Awaited<ReturnType<typeof signup>>;
};

export function SignupForm({ action, initialState }: SignupFormProps) {
  const { pending } = useNavigation();

  const [form, fields] = useForm({
    id: "signup-form",
    lastResult: initialState,
    schema: signupFormSchema,
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
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>
            Enter your info below to sign up for an account.
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
              autoComplete="new-password"
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
          <div className="grid gap-2">
            <Label htmlFor={verifyPassword.id}>Verify Password</Label>
            <Input
              id={verifyPassword.id}
              name={verifyPassword.name}
              autoComplete="new-password"
              aria-describedby={
                verifyPassword.errors ? verifyPassword.descriptionId : undefined
              }
              type="password"
              required
            />
            {verifyPassword.errors && (
              <Label
                className="text-destructive"
                id={verifyPassword.descriptionId}
              >
                {verifyPassword.errors}
              </Label>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={displayName.id}>Display name</Label>
            <Input
              id={displayName.id}
              name={displayName.name}
              defaultValue={displayName.value}
              autoComplete="username"
              aria-describedby={
                displayName.errors ? displayName.descriptionId : undefined
              }
              placeholder="m"
              required
            />
            {displayName.errors && (
              <Label
                className="text-destructive"
                id={displayName.descriptionId}
              >
                {displayName.errors}
              </Label>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={fullName.id}>Full name</Label>
            <Input
              id={fullName.id}
              name={fullName.name}
              defaultValue={fullName.value}
              autoComplete="name"
              aria-describedby={
                fullName.errors ? fullName.descriptionId : undefined
              }
              placeholder="m"
              required
            />
            {fullName.errors && (
              <Label className="text-destructive" id={fullName.descriptionId}>
                {fullName.errors}
              </Label>
            )}
          </div>
          <Button className="w-full">Sign in</Button>
          <div className="text-sm text-center">
            Already have an account?{" "}
            <a href={Routes.login.pathname()} className="underline">
              Log in
            </a>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
