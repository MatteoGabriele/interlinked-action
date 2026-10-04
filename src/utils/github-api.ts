import { readInput } from "./inputs";
import { logWarning } from "./workflow";

export function githubRequest(path: string, init: RequestInit = {}) {
	const baseUrl = process.env.GITHUB_API_URL ?? "https://api.github.com";
	const token = readInput("github-token");

	return fetch(`${baseUrl}${path}`, {
		...init,
		headers: {
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...init.headers,
		},
	});
}

export async function warnOnFailedResponse(
	response: Response,
	failureMessage: string,
) {
	if (response.ok) {
		return;
	}

	logWarning(`${failureMessage}: ${response.status} ${await response.text()}`);
}
