import * as framework from "framework";

import { Routes } from "@/app";
import { logout } from "@/user/actions";
import { getUserId } from "@/user/server";

export function Header() {
	const loggedIn = !!getUserId(false);
	const url = framework.getURL();
	const redirectTo = url.pathname;

	return (
		<header
			aria-label="Main Navigation"
			className="navbar bg-neutral text-neutral-content"
		>
			<nav className="flex-1">
				{!loggedIn ? (
					<a href={Routes.login.pathname()} className="btn btn-ghost">
						Login
					</a>
				) : (
					<a href={Routes.newChat.pathname()} className="btn btn-ghost">
						New Chat
					</a>
				)}
			</nav>
			{loggedIn && (
				<form action={logout}>
					<input type="hidden" name="redirectTo" value={redirectTo} />
					<button type="submit" className="btn btn-ghost">
						Logout
					</button>
				</form>
			)}
		</header>
	);
}
