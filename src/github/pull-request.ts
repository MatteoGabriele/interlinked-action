import { githubRequest, warnOnFailedResponse } from "../utils/github-api";

function patchPullRequest(repo: string, pullNumber: number, changes: object) {
	return githubRequest(`/repos/${repo}/pulls/${pullNumber}`, {
		method: "PATCH",
		body: JSON.stringify(changes),
	});
}

export async function updatePullRequestBody(
	repo: string,
	pullNumber: number,
	body: string,
) {
	const response = await patchPullRequest(repo, pullNumber, { body });
	await warnOnFailedResponse(response, "Couldn't update the PR description");
}

export async function closePullRequest(repo: string, pullNumber: number) {
	const response = await patchPullRequest(repo, pullNumber, {
		state: "closed",
	});
	await warnOnFailedResponse(response, "Couldn't close the PR");
}
