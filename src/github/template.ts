import { githubRequest } from "../utils/github-api";

const TEMPLATE_LOOKUP_PATHS = [
	".github/pull_request_template.md",
	".github/PULL_REQUEST_TEMPLATE.md",
	"pull_request_template.md",
	"PULL_REQUEST_TEMPLATE.md",
	"docs/pull_request_template.md",
	"docs/PULL_REQUEST_TEMPLATE.md",
];

export async function fetchPullRequestTemplate(repo: string, ref: string) {
	for (const templatePath of TEMPLATE_LOOKUP_PATHS) {
		const response = await githubRequest(
			`/repos/${repo}/contents/${templatePath}?ref=${ref}`,
			{ headers: { Accept: "application/vnd.github.raw+json" } },
		);

		if (response.ok) {
			return response.text();
		}
	}

	return undefined;
}
