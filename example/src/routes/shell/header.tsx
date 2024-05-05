import * as framework from "framework";

import { Routes } from "@/app";
import { Button } from "@/components/ui/button";
import { logout } from "@/user/actions";
import { getUserId } from "@/user/server";

export function Header() {
  const loggedIn = !!getUserId(false);
  const url = framework.getURL();
  const redirectTo = url.pathname;

  return (
    <div className="border-b border-border">
      <header
        aria-label="Main Navigation"
        className="flex items-center justify-between p-4"
      >
        <h2 className="flex-1 text-lg font-bold">RSC</h2>
        <nav className="ml-auto">
          {!loggedIn ? (
            <Button asChild variant="ghost">
              <a href={Routes.login.pathname()}>Log in</a>
            </Button>
          ) : (
            <Button asChild variant="ghost">
              <a href={Routes.newChat.pathname()}>New Chat</a>
            </Button>
          )}
        </nav>
        {loggedIn && (
          <form action={logout}>
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <Button asChild variant="ghost">
              <button type="submit">Logout</button>
            </Button>
          </form>
        )}
      </header>
    </div>
  );
}
