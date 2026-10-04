import { githubRequest, warnOnFailedResponse } from "../utils/github-api";

export async function syncAgentLabel(
	repo: string,
	pullNumber: number,
	label: string,
	isAgentWritten: boolean,
) {
	const labelsPath = `/repos/${repo}/issues/${pullNumber}/labels`;

	const response = isAgentWritten
		? await githubRequest(labelsPath, {
				method: "POST",
				body: JSON.stringify({ labels: [label] }),
			})
		: await githubRequest(`${labelsPath}/${encodeURIComponent(label)}`, {
				method: "DELETE",
			});

	await warnOnFailedResponse(response, `Couldn't update label "${label}"`, {
		ignoreNotFound: true,
	});
}
