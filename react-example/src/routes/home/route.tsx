import * as framework from "framework";

import { login } from "../../middleware/user/actions";
import { LoginForm } from "./client";

export default function HomeRoute() {
  const loginAction = framework.getAction(login);

  return (
    <>
      <title>Home</title>
      <meta name="description" content="An AI chatbot" />
      <main className="flex flex-col flex-1">
        <section className="pt-12 pb-24 flex-1 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto px-4">
            <h1 className="text-3xl font-bold" aria-label="Hero Title">
              Login
            </h1>
            <p className="text-lg mt-3" aria-label="Hero Description">
              Login to get started
            </p>
            <LoginForm action={login} initialState={loginAction.result} />
          </div>
        </section>
      </main>
    </>
  );
}
