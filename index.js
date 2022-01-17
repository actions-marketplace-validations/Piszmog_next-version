const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

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
    const versionToIncrement = getVersionToIncrement(pullRequest.labels);

    const handler = new Handler(client, mainBranch, versionToIncrement);

    // update all the files
    const paths = core.getInput('files').split(',');
    for (const p of paths) {
        if (p) {
            await handler.handle(p, branch);
        }
    }
};

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
            content: encode(content),
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

/**
 * Gets the version to increment based on the labels on the PR.
 * @param labels The labels on the PR.
 * @returns {string} The version to increment.
 */
const getVersionToIncrement = (labels) => {
    let versionToIncrement = 'patch';
    for (const label of labels) {
        if (label.name === 'version:major') {
            versionToIncrement = 'major';
        } else if (label.name === 'version:minor') {
            versionToIncrement = 'minor';
        }
    }
    return versionToIncrement;
}

const pomRegex = '<version>([0-9.]+)</version>';
const gradleRegex = 'version=([0-9.]+)';

/**
 * Handler for the files to be updated.
 */
class Handler {
    constructor(client, mainBranch, versionToIncrement) {
        this.client = client;
        this.mainBranch = mainBranch;
        this.versionToIncrement = versionToIncrement;
    }

    /**
     * Handle the file.
     * @param path The path to the file.
     * @param branch The branch to commit to.
     * @returns {Promise<void>}
     */
    async handle(path, branch) {
        // ensure the file we have been told to update actually exists
        // we are assuming that the source code of the branch has been checked out here
        if (!fs.existsSync(path)) {
            core.setFailed(`File ${path} does not exist.`);
            return;
        }
        // get the file from the main branch
        let content = fs.readFileSync(path, 'utf8');
        try {
            switch (getFileExtension(path.toLowerCase())) {
                case 'json':
                    content = await this.handlePackageJSON(path, content);
                    break;
                case 'xml':
                    content = await this.handlePOM(path, content);
                    break;
                case 'gradle':
                    content = await this.handleGradle(path, content);
                    break;
                default:
                    core.warning(`Unsupported file: ${path}`);
            }
        } catch (err) {
            if (err instanceof InvalidVersionError || err instanceof VersionNotFoundError) {
                core.setFailed(err.message);
                return;
            } else if (err instanceof VersionAlreadyIncrementedError) {
                core.info(err.message);
                return;
            } else {
                throw err;
            }
        }
        if (content) {
            fs.writeFileSync(path, content, 'utf8');
            await this.client.commitFile(path, content, `Bump version to ${this.versionToIncrement}`, branch);
        }
    }

    /**
     * Handle the package.json file.
     * @param path The path to the file.
     * @param content The content of the file.
     * @returns {Promise<string>} The new content of the file.
     */
    async handlePackageJSON(path, content) {
        const json = JSON.parse(content);
        const currentVersion = json.version;
        // determine if the version has already been incremented
        const mainContent = await this.getMainContent(path);
        const mainVersion = JSON.parse(mainContent).version;
        // if they are different, then bail out
        if (mainVersion !== currentVersion) {
            throw new VersionAlreadyIncrementedError(`Version in ${path} has already been incremented.`);
        }
        // else increment the version
        const nextVersion = getNextVersion(currentVersion, this.versionToIncrement);
        core.info(`Incrementing Package JSON version from ${currentVersion} to ${nextVersion}`);
        json.version = nextVersion;
        return JSON.stringify(json, null, 2);
    }

