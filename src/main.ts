import * as core from "@actions/core";
import { GitHub } from "@actions/github";
import {
  PullRequest,
  approvePullRequest,
  getGithubClient,
  getPullRequest,
  getPullRequestCommits
} from "./github";
import { CommitFiles, getCommitFiles, MutableSet } from "./utils";
import { configure, settings } from "./settings";

const checkPullRequest = async (
  client: GitHub,
  pullRequest: PullRequest
): Promise<[boolean, string]> => {
  const pullRequestFiles: CommitFiles = await getPullRequestFiles(
    client,
    pullRequest
  );

  if (await checkRevertPullRequest(pullRequest)) {
    return [true, "Approved for revert pull request"];
  }

  if (await checkConfigChanges(pullRequestFiles)) {
    return [false, "Auto-approve config changed"];
  }

  if (await checkAllowedAuthors(pullRequest)) {
    return [true, "Approved for login"];
  }

  if (await checkAllowedFiles(pullRequestFiles)) {
    return [true, "Approved for files"];
  }

  return [false, "Skip auto-approve"];
};

const getPullRequestFiles = async (
  client: GitHub,
  pullRequest: PullRequest
): Promise<CommitFiles> => {
  const commits = await getPullRequestCommits(client, pullRequest);

  return getCommitFiles(commits);
};

const checkRevertPullRequest = async (
  pullRequest: PullRequest
): Promise<boolean> => {
  return pullRequest.title && pullRequest.title.startsWith("Revert");
};

const checkConfigChanges = async (
  pullRequestFiles: CommitFiles
): Promise<boolean> => {
  return (
    pullRequestFiles.modified.has(settings["config-path"]) ||
    pullRequestFiles.added.has(settings["config-path"]) ||
    pullRequestFiles.removed.has(settings["config-path"]) ||
    pullRequestFiles.renamed[settings["config-path"]] !== undefined
  );
};

const checkAllowedAuthors = async (
  pullRequest: PullRequest
): Promise<boolean> => {
  const allowedAuthors = settings["allowed-authors"] || [];

  for (const allowedAuthor of allowedAuthors) {
    if (pullRequest.user.login === allowedAuthor) {
      return true;
    }
  }

  return false;
};

const checkAllowedFiles = async (
  pullRequestFiles: CommitFiles
): Promise<boolean> => {
  for (const fileType in pullRequestFiles) {
    if (!pullRequestFiles.hasOwnProperty(fileType)) {
      continue;
    }

    if (fileType === "renamed") {
      if (Object.keys(pullRequestFiles[fileType]).length !== 0) {
        return false;
      }
    } else if (fileType !== "modified") {
      if (pullRequestFiles[fileType].size !== 0) {
        return false;
      }
    }
  }

  const allAllowedFiles = settings["allowed-files"] || [];
  const allAllowedFilesSets = new Array<MutableSet<string>>();
  const allowedFilesSetMap = new Map<string, MutableSet<string>>();

  for (const allowedFiles of allAllowedFiles) {
    const allowedFilesSet = new MutableSet<string>(allowedFiles);

    allAllowedFilesSets.push(allowedFilesSet);

    for (const allowedFile of allowedFiles) {
      allowedFilesSetMap.set(allowedFile, allowedFilesSet);
    }
  }

  for (const modifiedFile of pullRequestFiles.modified) {
    const allowedFilesSet = allowedFilesSetMap.get(modifiedFile);

    if (allowedFilesSet === undefined) {
      return false;
    }

    allowedFilesSet.delete(modifiedFile);
  }

  for (const allowedFilesSet of allAllowedFilesSets) {
    if (!allowedFilesSet.isEmpty() && allowedFilesSet.hasChanged()) {
      return false;
    }
  }

  return true;
};

const run = async (): Promise<void> => {
  await configure();

  const client = await getGithubClient();
  const pullRequest = await getPullRequest();

  const [needApprove, reason] = await checkPullRequest(client, pullRequest);

  if (needApprove) {
    await approvePullRequest(client, pullRequest, reason);
  } else {
    console.log(reason);
  }
};

run().catch(error => core.setFailed(error));
