import { appendFileSync } from "node:fs";

export function logWarning(message: string) {
	console.log(`::warning::${message}`);
}

export function logError(message: string) {
	console.log(`::error::${message}`);
}

export function setOutput(name: string, value: string) {
	const outputFile = process.env.GITHUB_OUTPUT;
	if (!outputFile) {
		return;
	}

	const delimiter = `interlinked_${Math.random().toString(36).slice(2)}`;
	appendFileSync(outputFile, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

export function appendJobSummary(markdown: string) {
	const summaryFile = process.env.GITHUB_STEP_SUMMARY;
	if (summaryFile) {
		appendFileSync(summaryFile, `${markdown}\n`);
	}
}
