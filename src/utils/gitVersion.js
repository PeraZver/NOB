const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

function resolveVersionFilePath() {
    return path.resolve(__dirname, '../../public/version.json');
}

function resolveRepoRoot() {
    const candidates = [
        path.resolve(__dirname, '../..'),
        process.cwd()
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(path.join(candidate, '.git'))) {
            return candidate;
        }
    }

    return candidates[0];
}

function getGitTag() {
    if (process.env.GIT_TAG && process.env.GIT_TAG.trim()) {
        return process.env.GIT_TAG.trim();
    }

    const repoRoot = resolveRepoRoot();

    try {
        const tag = childProcess.execSync('git describe --tags --abbrev=0', {
            cwd: repoRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe']
        }).trim();

        return tag || null;
    } catch (error) {
        return null;
    }
}

function getGitCommit() {
    if (process.env.GIT_COMMIT && process.env.GIT_COMMIT.trim()) {
        return process.env.GIT_COMMIT.trim();
    }

    const repoRoot = resolveRepoRoot();

    try {
        const commit = childProcess.execSync('git rev-parse --short HEAD', {
            cwd: repoRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe']
        }).trim();

        return commit || 'unknown';
    } catch (error) {
        return 'unknown';
    }
}

function getGitVersionInfo() {
    return getGitTag() || getGitCommit();
}

function writeVersionFile() {
    const version = getGitVersionInfo();
    const versionFilePath = resolveVersionFilePath();
    const publicDir = path.dirname(versionFilePath);

    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    fs.writeFileSync(versionFilePath, JSON.stringify({ version }, null, 2) + '\n');
    return version;
}

module.exports = {
    getGitTag,
    getGitCommit,
    getGitVersionInfo,
    resolveRepoRoot,
    resolveVersionFilePath,
    writeVersionFile
};
