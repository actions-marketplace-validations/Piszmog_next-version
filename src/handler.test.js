const core = require('@actions/core');
const fs = require('fs');
const Client = require('./client');
const Handler = require('./handler');
const util = require('./util');

jest
    .mock('@actions/core', () => {
        return {
            info: jest.fn(),
            setFailed: jest.fn(),
            warning: jest.fn(),
        };
    })
    .mock('fs', () => {
        return {
            existsSync: jest.fn(),
            readFileSync: jest.fn(),
            writeFileSync: jest.fn(),
        };
    })
    .mock('./client');

describe('determine version to increment', () => {
    let client;

    beforeEach(() => {
        jest.resetAllMocks();
        client = new Client({}, {});
    });

    it('should handle package.json', async () => {
        client.getContent.mockResolvedValue({
            content: util.encode('{"version": "0.0.0"}'),
        });

        const handler = new Handler(client, 'main', 'major');
        const newContent = await handler.handlePackageJSON('package.json', `{"version": "0.0.0"}`);
        expect(newContent).toBe(`{
  "version": "1.0.0"
}`);
    });

    it('should handle pom.xml', async () => {
        client.getContent.mockResolvedValue({
            content: util.encode('<project><version>0.0.0</version></project>'),
        });

        const handler = new Handler(client, 'main', 'major');
        const newContent = await handler.handlePOM('pom.xml', `<project><version>0.0.0</version></project>`);
        expect(newContent).toBe(`<project><version>1.0.0</version></project>`);
    });

    it('should handle build.gradle', async () => {
        client.getContent.mockResolvedValue({
            content: util.encode('version=0.0.0'),
        });

        const handler = new Handler(client, 'main', 'major');
        const newContent = await handler.handleGradle('build.gradle', `version=0.0.0`);
        expect(newContent).toBe(`version=1.0.0`);
    });

    it('should get main content', async () => {
        client.getContent.mockResolvedValue({
            content: 'aGVsbG8=',
        });

        const handler = new Handler(client, 'main', 'major');
        const content = await handler.getMainContent('package.json');
        expect(content).toBe('hello');
        expect(client.getContent).toHaveBeenCalledWith('package.json', 'main');
    });

    it('should throw error when main content could not be found', async () => {
        const error = new Error('error');
        error.status = 404;
        client.getContent.mockRejectedValue(error);

        const handler = new Handler(client, 'main', 'major');
        await expect(handler.getMainContent('package.json')).rejects.toThrow('Main branch file package.json does not exist.');
    });

    it('should throw error when main content has an error', async () => {
        client.getContent.mockRejectedValue(new Error('error'));

        const handler = new Handler(client, 'main', 'major');
        await expect(handler.getMainContent('package.json')).rejects.toThrow('error');
    });
});
