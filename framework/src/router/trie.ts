export const INDEX_SYMBOL = Symbol("index"),
	DYNAMIC_SYMBOL = Symbol("dynamic"),
	OPTIONAL_SYMBOL = Symbol("optional"),
	CATCH_ALL_SYMBOL = Symbol("catch-all"),
	ROUTE_SYMBOL = Symbol("route"),
	ROOT_SYMBOL = Symbol("root");

// #region MATCHING

export function matchTrie<Route extends RouteConfig>(
	root: Node<Route>,
	pathname: string,
	options: {
		onVisit?: (node: Node<Route>) => void;
	} = {},
) {
	const matched = matchRecursive<Route>(
		root,
		getSegments(sanitizePath(pathname)),
		0,
		[],
		options.onVisit,
	);

	return matched.length ? rankMatched(matched) : null;
}

function matchRecursive<Route extends RouteConfig>(
	root: Node<Route> | undefined,
	segments: string[],
	segmentIndex: number,
	matches: Omit<Route, "children">[][],
	onVisit?: (node: Node<Route>) => void,
): Omit<Route, "children">[][] {
	if (!root) return matches;

	if (onVisit) onVisit(root);

	const segmentsLength = segments.length;
	if (segmentIndex >= segmentsLength) {
		switch (root.key) {
			case INDEX_SYMBOL:
				matchRecursive(
					root.children[0],
					segments,
					segmentIndex,
					matches,
					onVisit,
				);
				break;
			case DYNAMIC_SYMBOL:
			case CATCH_ALL_SYMBOL:
				break;

			case ROUTE_SYMBOL: {
				if (root.route) {
					matches.push(getMatchesFromNode(root)!);
				}
			}
			case ROOT_SYMBOL:
			case OPTIONAL_SYMBOL:
				for (const child of root.children) {
					matchRecursive(child, segments, segmentIndex, matches, onVisit);
				}
				break;
		}
	} else {
		if (typeof root.key === "string") {
			if (root.key === segments[segmentIndex]) {
				for (const child of root.children) {
					matchRecursive(child, segments, segmentIndex + 1, matches, onVisit);
				}
			}
		} else {
			switch (root.key) {
				case INDEX_SYMBOL:
					break;
				case CATCH_ALL_SYMBOL:
					matchRecursive(
						root.children[0],
						segments,
						segmentsLength,
						matches,
						onVisit,
					);
					break;
				case DYNAMIC_SYMBOL:
				case OPTIONAL_SYMBOL:
					segmentIndex++;
				case ROOT_SYMBOL:
				case ROUTE_SYMBOL:
					for (const child of root.children) {
						matchRecursive(child, segments, segmentIndex, matches, onVisit);
					}
					break;
			}
		}
	}

	return matches;
}

function getMatchesFromNode<Route extends RouteConfig>(node: Node<Route>) {
	if (!node.route) return null;
	let matches: Omit<Route, "children">[] = [],
		currentNode: Node<Route> | null = node;
	while (currentNode) {
		if (currentNode.route) {
			matches.push(currentNode.route);
		}
		currentNode = currentNode.parent;
	}

	return matches.reverse();
}

function rankMatched<Route extends RouteConfig>(
	matched: Omit<Route, "children">[][],
) {
	let bestScore = Number.MIN_SAFE_INTEGER,
		bestMatch;

	for (const matches of matched) {
		let score = 0;
		for (const match of matches) {
			score += computeScore(match);
		}

		if (score > bestScore) {
			bestScore = score;
			bestMatch = matches;
		}
	}

	return bestMatch;
}

const staticSegmentValue = 10,
	dynamicSegmentValue = 4,
	optionalSegmentValue = 3,
	indexRouteValue = 2,
	emptySegmentValue = 1,
	splatPenalty = -1,
	isSplat = (s: string) => s === "*";
function computeScore(match: Omit<RouteConfig, "children">): number {
	let segments = getSegments(match.path || ""),
		initialScore = segments.length * segments.length;
	if (segments.some(isSplat)) {
		initialScore += splatPenalty;
	}

	if (match.index) {
		initialScore += indexRouteValue;
	}

	return segments
		.filter((s) => !isSplat(s))
		.reduce(
			(score, segment, i) =>
				score +
				(segment.startsWith(":")
					? segment.endsWith("?")
						? optionalSegmentValue * (i + 1)
						: dynamicSegmentValue * (i + 1)
					: segment === ""
						? emptySegmentValue * (i + 1)
						: staticSegmentValue * (i + 1)),
			initialScore,
		);
}

