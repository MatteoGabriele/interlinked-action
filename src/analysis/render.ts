import type { AnalyzeTextResult } from "@unveil/interlinked";

type Signal = AnalyzeTextResult["signals"][number];

const ICONS_BASE_URL =
	"https://raw.githubusercontent.com/MatteoGabriele/interlinked/main/icons";

function renderIcon(name: string) {
	return `<picture><img src="${ICONS_BASE_URL}/${name}.svg" width="16" height="16" alt=""></picture>`;
}

function renderHeading(result: AnalyzeTextResult) {
	const score = Math.round(result.probability * 100);
	const verdictLine =
		result.verdict === "ai"
			? `${renderIcon("shield-alert")} **Reads like an agent wrote it**`
			: `${renderIcon("heart-handshake")} **Reads like a person wrote it**`;

	return `${verdictLine} · agent-style score ${score}/100`;
}

function formatContribution(contribution: number) {
	return `${contribution > 0 ? "+" : ""}${contribution}`;
}

function renderSignalsTable(signals: Signal[]) {
	const rows = signals.map(
		(signal) =>
			`| ${signal.description} | ${signal.hits} | ${formatContribution(signal.contribution)} |`,
	);

	return [
		"<details><summary>Signals</summary>",
		"",
		"| Signal | Hits | Contribution |",
		"| --- | --- | --- |",
		...rows,
		"",
		"</details>",
	].join("\n");
}

export function renderAnalysis(
	result: AnalyzeTextResult,
	customMessage: string,
) {
	const sections = [renderHeading(result)];

	if (customMessage) {
		sections.push(customMessage);
	}

	if (result.signals.length > 0) {
		sections.push(renderSignalsTable(result.signals));
	}

	return sections.join("\n\n");
}
