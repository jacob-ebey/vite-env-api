"use client";

import * as React from "react";

// import { sayHelloAction } from "./actions";

export function Counter() {
  const [count, setCount] = React.useState(0);

  const handleIncrement = () => setCount((prev) => prev + 1);
  const handleDecrement = () => setCount((prev) => prev - 1);

  return (
    <div className="flex flex-col items-center justify-centers p-4">
      <h1 className="text-5xl text-white font-bold">{count}</h1>
      <div className="flex space-x-4 mt-4">
        <button
          type="button"
          className="btn btn-circle btn-sm btn-outline btn-error"
          onClick={handleDecrement}
        >
          -
        </button>
        <button
          type="button"
          className="btn btn-circle btn-sm btn-outline btn-success"
          onClick={handleIncrement}
        >
          +
        </button>
      </div>
    </div>
  );
}

// console.log(sayHelloAction.$$id);

// export function SayHello() {
//   // TODO: This doesn't work for some reason.
//   return (
//     <form action={sayHelloAction}>
//       <input name="name" />
//       <button type="submit">Say Hello</button>
//     </form>
//   );
// }
