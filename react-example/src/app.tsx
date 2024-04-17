import * as context from "./context";

import { sayHelloAction } from "./actions";
import { Counter, SayHello } from "./client";

export function App() {
  const url = context.getURL();

  const msg = "Hello, Server!";
  return (
    <html lang="en">
      <head>
        <title>{msg}</title>
      </head>
      <body>
        <h1>{msg}</h1>
        <p>
          URL: <code>{url.href}</code>
        </p>
        <Counter />
        <form action={sayHelloAction}>
          <input name="name" />
          <button type="submit">Say Hello</button>
        </form>
        <SayHello />
      </body>
    </html>
  );
}
