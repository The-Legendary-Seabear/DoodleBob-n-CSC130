const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '..');

function createStorage() {
    const values = new Map();

    return {
        getItem(key) {
            return values.has(key) ? values.get(key) : null;
        },
        setItem(key, value) {
            values.set(key, String(value));
        },
        removeItem(key) {
            values.delete(key);
        }
    };
}

function loadScript(relativePath, globals, exportNames) {
    const sourcePath = path.join(projectRoot, relativePath);
    const source = fs.readFileSync(sourcePath, 'utf8');
    const context = {
        console,
        JSON,
        Map,
        Set,
        FormData: class {},
        ...globals
    };

    const exportStatement = `this.__testExports = { ${exportNames.join(', ')} };`;
    vm.runInNewContext(`${source}\n${exportStatement}`, context, { filename: sourcePath });
    return context.__testExports;
}

function createDocument(elements = {}) {
    return {
        addEventListener() {},
        getElementById(id) {
            return elements[id] || null;
        },
        createElement(tagName) {
            return {
                tagName,
                value: '',
                textContent: '',
                addEventListener(eventName, handler) {
                    this[`${eventName}Handler`] = handler;
                }
            };
        }
    };
}

test('adding a song from a file stores a playable data URL', async () => {
    const storage = createStorage();
    const form = {
        addEventListener(eventName, handler) { this[eventName] = handler; },
        submit(event) {
            return this.submitHandler ? this.submitHandler(event) : undefined;
        }
    };
    const songFileInput = {
        files: [{ name: 'demo.mp3' }],
        value: 'C:\\fakepath\\demo.mp3'
    };
    const document = createDocument({
        addSongForm: form,
        songName: { value: 'Demo Song' },
        songFile: songFileInput,
        songNameError: { textContent: '' },
        songFileError: { textContent: '' }
    });

    class MockFileReader {
        constructor() {
            this.result = 'data:audio/mpeg;base64,AAAA';
        }
        readAsDataURL(file) {
            this.file = file;
            this.onload && this.onload();
        }
    }

    const { Library } = loadScript('Functionality/Adding Songs/AddSong.js', {
        localStorage: storage,
        document,
        FileReader: MockFileReader,
        window: { location: { href: '' } }
    }, ['Library']);

    await form.submit({ preventDefault() {} });

    const savedSongs = JSON.parse(storage.getItem('librarySongs'));
    assert.equal(savedSongs[0].name, 'Demo Song');
    assert.match(savedSongs[0].location, /^data:audio\//);
});

test('Song stores its name and file location', () => {
    const storage = createStorage();
    const { Song } = loadScript('Functionality/Adding Songs/AddSong.js', {
        localStorage: storage,
        document: createDocument()
    }, ['Song']);

    assert.deepEqual(new Song('Ocean Drive', 'ocean-drive.mp3'), {
        name: 'Ocean Drive',
        location: 'ocean-drive.mp3'
    });
});

test('Library.addSong persists a new song', () => {
    const storage = createStorage();
    const { Song, Library } = loadScript('Functionality/Adding Songs/AddSong.js', {
        localStorage: storage,
        document: createDocument()
    }, ['Song', 'Library']);

    Library.addSong(new Song('Ocean Drive', 'ocean-drive.mp3'));

    assert.deepEqual(JSON.parse(storage.getItem('librarySongs')), [
        { name: 'Ocean Drive', location: 'ocean-drive.mp3' }
    ]);
});

test('Library.loadSongs uses an empty library when nothing is stored', () => {
    const storage = createStorage();
    const { Library } = loadScript('Functionality/Adding Songs/AddSong.js', {
        localStorage: storage,
        document: createDocument()
    }, ['Library']);

    Library.loadSongs();

    assert.deepEqual(Library.Songs, []);
});

test('Library.removeSong removes names case-insensitively and persists the result', () => {
    const storage = createStorage();
    storage.setItem('librarySongs', JSON.stringify([
        { name: 'Ocean Drive', location: 'ocean-drive.mp3' },
        { name: 'Nightcall', location: 'nightcall.mp3' }
    ]));
    const { Library } = loadScript('Functionality/Removing Songs/RemoveSong.js', {
        localStorage: storage,
        document: createDocument()
    }, ['Library']);

    assert.equal(Library.removeSong('oCeAn DrIvE'), true);
    assert.deepEqual(JSON.parse(storage.getItem('librarySongs')), [
        { name: 'Nightcall', location: 'nightcall.mp3' }
    ]);
});

test('Library.removeSong reports a missing song without changing the library', () => {
    const storage = createStorage();
    const songs = [{ name: 'Nightcall', location: 'nightcall.mp3' }];
    storage.setItem('librarySongs', JSON.stringify(songs));
    const { Library } = loadScript('Functionality/Removing Songs/RemoveSong.js', {
        localStorage: storage,
        document: createDocument()
    }, ['Library']);

    assert.equal(Library.removeSong('Unknown Song'), false);
    assert.deepEqual(JSON.parse(storage.getItem('librarySongs')), songs);
});

test('populateSongList renders a placeholder for an empty library', () => {
    const storage = createStorage();
    const { populateSongList } = loadScript('Functionality/Removing Songs/RemoveSong.js', {
        localStorage: storage,
        document: createDocument()
    }, ['populateSongList']);
    const select = {
        innerHTML: 'old option',
        options: [],
        appendChild(option) {
            this.options.push(option);
        }
    };

    populateSongList(select);

    assert.equal(select.innerHTML, '');
    assert.equal(select.options.length, 1);
    assert.equal(select.options[0].value, '');
    assert.equal(select.options[0].textContent, 'No songs available');
});

test('playlist loading uses the stored playlist data and renders playlist names', async () => {
    const playlistList = {
        innerHTML: 'old content',
        children: [],
        appendChild(item) {
            this.children.push(item);
        }
    };
    const songList = { innerHTML: '', children: [], appendChild(item) { this.children.push(item); } };
    const selectedPlaylistName = { textContent: '' };
    let requestedPath = '';
    const playlistResponse = {
        playlists: [{ name: 'Focus', songs: ['Intro', 'Main Theme'] }]
    };
    const document = createDocument({ playlistList, songList, selectedPlaylistName });
    const { loadPlaylists } = loadScript('Playlists/Playlists.js', {
        document,
        fetch: async pathName => {
            requestedPath = pathName;
            return { json: async () => playlistResponse };
        }
    }, ['loadPlaylists']);

    await loadPlaylists();

    assert.equal(requestedPath, 'PlaylistStorage.json');
    assert.equal(playlistList.children.length, 1);
    assert.equal(playlistList.children[0].textContent, 'Focus');
    assert.equal(typeof playlistList.children[0].clickHandler, 'function');
});

test('selecting a playlist renders its songs', async () => {
    const playlistList = { innerHTML: '', appendChild() {} };
    const songList = { innerHTML: '', children: [], appendChild(item) { this.children.push(item); } };
    const selectedPlaylistName = { textContent: '' };
    const document = createDocument({ playlistList, songList, selectedPlaylistName });
    const { loadPlaylists, displaySongs } = loadScript('Playlists/Playlists.js', {
        document,
        fetch: async () => ({ json: async () => ({ playlists: [{ name: 'Focus', songs: ['Intro', 'Main Theme'] }] }) })
    }, ['loadPlaylists', 'displaySongs']);

    await loadPlaylists();
    displaySongs(0);

    assert.equal(selectedPlaylistName.textContent, 'Focus');
    assert.deepEqual(songList.children.map(song => song.textContent), ['Intro', 'Main Theme']);
});
