import * as core from "@actions/core";
import * as github from "@actions/github";
import { GitHub } from "@actions/github";

export const getGithubToken = async (): Promise<string> => {
  return core.getInput("github-token", { required: true });
};

export const getGithubClient = async (): Promise<github.GitHub> => {
  const token = await getGithubToken();

  return new github.GitHub(token);
};

export interface PullRequest {
  [key: string]: any;
  number: number;
  html_url?: string;
  body?: string;
}

export const getPullRequest = async (): Promise<PullRequest> => {
  const { pull_request: pullRequest } = github.context.payload;

  if (!pullRequest) {
    throw new Error("Event payload missing `pull_request`");
  }

  return pullRequest;
};

export interface File {
  status: string;
  filename: string;
  previous_filename: string;
}

export interface Commit {
  files: File[];
}

export const getPullRequestCommits = async (
  client: github.GitHub,
  pullRequest: PullRequest
): Promise<Commit[]> => {
  const commits = await client.request(pullRequest.commits_url);
  const allCommits: Commit[] = [];

  for (const commit of commits.data) {
    const result = await client.request(commit.url);

    allCommits.push(result.data);
  }

  return allCommits;
};

export interface Repository {
  owner: string;
  repo: string;
}

export const getRepository = async (): Promise<Repository> => {
  return github.context.repo;
};

export const approvePullRequest = async (
  client: GitHub,
  pullRequest: PullRequest,
  reason: string
): Promise<void> => {
  const repository = await getRepository();

  core.debug(
    `Creating approving review for pull request #${pullRequest.number}`
  );
  await client.pulls.createReview({
    owner: repository.owner,
    repo: repository.repo,
    pull_number: pullRequest.number,
    event: "APPROVE",
    body: reason
  });
  core.debug(`Approved pull request #${pullRequest.number}`);
};
