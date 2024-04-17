import { sayHelloAction } from "./actions";

export function SayHello() {
  return (
    <form action={sayHelloAction}>
      <button type="submit">Say Hello</button>
    </form>
  );
}
