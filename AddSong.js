class Song
{
    // Song Name and File Location
    constructor(name, location)
    {
        this.name = name;
        this.location = location;
    }
}

class Library
{
    static Songs = [];

    static loadSongs()
    {
        const storedSongs = localStorage.getItem('librarySongs');
        this.Songs = storedSongs ? JSON.parse(storedSongs) : [];
    }

    static saveSongs()
    {
        localStorage.setItem('librarySongs', JSON.stringify(this.Songs));
    }

    static addSong(song)
    {
        this.loadSongs();
        this.Songs.push(song);
        this.saveSongs();
    }
}

function testConsole()
{
    console.log("Console Test Submit.");
}

// 1. Select the form element from the DOM
const form = document.getElementById('addSongForm');
// 2. Attach an event listener for the 'submit' action
if (form) {
    // Preview elements
    const fileInput = document.getElementById('songFile');
    const previewAudio = document.getElementById('preview-audio');
    const previewPlayBtn = document.getElementById('preview-play');
    const previewStopBtn = document.getElementById('preview-stop');
    const previewNameSpan = document.getElementById('preview-name');
    let previewURL = null;

    function resetPreview() {
        if (previewAudio) {
            previewAudio.pause();
            previewAudio.src = '';
        }
        if (previewURL) {
            URL.revokeObjectURL(previewURL);
            previewURL = null;
        }
        if (previewPlayBtn) previewPlayBtn.disabled = true;
        if (previewStopBtn) previewStopBtn.disabled = true;
        if (previewNameSpan) previewNameSpan.textContent = 'No file selected';
    }

    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            resetPreview();
            const f = fileInput.files && fileInput.files[0];
            if (!f) return;
            if (!f.type || !f.type.startsWith('audio')) {
                document.getElementById('songFileError').textContent = 'Selected file is not an audio file.';
                return;
            }
            document.getElementById('songFileError').textContent = '';
            previewURL = URL.createObjectURL(f);
            if (previewAudio) {
                previewAudio.src = previewURL;
            }
            if (previewNameSpan) previewNameSpan.textContent = f.name;
            if (previewPlayBtn) previewPlayBtn.disabled = false;
            if (previewStopBtn) previewStopBtn.disabled = false;
        });
    }

    // Playlist controls in AddSong
    const playlistSelect = document.getElementById('addsong-playlist-select');
    const addToPlaylistBtn = document.getElementById('addsong-add-to-playlist');
    const playlistNotice = document.getElementById('addsong-playlist-notice');

    function loadPlaylistsForAddSong() {
        if (!playlistSelect) return;
        playlistSelect.innerHTML = '';
        const raw = localStorage.getItem('playlists');
        let pls = [];
        try { pls = raw ? JSON.parse(raw) : []; } catch (e) { pls = []; }
        if (!Array.isArray(pls) || pls.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'No playlists saved';
            playlistSelect.appendChild(opt);
            if (addToPlaylistBtn) addToPlaylistBtn.disabled = true;
            return;
        }
        pls.forEach((pl, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = pl.name + ' (' + (pl.songs ? pl.songs.length : 0) + ' songs)';
            playlistSelect.appendChild(opt);
        });
        if (addToPlaylistBtn) addToPlaylistBtn.disabled = false;
    }

    async function addCurrentSongToSelectedPlaylist() {
        const songNameValue = document.getElementById('songName').value.trim();
        const songFileValue = document.getElementById('songFile').value;
        const fileObj = fileInput && fileInput.files && fileInput.files[0];
        const existingFileObj = fileInput && fileInput.files && fileInput.files[0];
        if (!songNameValue) {
            document.getElementById('songNameError').textContent = 'Song Name is required to add to a playlist.';
            return;
        }
        if (!songFileValue) {
            document.getElementById('songFileError').textContent = 'Song File is required to add to a playlist.';
            return;
        }
        if (!playlistSelect) return;
        const idx = playlistSelect.value;
        if (idx === '') {
            alert('No playlist selected.');
            return;
        }
        const raw = localStorage.getItem('playlists');
        let pls = [];
        try { pls = raw ? JSON.parse(raw) : []; } catch (e) { pls = []; }
        const pl = pls[Number(idx)];
        if (!pl) { alert('Selected playlist not found.'); return; }
        // ensure song is saved to library
        try {
            Library.loadSongs();
            const fileObj = fileInput && fileInput.files && fileInput.files[0];
            let addedToLibrary = false;
            if (fileObj && window.IdbStorage) {
                try {
                    const blobId = await IdbStorage.saveBlob(fileObj);
                    Library.loadSongs();
                    const already = Library.Songs.some(s => s.location && typeof s.location === 'object' && s.location.blobId === blobId);
                    if (!already) Library.addSong(new Song(songNameValue, { blobId: blobId, filename: fileObj.name }));
                    addedToLibrary = true;
                } catch (e) {
                    console.warn('Could not save file blob to IndexedDB:', e);
                }
            }
            if (!addedToLibrary) {
                const inLibrary = Library.Songs.some(s => (s.name === songNameValue && s.location === songFileValue));
                if (!inLibrary) {
                    Library.addSong(new Song(songNameValue, songFileValue));
                }
            }
        } catch (e) {
            console.warn('Could not auto-save song to library:', e);
        }

        pl.songs = pl.songs || [];
        const exists = pl.songs.some(s => (s.name === songNameValue) || (s.location === songFileValue));
        if (exists) {
            if (playlistNotice) playlistNotice.textContent = 'Song already exists in playlist.';
            return;
        }
        pl.songs.push({ name: songNameValue, location: songFileValue });
        try {
            localStorage.setItem('playlists', JSON.stringify(pls));
            if (playlistNotice) playlistNotice.textContent = 'Added to playlist "' + pl.name + '"';
            setTimeout(() => { if (playlistNotice) playlistNotice.textContent = ''; }, 2000);
            // update select text counts
            loadPlaylistsForAddSong();
        } catch (e) {
            console.warn('Could not save playlist:', e);
            alert('Could not add to playlist.');
        }
    }

    if (addToPlaylistBtn) addToPlaylistBtn.addEventListener('click', function(){ addCurrentSongToSelectedPlaylist(); });
    // populate playlist select on load
    loadPlaylistsForAddSong();

    // Create new playlist control
    const createPlaylistInput = document.getElementById('create-playlist-name');
    const createPlaylistButton = document.getElementById('create-playlist-button');
    const createPlaylistNotice = document.getElementById('create-playlist-notice');

    async function createPlaylist() {
        if (!createPlaylistInput) return;
        const name = createPlaylistInput.value.trim();
        if (!name) {
            if (createPlaylistNotice) createPlaylistNotice.textContent = 'Playlist name is required.';
            return;
        }
        const raw = localStorage.getItem('playlists');
        let pls = [];
        try { pls = raw ? JSON.parse(raw) : []; } catch (e) { pls = []; }
        if (!Array.isArray(pls)) pls = [];
        const exists = pls.some(p => p.name && p.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            if (createPlaylistNotice) createPlaylistNotice.textContent = 'A playlist with that name already exists.';
            return;
        }

        const songNameValue = document.getElementById('songName').value.trim();
        const songFileValue = document.getElementById('songFile').value;

        const newPl = { name: name, songs: [] };
        if (songNameValue && songFileValue) {
            // confirm creation
            if (!confirm('Create playlist "' + name + '" and add the current song to it?')) {
                return;
            }
            // ensure song is saved to library, prefer storing blob
            try {
                Library.loadSongs();
                let addedToLibrary = false;
                if (fileObj && window.IdbStorage) {
                    try {
                        const blobId = await IdbStorage.saveBlob(fileObj);
                        Library.loadSongs();
                        const already = Library.Songs.some(s => s.location && typeof s.location === 'object' && s.location.blobId === blobId);
                        if (!already) Library.addSong(new Song(songNameValue, { blobId: blobId, filename: fileObj.name }));
                        newPl.songs.push({ name: songNameValue, location: { blobId: blobId, filename: fileObj.name } });
                        addedToLibrary = true;
                    } catch (e) {
                        console.warn('Could not save file blob to IndexedDB:', e);
                    }
                }
                if (!addedToLibrary) {
                    const inLibrary = Library.Songs.some(s => (s.name === songNameValue && s.location === songFileValue));
                    if (!inLibrary) {
                        Library.addSong(new Song(songNameValue, songFileValue));
                    }
                    newPl.songs.push({ name: songNameValue, location: songFileValue });
                }
            } catch (e) {
                console.warn('Could not auto-save song to library:', e);
                newPl.songs.push({ name: songNameValue, location: songFileValue });
            }
        } else {
            // confirm creation without a song
            if (!confirm('Create empty playlist "' + name + '"?')) {
                return;
            }
        }
        pls.push(newPl);
        try {
            localStorage.setItem('playlists', JSON.stringify(pls));
            if (createPlaylistNotice) createPlaylistNotice.textContent = 'Playlist created.';
            setTimeout(() => { if (createPlaylistNotice) createPlaylistNotice.textContent = ''; }, 2000);
            createPlaylistInput.value = '';
            loadPlaylistsForAddSong();
        } catch (e) {
            console.warn('Could not create playlist:', e);
            if (createPlaylistNotice) createPlaylistNotice.textContent = 'Could not create playlist.';
        }
    }

    if (createPlaylistButton) createPlaylistButton.addEventListener('click', createPlaylist);

    if (previewPlayBtn) {
        previewPlayBtn.addEventListener('click', function() {
            if (!previewAudio) return;
            previewAudio.play();
            previewPlayBtn.textContent = 'Playing...';
            previewPlayBtn.disabled = true;
        });
    }

    if (previewStopBtn) {
        previewStopBtn.addEventListener('click', function() {
            if (!previewAudio) return;
            previewAudio.pause();
            previewAudio.currentTime = 0;
            if (previewPlayBtn) {
                previewPlayBtn.textContent = 'Play';
                previewPlayBtn.disabled = false;
            }
        });
    }
    form.addEventListener('submit', async function(event) 
    {
        // Prevent the browser from refreshing the page
        event.preventDefault();
        // Clear any previous error/success messages
        document.getElementById('songNameError').textContent = '';
        document.getElementById('songFileError').textContent = '';
        // document.getElementById('formFeedback').textContent = '';

        const songNameValue = document.getElementById('songName').value.trim();
        const songFileValue = document.getElementById('songFile').value;
        let isValid = true;

        if (songNameValue === '') {
            document.getElementById('songNameError').textContent = 'Song Name is required.';
            isValid = false;
        }
        if (songFileValue === '') {
            document.getElementById('songFileError').textContent = 'Song File is required.';
            isValid = false;
        }
        // 5. Process data if validation passes
        if (isValid) {
            // Gather data using the native FormData API
            console.log('Form submitted successfully!');
            console.log('Song Name gathered:', formData.get('songName'));
            // Display success message to the user
            // document.getElementById('formFeedback').textContent = 'Login successful! (Check your console)';
            // If a file blob is selected, store it in IndexedDB and save a reference
            const fileObj = fileInput && fileInput.files && fileInput.files[0];
            if (fileObj && window.IdbStorage) {
                try {
                    const blobId = await IdbStorage.saveBlob(fileObj);
                    Library.loadSongs();
                    const exists = Library.Songs.some(s => s.name === songNameValue && ((typeof s.location === 'string' && s.location === songFileValue) || (s.location && s.location.blobId === blobId)));
                    if (!exists) Library.addSong(new Song(songNameValue, { blobId: blobId, filename: fileObj.name }));
                } catch (e) {
                    console.warn('Could not save file blob to IndexedDB, falling back to file path:', e);
                    Library.loadSongs();
                    const exists = Library.Songs.some(s => s.name === songNameValue && s.location === songFileValue);
                    if (!exists) Library.addSong(new Song(songNameValue, songFileValue));
                }
            } else {
                Library.loadSongs();
                const exists = Library.Songs.some(s => s.name === songNameValue && s.location === songFileValue);
                if (!exists) Library.addSong(new Song(songNameValue, songFileValue));
            }
        const exists = pl.songs.some(s => (s.name === songNameValue) || (s.location === songFileValue) || (s.location && s.location.blobId && savedRef && s.location.blobId === savedRef.blobId));
            try { if (previewURL) { URL.revokeObjectURL(previewURL); previewURL = null; } } catch (e) {}
            console.log(Library.Songs);
            // Navigate User back to main page
            window.location.href = "HomePage.html";
        }
    });
}