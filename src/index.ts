import { appendFileSync, readFileSync } from "node:fs";
import { type AnalyzeTextResult, analyzeText } from "@unveil/interlinked";

interface PullRequestEvent {
	pull_request?: {
		number: number;
		body: string | null;
		base: { sha: string };
		user: { login: string };
		author_association?: string;
	};
	repository: { full_name: string };
}

type Mode = "full" | "labels" | "description" | "silent";

const MODES: Mode[] = ["full", "labels", "description", "silent"];

const AUTHOR_ASSOCIATIONS = [
	"collaborator",
	"contributor",
	"first_timer",
	"first_time_contributor",
	"member",
	"owner",
];

const DEFAULT_LABEL_AI = "likely-agent";

/** Where GitHub looks for a PR template, in order. */
const TEMPLATE_PATHS = [
	".github/pull_request_template.md",
	".github/PULL_REQUEST_TEMPLATE.md",
	"pull_request_template.md",
	"PULL_REQUEST_TEMPLATE.md",
	"docs/pull_request_template.md",
	"docs/PULL_REQUEST_TEMPLATE.md",
];

/** Reads an input the way the runner passes it: `INPUT_<NAME>` with spaces as underscores. */
function input(name: string) {
	return (
		process.env[`INPUT_${name.replace(/ /g, "_").toUpperCase()}`] ?? ""
	).trim();
}

/** A list input, as a JSON array or comma-separated, lowercased. */
function listInput(name: string) {
	const value = input(name);
	if (!value) {
		return [];
	}
	let items: unknown[];
	try {
		const parsed = JSON.parse(value);
		items = Array.isArray(parsed) ? parsed : value.split(",");
	} catch {
		items = value.split(",");
	}
	return items.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
}

function getMode(): Mode {
	const value = input("mode").toLowerCase() || "full";
	if ((MODES as string[]).includes(value)) {
		return value as Mode;
	}
	console.log(`::warning::Invalid mode "${value}", falling back to "full".`);
	return "full";
}

