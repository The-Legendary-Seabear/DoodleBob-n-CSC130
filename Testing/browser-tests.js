const resultsElement = document.getElementById('results');
const summaryElement = document.getElementById('summary');

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function loadPage(pagePath) {
    return new Promise((resolve, reject) => {
        const frame = document.createElement('iframe');
        frame.src = `../${pagePath}`;
        frame.onload = () => resolve(frame);
        frame.onerror = () => reject(new Error(`Could not load ${pagePath}`));
        document.body.appendChild(frame);
    });
}

function waitFor(condition, timeout = 2000) {
    const start = Date.now();

    return new Promise((resolve, reject) => {
        function check() {
            if (condition()) {
                resolve();
                return;
            }
            if (Date.now() - start >= timeout) {
                reject(new Error('Timed out waiting for the page to update.'));
                return;
            }
            setTimeout(check, 25);
        }
        check();
    });
}

async function testAddSongValidation() {
    const frame = await loadPage('Functionality/Adding Songs/AddSong.html');
    const form = frame.contentDocument.getElementById('addSongForm');

    form.dispatchEvent(new Event('submit', { cancelable: true }));

    assert(frame.contentDocument.getElementById('songNameError').textContent === 'Song Name is required.', 'Name error was not shown.');
    assert(frame.contentDocument.getElementById('songFileError').textContent === 'Song File is required.', 'File error was not shown.');
}

async function testRemoveSongList() {
    localStorage.setItem('librarySongs', JSON.stringify([
        { name: 'Ocean Drive', location: 'ocean-drive.mp3' },
        { name: 'Nightcall', location: 'nightcall.mp3' }
    ]));
    const frame = await loadPage('Functionality/Removing Songs/RemoveSong.html');
    const options = [...frame.contentDocument.querySelectorAll('#songName option')];

    assert(options.length === 2, 'The stored songs were not loaded into the remove list.');
    assert(options[0].textContent === 'Ocean Drive (ocean-drive.mp3)', 'The first song option is incorrect.');
    assert(options[1].value === 'Nightcall', 'The second song option is incorrect.');
}

async function testRemoveSong() {
    const frame = document.querySelectorAll('iframe')[1];
    const select = frame.contentDocument.getElementById('songName');
    select.value = 'Ocean Drive';
    frame.contentDocument.getElementById('removeSongForm').dispatchEvent(new Event('submit', { cancelable: true }));

    const songs = JSON.parse(localStorage.getItem('librarySongs'));
    assert(songs.length === 1 && songs[0].name === 'Nightcall', 'The selected song was not removed.');
}

async function testPlaylistPage() {
    const frame = await loadPage('Playlists/Playlists.html');
    await waitFor(() => frame.contentDocument.querySelectorAll('#playlistList li').length === 1);

    const playlist = frame.contentDocument.querySelector('#playlistList li');
    playlist.click();
    const songs = [...frame.contentDocument.querySelectorAll('#songList li')].map(song => song.textContent);

    assert(playlist.textContent === 'Test Playlist', 'The playlist name is incorrect.');
    assert(songs.join('|') === 'Song A|Song B|Song C', 'The playlist songs were not rendered.');
}

async function runTest(name, testFunction) {
    const result = document.createElement('li');
    result.textContent = name;
    try {
        await testFunction();
        result.className = 'pass';
        result.textContent += ' - PASS';
        return true;
    } catch (error) {
        result.className = 'fail';
        result.innerHTML += ` - FAIL<div class="error">${error.message}</div>`;
        return false;
    } finally {
        resultsElement.appendChild(result);
    }
}

(async function runAllTests() {
    localStorage.removeItem('librarySongs');
    const tests = [
        ['Add Song validation', testAddSongValidation],
        ['Remove Song list', testRemoveSongList],
        ['Remove Song behavior', testRemoveSong],
        ['Playlist loading and selection', testPlaylistPage]
    ];
    let passed = 0;

    for (const [name, testFunction] of tests) {
        if (await runTest(name, testFunction)) {
            passed += 1;
        }
    }

    summaryElement.textContent = `${passed}/${tests.length} tests passed`;
    summaryElement.style.color = passed === tests.length ? '#218739' : '#c62828';
})();
