import { PendingIndicator } from "./client";
import { Favicons } from "./favicons";
import { Header } from "./header";

export default async function ShellRoute({
  children,
}: {
  children?: React.ReactNode;
}) {
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
      <body className="flex flex-col h-screen">
        <PendingIndicator />
        <Header />
        {children}
      </body>
    </html>
  );
}