// #endregion MATCHING

// #region CREATION
export function createTrie<Route extends RouteConfig>(routes: Route[]) {
	const root: Node<Route> = {
		key: ROOT_SYMBOL,
		parent: null,
		children: [],
		route: null,
	};

	for (const route of routes) {
		insertRouteConfig(root, route);
	}

	return root;
}

function insertRouteConfig<Route extends RouteConfig>(
	root: Node<Route>,
	route: Route,
) {
	const path = sanitizePath(route.path),
		node = insertPath(root, path, route);

	if (!route.index && route.children) {
		for (const childRoute of route.children) {
			insertRouteConfig<Route>(node, childRoute as Route);
		}
	}

	return node;
}

function sanitizePath(path?: string) {
	return path ? path.replace(/^\//, "").replace(/\/$/, "") : "";
}

function getSegments(path: string) {
	return path.split("/").filter(Boolean);
}

function insertPath<Route extends RouteConfig>(
	root: Node<Route>,
	path: string,
	route: Route,
) {
	let segments = getSegments(path),
		segmentsLength = segments.length,
		currentNode = root;

	for (let i = 0; i < segmentsLength; i++) {
		const segment = segments[i];
		if (!segment) continue;

		if (segment.startsWith("*")) {
			const existingNode = currentNode.children.find(
				(child) => child.key === CATCH_ALL_SYMBOL,
			);
			if (existingNode) {
				throw new Error(
					"Only one catch all route is allowed per branch of the tree",
				);
			}
			const catchAllNode = createNode(CATCH_ALL_SYMBOL, currentNode);
			currentNode.children.push(catchAllNode);
			currentNode = catchAllNode;
			break;
		}
		if (segment.startsWith(":")) {
			if (segment.endsWith("?")) {
				const existingNode = currentNode.children.find(
					(child) => child.key === OPTIONAL_SYMBOL,
				);
				if (existingNode) {
					currentNode = existingNode;
				} else {
					const optionalNode = createNode(OPTIONAL_SYMBOL, currentNode);
					currentNode.children.push(optionalNode);
					currentNode = optionalNode;
				}
			} else {
				const existingNode = currentNode.children.find(
					(child) => child.key === DYNAMIC_SYMBOL,
				);
				if (existingNode) {
					currentNode = existingNode;
				} else {
					const dynamicNode = createNode(DYNAMIC_SYMBOL, currentNode);
					currentNode.children.push(dynamicNode);
					currentNode = dynamicNode;
				}
			}
			continue;
		}

		const existingNode = currentNode.children.find(
			(child) => child.key === segment,
		);
		if (existingNode) {
			currentNode = existingNode;
		} else {
			const segmentNode = createNode(segment, currentNode);
			currentNode.children.push(segmentNode);
			currentNode = segmentNode;
		}
	}

	if (route.index) {
		const indexNode = createNode(INDEX_SYMBOL, currentNode);
		currentNode.children.push(indexNode);
		currentNode = indexNode;
	}

	const routeNode = createNode(ROUTE_SYMBOL, currentNode, route);
	currentNode.children.push(routeNode);
	currentNode = routeNode;

	return currentNode;
}

function createNode<Route extends RouteConfig>(
	key: string | symbol,
	parent: Node<Route>,
	route: Route | null = null,
) {
	if (route) {
		const { children: _, ...rest } = route as NonIndexRouteConfig;
		route = rest as any;
	}
	const node: Node<Route> = {
		key,
		route,
		parent,
		children: [],
	};
	return node;
}

// #endregion CREATION

// #region TYPES

export interface Node<Item> {
	key: string | symbol;
	parent: Node<Item> | null;
	children: Node<Item>[];
	route: Omit<Item, "children"> | null;
}

interface BaseRouteConfig {
	id: string;
	path?: string;
}

export interface IndexRouteConfig extends BaseRouteConfig {
	index: true;
}

export interface NonIndexRouteConfig extends BaseRouteConfig {
	index?: false;
	children?: RouteConfig[];
}

export type RouteConfig = IndexRouteConfig | NonIndexRouteConfig;

// #endregion TYPES
