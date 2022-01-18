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

module.exports = {
    getVersionToIncrement,
    getNextVersion,
    getFileExtension,
    encode,
    decode,
    VersionNotFoundError,
    InvalidVersionError,
    VersionAlreadyIncrementedError,
};
