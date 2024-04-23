export function UserMessage({ children }: { children: string | string[] }) {
  return <div className="text-3xl text-base-content">{children}</div>;
}

export function AIMessage({ children }: { children: string | string[] }) {
  return (
    <pre>
      <code className="whitespace-pre-wrap">{children}</code>
    </pre>
  );
}

export function PendingAIMessage() {
  return (
    <div>
      <span className="loading loading-spinner">
        <span className="sr-only">Waiting for response...</span>
      </span>
    </div>
  );
}
