import * as framework from "framework";

import { login } from "@/user/actions";

import { LoginForm } from "./client";

export default function LoginRoute() {
	const loginAction = framework.getActionResult(login);

	return (
		<>
			<title>Log in</title>
			<meta name="description" content="Log in to get started." />

			<main
				className="flex flex-col flex-1 h-0 overflow-y-auto"
				data-scroll-to-top
			>
				<section className="flex flex-col justify-center flex-1 py-12">
					<div className="flex flex-col w-full max-w-md gap-4 px-4 mx-auto">
						<LoginForm action={login} initialState={loginAction.result} />
					</div>
				</section>
			</main>
		</>
	);
}