    /**
     * Handle the POM file.
     * @param path The path to the file.
     * @param content The content of the file.
     * @returns {Promise<*>} The new content of the file.
     */
    async handlePOM(path, content) {
        // TODO get the version in a more robust way
        const matches = content.match(pomRegex);
        if (matches.length !== 2) {
            throw new VersionNotFoundError(`Unable to find version in POM for file ${path}`);
        }
        const currentVersion = matches[1];
        // determine if the version has already been incremented
        const mainContent = await this.getMainContent(path);
        const mainMatches = mainContent.match(pomRegex);
        if (mainMatches.length !== 2) {
            throw new VersionNotFoundError(`Unable to find version in POM on main branch for file ${path}`);
        }
        const mainVersion = mainMatches[1];
        // if they are different, then bail out
        if (mainVersion !== currentVersion) {
            throw new VersionAlreadyIncrementedError(`Version in ${path} has already been incremented.`);
        }
        const nextVersion = getNextVersion(currentVersion, this.versionToIncrement);
        core.info(`Incrementing POM version from ${currentVersion} to ${nextVersion}`);
        return content.replace(`<version>${currentVersion}</version>`, `<version>${nextVersion}</version>`);
    }

    /**
     * Handle the Gradle file.
     * @param path The path to the file.
     * @param content The content of the file.
     * @returns {Promise<*>} The new content of the file.
     */
    async handleGradle(path, content) {
        // TODO get the version in a more robust way
        const matches = content.match(gradleRegex);
        if (matches.length !== 2) {
            throw new VersionNotFoundError(`Unable to find version in Gradle for file ${path}`);
        }
        const currentVersion = matches[1];
        // determine if the version has already been incremented
        const mainContent = await this.getMainContent(path);
        const mainMatches = mainContent.match(pomRegex);
        if (mainMatches.length !== 2) {
            throw new VersionNotFoundError(`Unable to find version in Gradle on main branch for file ${path}`);
        }
        const mainVersion = mainMatches[1];
        // if they are different, then bail out
        if (mainVersion !== currentVersion) {
            throw new VersionAlreadyIncrementedError(`Version in ${path} has already been incremented.`);
        }
        const nextVersion = getNextVersion(currentVersion, this.versionToIncrement);
        core.info(`Incrementing Gradle version from ${currentVersion} to ${nextVersion}`);
        return content.replace(`version=${currentVersion}`, `version=${nextVersion}`);
    }

    /**
     * Retrieves the content of the main branch.
     * @param path The path to the file.
     * @returns {Promise<string>} The content of the file.
     */
    async getMainContent(path) {
        const mainContent = await this.client.getContent(path, this.mainBranch);
        return decode(mainContent.content);
    }
}

/**
 * Gets the next version based on the current version and the version increment.
 * @param currentVersion The current version.
 * @param versionToIncrement The version increment.
 * @returns {`${number}.${number}.${number}`} The next version.
 */
const getNextVersion = (currentVersion, versionToIncrement) => {
    const version = currentVersion.split('.');
    if (version.length !== 3) {
        throw new InvalidVersionError(`Version does not follow semantic versioning of major.minor.patch: ${currentVersion}`);
    }
    let major = parseInt(version[0]);
    let minor = parseInt(version[1]);
    let patch = parseInt(version[2]);
    switch (versionToIncrement) {
        case 'major':
            major++;
            minor = 0;
            patch = 0;
            break;
        case 'minor':
            minor++;
            patch = 0;
            break;
        case 'patch':
        default:
            patch++;
            break;
    }
    return `${major}.${minor}.${patch}`;
};

/**
 * Gets the extension of the file.
 * @param path The path to the file.
 * @returns {string} The extension of the file.
 */
const getFileExtension = (path) => {
    return path.split('.').pop();
}

/**
 * Base64 decodes the content.
 * @param s The content to encode.
 * @returns {string} The encoded content.
 */
const encode = (s) => {
    return Buffer.from(s).toString('base64');
}

/**
 * Base64 decodes the content.
 * @param s The content to decode.
 * @returns {string} The decoded content.
 */
const decode = (s) => {
    return Buffer.from(s, 'base64').toString('utf-8');
}

/**
 * Thrown when the version is not found.
 */
class VersionNotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'VersionNotFoundError';
    }
}

/**
 * Thrown when the version in not in the semantic versioning format.
 */
class InvalidVersionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InvalidVersionError';
    }
}

/**
 * Thrown when the version has already been incremented.
 */
class VersionAlreadyIncrementedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'VersionAlreadyIncrementedError';
    }
}

run();
