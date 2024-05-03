import * as markdown from "tiny-markdown-parser";

export function UserMessage({ children }: { children: string | string[] }) {
	return (
		<div className="prose prose-2xl">
			<MarkdownRenderer>{children}</MarkdownRenderer>
		</div>
	);
}

export function AIMessage({ children }: { children: string | string[] }) {
	return (
		<div className="max-w-full pl-4 prose border-l border-base-content">
			<MarkdownRenderer>{children}</MarkdownRenderer>
		</div>
	);
}

export function PendingAIMessage() {
	return (
		<div>
			<span className="pl-4 border-l loading loading-spinner border-base-content">
				<span className="sr-only">Waiting for response...</span>
			</span>
		</div>
	);
}

export function ErrorMessage({ children }: { children: string | string[] }) {
	return (
		<div className="max-w-full pl-4 prose border-l border-error text-error">
			{children}
		</div>
	);
}

export function MarkdownRenderer({
	children,
}: {
	children: string | string[];
}) {
	const content = Array.isArray(children) ? children.join("") : children;

	const parsed = markdown.parse(content);
	return (
		<div
			// biome-ignore lint/security/noDangerouslySetInnerHtml: safe enough
			dangerouslySetInnerHTML={{ __html: parsed }}
		/>
	);
}
