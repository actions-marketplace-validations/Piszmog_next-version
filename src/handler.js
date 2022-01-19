const core = require('@actions/core');
const fs = require('fs');
const util = require('./util');

const pomRegex = '<version>([0-9.]+)</version>';
const gradleRegex = 'version=([0-9.]+)';

/**
 * Handler for the files to be updated.
 */
class Handler {
    /**
     * Creates a new instance of the handler.
     * @param client The client to use for the update.
     * @param mainBranch The main branch to use for the update.
     * @param versionToIncrement The version to increment.
     */
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
            switch (util.getFileExtension(path.toLowerCase())) {
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
            if (err instanceof util.InvalidVersionError || err instanceof VersionNotFoundError) {
                core.setFailed(err.message);
                return;
            } else if (err instanceof util.VersionAlreadyIncrementedError) {
                core.info(err.message);
                return;
            } else if (err instanceof MainFileDoesNotExistError) {
                core.warning(err.message);
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
        let currentVersion = json.version;
        // determine if the version has already been incremented
        const mainContent = await this.getMainContent(path);
        const mainVersion = JSON.parse(mainContent).version;
        json.version = util.getNextVersion(mainVersion, currentVersion, this.versionToIncrement);
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
        const nextVersion = util.getNextVersion(mainVersion, currentVersion, this.versionToIncrement);
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
        const nextVersion = util.getNextVersion(mainVersion, currentVersion, this.versionToIncrement);
        return content.replace(`version=${currentVersion}`, `version=${nextVersion}`);
    }

    /**
     * Retrieves the content of the main branch.
     * @param path The path to the file.
     * @returns {Promise<string>} The content of the file.
     */
    async getMainContent(path) {
        let mainContent;
        try {
            mainContent = await this.client.getContent(path, this.mainBranch);
        } catch (e) {
            if (e.status === 404) {
                throw new MainFileDoesNotExistError(`Main branch file ${path} does not exist.`);
            }
            throw e;
        }
        return util.decode(mainContent.content);
    }
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
 * Error when the main file does not exist.
 */
class MainFileDoesNotExistError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MainFileDoesNotExistError';
    }
}

module.exports = Handler
