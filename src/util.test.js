const util = require('./util');

describe('determine version to increment', () => {
    it('should be major', () => {
        expect(util.getVersionToIncrement([{name: 'version:major'}])).toBe('major');
    });

    it('should be minor', () => {
        expect(util.getVersionToIncrement([{name: 'version:minor'}])).toBe('minor');
    });

    it('should be patch', () => {
        expect(util.getVersionToIncrement([{name: 'version:patch'}])).toBe('patch');
    });

    it('should default', () => {
        expect(util.getVersionToIncrement([{name: ''}])).toBe('patch');
    });
});

describe('get next version', () => {
    it('should increment major', () => {
        expect(util.getNextVersion('1.2.3', 'major')).toBe('2.0.0');
    });

    it('should increment minor', () => {
        expect(util.getNextVersion('1.2.3', 'minor')).toBe('1.3.0');
    });

    it('should increment patch', () => {
        expect(util.getNextVersion('1.2.3', 'patch')).toBe('1.2.4');
    });

    it('should throw error', () => {
        expect(() => {
            util.getNextVersion('1.2', 'patch');
        }).toThrowError('Version does not follow semantic versioning of major.minor.patch: 1.2');
    });
});

describe('get file extension', () => {
    it('should be json', () => {
        expect(util.getFileExtension('package.json')).toBe('json');
    });

    it('should be xml', () => {
        expect(util.getFileExtension('pom.xml')).toBe('xml');
    });

    it('should be gradle', () => {
        expect(util.getFileExtension('build.gradle')).toBe('gradle');
    });
});

test('encode string', () => {
    expect(util.encode('foo')).toBe('Zm9v');
    expect(util.encode('foo bar')).toBe('Zm9vIGJhcg==');
    expect(util.encode('foo bar baz')).toBe('Zm9vIGJhciBiYXo=');
})

test('decode string', () => {
    expect(util.decode('Zm9v')).toBe('foo');
    expect(util.decode('Zm9vIGJhcg==')).toBe('foo bar');
    expect(util.decode('Zm9vIGJhciBiYXo=')).toBe('foo bar baz');
})
