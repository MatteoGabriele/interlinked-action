import { readBooleanInput, readInput, readListInput } from "./utils/inputs";
import { logWarning } from "./utils/workflow";

const MODES = ["full", "labels", "description", "silent"] as const;

export type Mode = (typeof MODES)[number];

const ANALYSIS_LOCATIONS = ["description", "comment"] as const;

export type AnalysisLocation = (typeof ANALYSIS_LOCATIONS)[number];

const KNOWN_AUTHOR_ASSOCIATIONS = [
	"collaborator",
	"contributor",
	"first_timer",
	"first_time_contributor",
	"member",
	"owner",
];

const DEFAULT_MODE: Mode = "labels";

const DEFAULT_ANALYSIS_LOCATION: AnalysisLocation = "comment";

const DEFAULT_TRUSTED_AUTHOR_ASSOCIATIONS = "member,owner";

const DEFAULT_AGENT_LABEL = "likely-agent";

export interface Config {
	mode: Mode;
	analysisLocation: AnalysisLocation;
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
		mode: readChoice("mode", MODES, DEFAULT_MODE),
		analysisLocation: readChoice(
			"analysis-location",
			ANALYSIS_LOCATIONS,
			DEFAULT_ANALYSIS_LOCATION,
		),
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

function readChoice<T extends string>(
	name: string,
	choices: readonly T[],
	fallback: T,
): T {
	const requested = readInput(name).toLowerCase() || fallback;

	if ((choices as readonly string[]).includes(requested)) {
		return requested as T;
	}

	logWarning(`Invalid ${name} "${requested}", falling back to "${fallback}".`);
	return fallback;
}

export function shouldPublishAnalysis(mode: Mode) {
	return mode === "full" || mode === "description";
}

export function shouldSyncLabel(mode: Mode) {
	return mode === "full" || mode === "labels";
}
