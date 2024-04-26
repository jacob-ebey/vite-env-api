import * as framework from "framework";

import { SignupForm } from "@/components/auth-forms";
import { signup } from "@/user/actions";

export default function LoginRoute() {
	const signupAction = framework.getAction(signup);

	return (
		<>
			<title>Sign up</title>
			<meta name="description" content="Log in to get started." />
			<main className="flex flex-col flex-1">
				<section className="pt-12 pb-24 flex-1 flex flex-col justify-center">
					<div className="max-w-md w-full mx-auto px-4 flex flex-col gap-4">
						<h1 className="text-3xl font-bold">Sign up to get started</h1>
						<SignupForm action={signup} initialState={signupAction.result} />
						<p>
							Already have an account?{" "}
							<a href="/" className="text-primary">
								Log in
							</a>
						</p>
					</div>
				</section>
			</main>
		</>
	);
}
