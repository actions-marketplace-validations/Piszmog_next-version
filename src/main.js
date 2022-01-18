const core = require('@actions/core');
const github = require('@actions/github');
const Client = require('./client');
const Handler = require('./handler');
const util = require('./util');

/**
 * Main entry point for the action.
 * @returns {Promise<void>}
 */
const run = async () => {
    const context = github.context;
    const token = core.getInput('GITHUB_TOKEN');
    const octokit = github.getOctokit(token);
    const branch = context.payload.pull_request.head.ref;
    const mainBranch = context.payload.pull_request.base.ref;

    const client = new Client(octokit, context);

    // determine what version we are going to increment based on the label on the PR
    const pullRequest = await client.getPullRequest(83);
    const versionToIncrement = util.getVersionToIncrement(pullRequest.labels);

    const handler = new Handler(client, mainBranch, versionToIncrement);

    // update all the files
    const paths = core.getInput('files').split(',');
    for (const p of paths) {
        if (p) {
            await handler.handle(p, branch);
        }
    }
};

run();

module.exports = run;
