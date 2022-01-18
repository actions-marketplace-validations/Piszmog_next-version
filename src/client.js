const util = require("./util");

/**
 * Wrapper around the GitHub API.
 */
class Client {
    constructor(octokit, context) {
        this.octokit = octokit;
        this.owner = context.repo.owner;
        this.repo = context.repo.repo;
    }

    /**
     * Get the pull request.
     * @param number The pull request number.
     * @returns {Promise<*>} The pull request.
     */
    async getPullRequest(number) {
        const {data: pullRequest} = await this.octokit.rest.pulls.get({
            owner: this.owner,
            repo: this.repo,
            pull_number: number,
        });
        return pullRequest;
    }

    /**
     * Commit a file to the repository.
     * @param path The path to the file.
     * @param content The content of the file.
     * @param message The commit message.
     * @param branch The branch to commit to.
     * @returns {Promise<void>}
     */
    async commitFile(path, content, message, branch) {
        const sha = await this.getFileSHA(path, branch);
        await this.octokit.rest.repos.createOrUpdateFileContents({
            owner: this.owner,
            repo: this.repo,
            path,
            message,
            content: util.encode(content),
            sha,
            branch,
        });
    }

    /**
     * Get the SHA of a file.
     * @param path The path to the file.
     * @param branch The branch to get the SHA from.
     * @returns {Promise<*>} The SHA of the file.
     */
    async getFileSHA(path, branch) {
        const content = await this.getContent(path, branch);
        return content.sha;
    }

    /**
     * Get the content of a file.
     * @param path The path to the file.
     * @param branch The branch to get the content from.
     * @returns {Promise<*>} The content of the file.
     */
    async getContent(path, branch) {
        const {data: content} = await this.octokit.rest.repos.getContent({
            owner: this.owner,
            repo: this.repo,
            path,
            ref: branch,
        });
        return content;
    }
}

module.exports = Client;
