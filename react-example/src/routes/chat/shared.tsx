export function UserMessage({ children }: { children: string | string[] }) {
  return <div className="text-3xl text-base-content">{children}</div>;
}

export function AIMessage({ children }: { children: string | string[] }) {
  return <div>{children}</div>;
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

export function RetryMessage({ children }: { children: string | string[] }) {
  return <div className="text-3xl text-error">{children}</div>;
}
