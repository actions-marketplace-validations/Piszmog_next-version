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
};

/**
 * Increments the version.
 * @param mainVersion The version on the main branch.
 * @param currentVersion The current version.
 * @param versionToIncrement The version to increment.
 * @returns {`${number}.${number}.${number}`} The next version.
 */
const getNextVersion = (mainVersion, currentVersion, versionToIncrement) => {
    if (mainVersion.split('.').length !== 3) {
        throw new InvalidVersionError(`Main version does not follow semantic versioning of major.minor.patch`);
    }
    if (currentVersion.split('.').length !== 3) {
        throw new InvalidVersionError(`Version does not follow semantic versioning of major.minor.patch`);
    }
    if (mainVersion !== currentVersion) {
        // is the main version "ahead" of the current version? Or has the current version been incremented correctly (label change)?
        if (isMainVersionAhead(mainVersion, currentVersion) || !isVersionBumpedCorrectly(mainVersion, currentVersion, versionToIncrement)) {
            currentVersion = mainVersion;
        } else {
            // nope, the version already has been incremented
            throw new VersionAlreadyIncrementedError(`Version has already been incremented.`);
        }
    }
    return incrementVersion(currentVersion, versionToIncrement);
};

/**
 * Determines if the main version is the same as the current version.
 * @param mainVersion The main version.
 * @param branchVersion The current version.
 * @returns {boolean} True if the main version is the ahead of the current version.
 */
const isMainVersionAhead = (mainVersion, branchVersion) => {
    const mainVersionParts = mainVersion.split('.');
    const branchVersionParts = branchVersion.split('.');
    const mainMajor = parseInt(mainVersionParts[0]);
    const mainMinor = parseInt(mainVersionParts[1]);
    const mainPatch = parseInt(mainVersionParts[2]);
    const branchMajor = parseInt(branchVersionParts[0]);
    const branchMinor = parseInt(branchVersionParts[1]);
    const branchPatch = parseInt(branchVersionParts[2]);
    if (mainMajor > branchMajor) {
        return true;
    } else if (mainMajor === branchMajor && mainMinor > branchMinor) {
        return true;
    } else if (mainMajor === branchMajor && mainMinor === branchMinor && mainPatch > branchPatch) {
        return true;
    }
    return false;
};

/**
 * Determines if the branch version has been incremented appropriately compared to the main version.
 * @param mainVersion The main version.
 * @param branchVersion The current version.
 * @param versionToIncrement The version to increment.
 */
const isVersionBumpedCorrectly = (mainVersion, branchVersion, versionToIncrement) => {
    const mainVersionParts = mainVersion.split('.');
    const branchVersionParts = branchVersion.split('.');
    const mainMajor = parseInt(mainVersionParts[0]);
    const mainMinor = parseInt(mainVersionParts[1]);
    const mainPatch = parseInt(mainVersionParts[2]);
    const branchMajor = parseInt(branchVersionParts[0]);
    const branchMinor = parseInt(branchVersionParts[1]);
    const branchPatch = parseInt(branchVersionParts[2]);
    if (versionToIncrement === 'major' && branchMajor - mainMajor !== 1) {
        return false;
    } else if (versionToIncrement === 'minor' && branchMinor - mainMinor !== 1) {
        return false;
    } else if (versionToIncrement === 'patch' && branchPatch - mainPatch !== 1) {
        return false;
    }
    return true;
};

/**
 * Increments the version.
 * @param currentVersion The current version.
 * @param versionToIncrement The version increment.
 * @returns {`${number}.${number}.${number}`} The next version.
 */
const incrementVersion = (currentVersion, versionToIncrement) => {
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
};

/**
 * Base64 decodes the content.
 * @param s The content to encode.
 * @returns {string} The encoded content.
 */
const encode = (s) => {
    return Buffer.from(s).toString('base64');
};

/**
 * Base64 decodes the content.
 * @param s The content to decode.
 * @returns {string} The decoded content.
 */
const decode = (s) => {
    return Buffer.from(s, 'base64').toString('utf-8');
};

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
    InvalidVersionError,
    VersionAlreadyIncrementedError
};
