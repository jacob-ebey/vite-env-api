import * as framework from "framework";

import { USER_ID_KEY } from "../../middleware/user/server";

import { Favicons } from "./favicons";
import { Header } from "./header";
import { PendingIndicator } from "./pending-indicator";

export default async function ShellRoute({
  children,
}: {
  children?: React.ReactNode;
}) {
  const loggedIn = !!framework.get(USER_ID_KEY);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="theme-color" content="#ffffff" />
        <Favicons />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="flex flex-col max-h-screen h-screen bg-base text-base-content overflow-y-auto">
        <PendingIndicator />
        <Header loggedIn={loggedIn} />
        {children}
      </body>
    </html>
  );
}
