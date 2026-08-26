(function () {
    const results = document.getElementById('results');
    const summary = document.getElementById('summary');
    const addForm = document.getElementById('addSongForm');
    const addName = document.getElementById('songName');
    const addFile = document.getElementById('songFile');
    let removeSelect;
    let removeError;

    function assert(condition, message) {
        if (!condition) throw new Error(message);
    }

    function resetStorage() {
        localStorage.removeItem('librarySongs');
        AddSongLibrary.Songs = [];
        RemoveSongLibrary.Songs = [];
    }

    function addRemoveForm() {
        addForm.remove();
        document.body.insertAdjacentHTML('beforeend', '<form id="removeSongForm"><select id="songName" name="songName"></select><span id="songNameError"></span></form>');
        removeSelect = document.querySelector('#removeSongForm select');
        removeError = document.querySelector('#removeSongForm span');
        document.dispatchEvent(new Event('DOMContentLoaded'));
    }

    function test(name, callback) {
        try {
            callback();
            results.insertAdjacentHTML('beforeend', `<li class="pass">PASS: ${name}</li>`);
            return true;
        } catch (error) {
            results.insertAdjacentHTML('beforeend', `<li class="fail">FAIL: ${name} - ${error.message}</li>`);
            return false;
        }
    }

    async function runTests() {
        results.replaceChildren();
        resetStorage();
        let passed = 0;
        let total = 0;
        const run = (name, callback) => {
            total += 1;
            if (test(name, callback)) passed += 1;
        };

        run('creates and saves a song', () => {
            const song = new AddSong('First Song', 'first.mp3');
            AddSongLibrary.addSong(song);
            assert(JSON.parse(localStorage.getItem('librarySongs'))[0].name === 'First Song', 'song was not saved');
        });

        run('rejects an empty song name', () => {
            addName.value = ' ';
            addFile.value = 'first.mp3';
            addForm.dispatchEvent(new Event('submit', { cancelable: true }));
            assert(document.getElementById('songNameError').textContent === 'Song Name is required.', 'name error was not shown');
        });

        run('rejects a missing song file', () => {
            addName.value = 'Second Song';
            addFile.value = '';
            addForm.dispatchEvent(new Event('submit', { cancelable: true }));
            assert(document.getElementById('songFileError').textContent === 'Song File is required.', 'file error was not shown');
        });

        addRemoveForm();

        run('removes songs without regard to case', () => {
            localStorage.setItem('librarySongs', JSON.stringify([{ name: 'My Song', location: 'song.mp3' }]));
            assert(RemoveSongLibrary.removeSong('my song') === true, 'song was not removed');
            assert(JSON.parse(localStorage.getItem('librarySongs')).length === 0, 'removed song remains in storage');
        });

        run('reports when a song does not exist', () => {
            resetStorage();
            assert(RemoveSongLibrary.removeSong('Missing Song') === false, 'missing song should return false');
        });

        run('populates the remove-song list', () => {
            localStorage.setItem('librarySongs', JSON.stringify([{ name: 'My Song', location: 'song.mp3' }]));
            populateSongList(removeSelect);
            assert(removeSelect.options.length === 1, 'song option was not added');
            assert(removeSelect.options[0].textContent === 'My Song (song.mp3)', 'song option text is incorrect');
        });

        run('shows an error when no song is selected', () => {
            removeSelect.value = '';
            removeSelect.closest('form').dispatchEvent(new Event('submit', { cancelable: true }));
            assert(removeError.textContent === 'Please select a song to remove.', 'remove validation error was not shown');
        });

        await playlistTestApi.loadPlaylists();
        run('loads playlists from PlaylistStorage.json', () => {
            assert(document.querySelectorAll('#playlistList li').length > 0, 'playlist data was not loaded');
        });

        run('renders the selected playlist songs in order', () => {
            playlistTestApi.setPlaylistData({ playlists: [{ name: 'Favorites', songs: ['One', 'Two'] }] });
            playlistTestApi.displaySongs(0);
            assert(document.getElementById('selectedPlaylistName').textContent === 'Favorites', 'playlist name is incorrect');
            assert([...document.querySelectorAll('#songList li')].map(item => item.textContent).join(',') === 'One,Two', 'playlist songs are incorrect');
        });

        summary.textContent = `${passed}/${total} tests passed.`;
    }

    document.getElementById('runTests').addEventListener('click', runTests);
    runTests();
}());