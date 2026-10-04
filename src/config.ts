import { readBooleanInput, readInput, readListInput } from "./utils/inputs";
import { logWarning } from "./utils/workflow";

const MODES = ["full", "labels", "description", "silent"] as const;

export type Mode = (typeof MODES)[number];

const KNOWN_AUTHOR_ASSOCIATIONS = [
	"collaborator",
	"contributor",
	"first_timer",
	"first_time_contributor",
	"member",
	"owner",
];

const DEFAULT_MODE: Mode = "labels";

const DEFAULT_TRUSTED_AUTHOR_ASSOCIATIONS = "member,owner";

const DEFAULT_AGENT_LABEL = "likely-agent";

export interface Config {
	mode: Mode;
	allowedUsers: string[];
	trustedAuthorAssociations: string[];
	agentLabel: string;
	agentMessage: string;
	humanMessage: string;
	shouldAutoClose: boolean;
	shouldFailOnAgent: boolean;
}

export function readConfig(): Config {
	return {
		mode: readMode(),
		allowedUsers: readListInput("allowed-users"),
		trustedAuthorAssociations: readListInput(
			"trusted-author-associations",
			DEFAULT_TRUSTED_AUTHOR_ASSOCIATIONS,
		).filter((association) => KNOWN_AUTHOR_ASSOCIATIONS.includes(association)),
		agentLabel: readInput("label-ai") || DEFAULT_AGENT_LABEL,
		agentMessage: readInput("message-ai"),
		humanMessage: readInput("message-human"),
		shouldAutoClose: readBooleanInput("auto-close"),
		shouldFailOnAgent: readBooleanInput("fail-on-ai"),
	};
}

function readMode(): Mode {
	const requestedMode = readInput("mode").toLowerCase() || DEFAULT_MODE;

	if (isMode(requestedMode)) {
		return requestedMode;
	}

	logWarning(
		`Invalid mode "${requestedMode}", falling back to "${DEFAULT_MODE}".`,
	);
	return DEFAULT_MODE;
}

function isMode(value: string): value is Mode {
	return (MODES as readonly string[]).includes(value);
}

export function shouldUpdateDescription(mode: Mode) {
	return mode === "full" || mode === "description";
}

export function shouldSyncLabel(mode: Mode) {
	return mode === "full" || mode === "labels";
}
