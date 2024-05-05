import * as framework from "framework";

import { signup } from "@/user/actions";

import { SignupForm } from "./client";

export default function LoginRoute() {
  const signupAction = framework.getActionResult(signup);

  return (
    <>
      <title>Sign up</title>
      <meta name="description" content="Log in to get started." />

      <main
        className="flex flex-col flex-1 h-0 overflow-y-auto"
        data-scroll-to-top
      >
        <section className="flex flex-col justify-center flex-1 py-12">
          <div className="flex flex-col w-full max-w-md gap-4 px-4 mx-auto">
            <SignupForm action={signup} initialState={signupAction.result} />
          </div>
        </section>
      </main>
    </>
  );
}
