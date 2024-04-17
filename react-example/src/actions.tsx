"use server";

export function sayHelloAction(formData: FormData) {
  return <p>Hello, {String(formData.get("name"))}!</p>;
}
