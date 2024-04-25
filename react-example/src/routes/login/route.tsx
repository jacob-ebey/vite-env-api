import * as framework from "framework";

import { LoginForm } from "@/components/auth-forms";
import { login } from "@/user/actions";

export default function LoginRoute() {
  const loginAction = framework.getAction(login);

  return (
    <>
      <title>Log in</title>
      <meta name="description" content="Log in to get started." />
      <main className="flex flex-col flex-1">
        <section className="pt-12 pb-24 flex-1 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto px-4 flex flex-col gap-4">
            <h1 className="text-3xl font-bold">Log in to get started</h1>
            <LoginForm action={login} initialState={loginAction.result} />
            <p>
              Don't have an account?{" "}
              <a href="/signup" className="text-primary">
                Sign up
              </a>
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