function setOutput(name: string, value: string) {
	const file = process.env.GITHUB_OUTPUT;
	if (!file) {
		return;
	}
	const delimiter = `interlinked_${Math.random().toString(36).slice(2)}`;
	appendFileSync(file, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

function summary(markdown: string) {
	const file = process.env.GITHUB_STEP_SUMMARY;
	if (file) {
		appendFileSync(file, `${markdown}\n`);
	}
}

const API = process.env.GITHUB_API_URL ?? "https://api.github.com";

function api(path: string, init: RequestInit = {}) {
	const token = input("github-token");
	return fetch(`${API}${path}`, {
		...init,
		headers: {
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...init.headers,
		},
	});
}

/** The template as of the PR's base, so a PR can't edit it to dodge signals. */
async function fetchTemplate(repo: string, ref: string) {
	for (const path of TEMPLATE_PATHS) {
		const response = await api(`/repos/${repo}/contents/${path}?ref=${ref}`, {
			headers: { Accept: "application/vnd.github.raw+json" },
		});
		if (response.ok) {
			return response.text();
		}
	}
	return undefined;
}

async function syncLabel(repo: string, number: number, isAi: boolean) {
	const label = input("label-ai") || DEFAULT_LABEL_AI;
	const path = `/repos/${repo}/issues/${number}/labels`;
	const response = isAi
		? await api(path, {
				method: "POST",
				body: JSON.stringify({ labels: [label] }),
			})
		: await api(`${path}/${encodeURIComponent(label)}`, { method: "DELETE" });
	// 404 on DELETE means the label wasn't there.
	if (!response.ok && response.status !== 404) {
		console.log(
			`::warning::Couldn't update label "${label}": ${response.status} ${await response.text()}`,
		);
	}
}

/** Wraps the analysis in the PR body so reruns replace it instead of stacking. */
const START = "<!-- interlinked:start -->";
const END = "<!-- interlinked:end -->";
const BLOCK = new RegExp(`\\n*${START}[\\s\\S]*?${END}\\n*`, "g");

/** The body without our block, so it never counts toward the score. */
function stripBlock(body: string) {
	return body.replace(BLOCK, "\n").trimEnd();
}

const ICONS =
	"https://raw.githubusercontent.com/MatteoGabriele/interlinked/main/icons";

function icon(name: string) {
	return `<img src="${ICONS}/${name}.svg" width="16" height="16" alt="">`;
}

function render(result: AnalyzeTextResult) {
	const score = Math.round(result.probability * 100);
	const heading =
		result.verdict === "ai"
			? `${icon("shield-alert")} **Reads like an agent wrote it**`
			: `${icon("heart-handshake")} **Reads like a person wrote it**`;
	const lines = [`${heading} · agent-style score ${score}/100`];
	const message = input(
		result.verdict === "ai" ? "message-ai" : "message-human",
	);
	if (message) {
		lines.push("", message);
	}
	if (result.signals.length > 0) {
		lines.push(
			"",
			"<details><summary>Signals</summary>",
			"",
			"| Signal | Hits | Contribution |",
			"| --- | --- | --- |",
		);
		for (const signal of result.signals) {
			lines.push(
				`| ${signal.description} | ${signal.hits} | ${signal.contribution > 0 ? "+" : ""}${signal.contribution} |`,
			);
		}
		lines.push("", "</details>");
	}
	return lines.join("\n");
}

async function injectIntoBody(
	repo: string,
	pull: NonNullable<PullRequestEvent["pull_request"]>,
	description: string,
	analysis: string,
) {
	const body = `${description}\n\n${START}\n---\n\n${analysis}\n${END}\n`;
	if (body === pull.body) {
		return;
	}
	const response = await api(`/repos/${repo}/pulls/${pull.number}`, {
		method: "PATCH",
		body: JSON.stringify({ body }),
	});
	if (!response.ok) {
		console.log(
			`::warning::Couldn't update the PR description: ${response.status} ${await response.text()}`,
		);
	}
}

async function closePull(repo: string, number: number) {
	const response = await api(`/repos/${repo}/pulls/${number}`, {
		method: "PATCH",
		body: JSON.stringify({ state: "closed" }),
	});
	if (!response.ok) {
		console.log(
			`::warning::Couldn't close the PR: ${response.status} ${await response.text()}`,
		);
	}
}

/** Writing back is best effort. The outputs and summary still stand. */
function warn(error: Error) {
	console.log(`::warning::${error.message}`);
}

async function run() {
	const eventPath = process.env.GITHUB_EVENT_PATH;
	if (!eventPath) {
		throw new Error(
			"GITHUB_EVENT_PATH is not set. Is this running in Actions?",
		);
	}
	const event: PullRequestEvent = JSON.parse(readFileSync(eventPath, "utf8"));
	const pull = event.pull_request;
	if (!pull) {
		console.log(
			"::warning::No pull request in this event. Run on pull_request or pull_request_target.",
		);
		return;
	}

	const author = pull.user.login;
	if (listInput("allowed-users").includes(author.toLowerCase())) {
		console.log(`Skipping analysis for ${author}`);
		return;
	}
	const association = pull.author_association?.toLowerCase();
	const trusted = listInput("trusted-author-associations").filter((item) =>
		AUTHOR_ASSOCIATIONS.includes(item),
	);
	if (association && trusted.includes(association)) {
		console.log(
			`Skipping analysis for ${author} (trusted author association: ${association})`,
		);
		return;
	}

	const mode = getMode();
	const repo = event.repository.full_name;
	const template = await fetchTemplate(repo, pull.base.sha).catch(
		() => undefined,
	);
	const description = stripBlock(pull.body ?? "");
	const result = analyzeText(description, { template });

	console.log(
		`#${pull.number}: ${result.verdict} (probability ${result.probability})`,
	);
	setOutput("verdict", result.verdict);
	setOutput("probability", String(result.probability));
	setOutput("confidence", String(result.confidence));
	setOutput("signals", JSON.stringify(result.signals));

	const analysis = render(result);
	summary(analysis);
	if (mode === "full" || mode === "description") {
		await injectIntoBody(repo, pull, description, analysis).catch(warn);
	}

	const isAi = result.verdict === "ai";
	if (mode === "full" || mode === "labels") {
		await syncLabel(repo, pull.number, isAi).catch(warn);
	}

	if (isAi && input("auto-close") === "true") {
		await closePull(repo, pull.number).catch(warn);
	}

	if (isAi && input("fail-on-ai") === "true") {
		console.log("::error::The PR description reads as agent-written.");
		process.exitCode = 1;
	}
}

run().catch((error: Error) => {
	console.log(`::error::${error.message}`);
	process.exitCode = 1;
});
