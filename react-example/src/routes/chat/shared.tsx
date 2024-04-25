import { MarkdownRenderer } from "./client";

export function UserMessage({ children }: { children: string | string[] }) {
  return (
    <div className="prose prose-2xl">
      <MarkdownRenderer>{children}</MarkdownRenderer>
    </div>
  );
}

export function AIMessage({ children }: { children: string | string[] }) {
  return (
    <div className="prose max-w-full border-l border-base-content pl-4">
      <MarkdownRenderer>{children}</MarkdownRenderer>
    </div>
  );
}

export function PendingAIMessage() {
  return (
    <div>
      <span className="loading loading-spinner border-l border-base-content pl-4">
        <span className="sr-only">Waiting for response...</span>
      </span>
    </div>
  );
}

export function RetryMessage({ children }: { children: string | string[] }) {
  return (
    <div className="text-3xl text-error">
      <MarkdownRenderer>{children}</MarkdownRenderer>
    </div>
  );
}
