export interface PullRequest {
	number: number;
	body: string | null;
	base: {
		sha: string;
	};
	user: {
		login: string;
	};
	author_association?: string;
}

export interface PullRequestEvent {
	pull_request?: PullRequest;
	repository: {
		full_name: string;
	};
}
