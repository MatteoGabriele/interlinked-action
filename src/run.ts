import { readFileSync } from "node:fs";
import { type AnalyzeTextResult, analyzeText } from "@unveil/interlinked";
import {
	appendAnalysisBlock,
	stripAnalysisBlock,
	wrapAnalysisComment,
} from "./analysis/marker";
import { renderAnalysis } from "./analysis/render";
import {
	type Config,
	readConfig,
	shouldPublishAnalysis,
	shouldSyncLabel,
} from "./config";
import { upsertAnalysisComment } from "./github/comments";
import { addAgentLabel } from "./github/labels";
import { closePullRequest, updatePullRequestBody } from "./github/pull-request";
import { fetchPullRequestTemplate } from "./github/template";
import type { PullRequest, PullRequestEvent } from "./types";
import {
	appendJobSummary,
	logError,
	logWarning,
	setOutput,
} from "./utils/workflow";

function readPullRequestEvent(): PullRequestEvent {
	const eventPath = process.env.GITHUB_EVENT_PATH;
	if (!eventPath) {
		throw new Error(
			"GITHUB_EVENT_PATH is not set. Is this running in Actions?",
		);
	}

	return JSON.parse(readFileSync(eventPath, "utf8"));
}

function findSkipReason(pull: PullRequest, config: Config) {
	const author = pull.user.login;

	if (config.allowedUsers.includes(author.toLowerCase())) {
		return `Skipping analysis for ${author}`;
	}

	const association = pull.author_association?.toLowerCase();
	if (association && config.trustedAuthorAssociations.includes(association)) {
		return `Skipping analysis for ${author} (trusted author association: ${association})`;
	}

	return undefined;
}

async function fetchTemplateSafely(repo: string, ref: string) {
	try {
		return await fetchPullRequestTemplate(repo, ref);
	} catch (error) {
		logWarning(
			`Couldn't fetch the PR template, analyzing without it: ${(error as Error).message}`,
		);
		return undefined;
	}
}

function publishOutputs(result: AnalyzeTextResult) {
	setOutput("verdict", result.verdict);
	setOutput("probability", String(result.probability));
	setOutput("confidence", String(result.confidence));
	setOutput("signals", JSON.stringify(result.signals));
}

function warnOnError(error: Error) {
	logWarning(error.message);
}

async function publishAnalysis(
	pull: PullRequest,
	repo: string,
	description: string,
	analysis: string,
	config: Config,
) {
	if (config.analysisLocation === "comment") {
		await upsertAnalysisComment(
			repo,
			pull.number,
			wrapAnalysisComment(analysis),
		);
		return;
	}

	const updatedBody = appendAnalysisBlock(description, analysis);
	if (updatedBody !== pull.body) {
		await updatePullRequestBody(repo, pull.number, updatedBody);
	}
}

export async function run() {
	const event = readPullRequestEvent();
	const pull = event.pull_request;
	if (!pull) {
		logWarning(
			"No pull request in this event. Run on pull_request or pull_request_target.",
		);
		return;
	}

	const config = readConfig();
	const skipReason = findSkipReason(pull, config);
	if (skipReason) {
		console.log(skipReason);
		return;
	}

	const repo = event.repository.full_name;
	const template = await fetchTemplateSafely(repo, pull.base.sha);
	const description = stripAnalysisBlock(pull.body ?? "");
	const result = analyzeText(description, { template });
	const isAgentWritten = result.verdict === "ai";

	console.log(
		`#${pull.number}: ${result.verdict} (probability ${result.probability})`,
	);

	publishOutputs(result);

	const analysis = renderAnalysis(
		result,
		isAgentWritten ? config.agentMessage : config.humanMessage,
	);
	appendJobSummary(analysis);

	if (shouldPublishAnalysis(config.mode)) {
		await publishAnalysis(pull, repo, description, analysis, config).catch(
			warnOnError,
		);
	}

	if (isAgentWritten && shouldSyncLabel(config.mode)) {
		await addAgentLabel(repo, pull.number, config.agentLabel).catch(
			warnOnError,
		);
	}

	if (isAgentWritten && config.shouldAutoClose) {
		await closePullRequest(repo, pull.number).catch(warnOnError);
	}

	if (isAgentWritten && config.shouldFailOnAgent) {
		logError("The PR description reads as agent-written.");
		process.exitCode = 1;
	}
}
