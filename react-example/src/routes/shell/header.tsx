import * as framework from "framework";

import { logout } from "../../middleware/user/actions";

export function Header({ loggedIn }: { loggedIn: boolean }) {
  const url = framework.getURL();
  const redirectTo = url.pathname;

  return (
    <header
      aria-label="Main Navigation"
      className="navbar bg-neutral text-neutral-content"
    >
      <nav className="flex-1">
        <a href="/" className="btn btn-ghost normal-case text-xl">
          Home
        </a>
        <a href="/chat" className="btn btn-ghost normal-case text-xl">
          Chat
        </a>
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
