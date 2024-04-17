"use client";

import * as React from "react";

import { sayHelloAction } from "./actions";

export function Counter() {
  const [count, setCount] = React.useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button type="button" onClick={() => setCount((prev) => prev + 1)}>
        Increment
      </button>
      <button type="button" onClick={() => setCount((prev) => prev - 1)}>
        Decrement
      </button>
    </div>
  );
}

console.log(sayHelloAction.$$id);

export function SayHello() {
  // TODO: This doesn't work for some reason.
  return (
    <form action={sayHelloAction}>
      <input name="name" />
      <button type="submit">Say Hello</button>
    </form>
  );
}
