import * as framework from "framework";

import { SignupForm } from "@/components/auth-forms";
import { signup } from "@/user/actions";
import { Routes } from "@/app";

export default function LoginRoute() {
	const signupAction = framework.getActionResult(signup);

	return (
		<>
			<title>Sign up</title>
			<meta name="description" content="Log in to get started." />
			<main className="flex flex-col flex-1">
				<section className="flex flex-col justify-center flex-1 pt-12 pb-24">
					<div className="flex flex-col w-full max-w-md gap-4 px-4 mx-auto">
						<h1 className="text-3xl font-bold">Sign up to get started</h1>
						<SignupForm action={signup} initialState={signupAction.result} />
						<p>
							Already have an account?{" "}
							<a href={Routes.login.pathname()} className="text-primary">
								Log in
							</a>
						</p>
					</div>
				</section>
			</main>
		</>
	);
}
