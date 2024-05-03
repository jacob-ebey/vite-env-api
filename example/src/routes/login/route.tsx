import * as framework from "framework";

import { Routes } from "@/app";
import { LoginForm } from "@/components/auth-forms";
import { login } from "@/user/actions";

export default function LoginRoute() {
	const loginAction = framework.getActionResult(login);

	return (
		<>
			<title>Log in</title>
			<meta name="description" content="Log in to get started." />
			<main className="flex flex-col flex-1 h-0">
				<section className="flex flex-col justify-center flex-1 pt-12 pb-24">
					<div className="flex flex-col w-full max-w-md gap-4 px-4 mx-auto">
						<h1 className="text-3xl font-bold">Log in to get started</h1>
						<LoginForm action={login} initialState={loginAction.result} />
						<p>
							Don't have an account?{" "}
							<a href={Routes.signup.pathname()} className="text-primary">
								Sign up
							</a>
						</p>
					</div>
				</section>
			</main>
		</>
	);
}
