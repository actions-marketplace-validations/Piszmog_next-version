const github = require('@actions/github');
const Client = require('./client');

jest.mock('@actions/github', () => {
    return {
        getOctokit: jest.fn().mockReturnValue({
            rest: {
                pulls: {
                    get: jest.fn().mockReturnValue({data: {number: 1}}),
                },
                repos: {
                    createOrUpdateFileContents: jest.fn(),
                    getContent: jest.fn().mockReturnValue({data: {sha: '123abc'}}),
                },
            },
        }),
    }
});

describe('calling github apis', () => {
    let octokit;
    let client;

    beforeEach(() => {
        jest.clearAllMocks();
        octokit = github.getOctokit('some-token');
        client = new Client(octokit, {repo: {owner: 'test', repo: 'test'}});
    });

    it('should get pull request', async () => {
        await client.getPullRequest(1);
        expect(octokit.rest.pulls.get).toHaveBeenCalledWith({
            owner: 'test',
            repo: 'test',
            pull_number: 1,
        });
    });

    it('should commit file', async () => {
        await client.commitFile('test.txt', 'test', 'test message', 'test-branch');
        expect(octokit.rest.repos.getContent).toHaveBeenCalledWith({
            owner: 'test',
            repo: 'test',
            path: 'test.txt',
            ref: 'test-branch',
        });
        expect(octokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
            owner: 'test',
            repo: 'test',
            path: 'test.txt',
            message: 'test message',
            content: 'dGVzdA==',
            sha: '123abc',
            branch: 'test-branch',
        });
    });

    it('should get file sha', async () => {
        await client.getFileSHA('test.txt', 'test-branch');
        expect(octokit.rest.repos.getContent).toHaveBeenCalledWith({
            owner: 'test',
            repo: 'test',
            path: 'test.txt',
            ref: 'test-branch',
        });
    });

    it('should get file content', async () => {
        await client.getContent('test.txt', 'test-branch');
        expect(octokit.rest.repos.getContent).toHaveBeenCalledWith({
            owner: 'test',
            repo: 'test',
            path: 'test.txt',
            ref: 'test-branch',
        });
    });
});
