class Song
{
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

    static removeSong(songName)
    {
        this.loadSongs();
        const matches = this.Songs.filter(song => song.name.toLowerCase() === songName.toLowerCase());

        if (matches.length === 0) {
            return { removed: false, playlistsUpdated: 0, playlistsDeleted: 0 };
        }

        // Capture locations/blobIds of songs being removed so playlists can be pruned and blobs deleted
        const removedLocations = matches.map(s => s.location);
        const removedBlobIds = [];
        removedLocations.forEach(loc => {
            if (!loc) return;
            if (typeof loc === 'object' && loc.blobId) removedBlobIds.push(loc.blobId);
            else if (typeof loc === 'string') removedBlobIds.push(loc);
        });

        this.Songs = this.Songs.filter(song => song.name.toLowerCase() !== songName.toLowerCase());
        this.saveSongs();

        // Prune removed songs from saved playlists in localStorage and count changes
        let playlistsUpdated = 0;
        let playlistsDeleted = 0;
        const raw = localStorage.getItem('playlists');
        if (raw) {
            try {
                let playlists = JSON.parse(raw);
                if (Array.isArray(playlists)) {
                    const newPlaylists = [];
                    playlists.forEach(pl => {
                        if (!pl || !Array.isArray(pl.songs)) return;
                        const before = pl.songs.length;
                        pl.songs = pl.songs.filter(s => {
                            if (!s) return false;
                            const nameMatch = s.name && s.name.toLowerCase() === songName.toLowerCase();
                            const locMatch = s.location && removedLocations.includes(s.location);
                            return !(nameMatch || locMatch);
                        });
                        const after = pl.songs.length;
                        if (after === 0) {
                            playlistsDeleted += 1;
                        } else {
                            if (after < before) playlistsUpdated += 1;
                            newPlaylists.push(pl);
                        }
                    });

                    localStorage.setItem('playlists', JSON.stringify(newPlaylists));
                }
            } catch (e) {
                console.warn('Could not update playlists after song removal:', e);
            }
        }

        // Attempt to delete blobs from IndexedDB for any removedBlobIds that look like blob ids
        try {
            if (window.IdbStorage && Array.isArray(removedBlobIds)) {
                removedBlobIds.forEach(id => {
                    // only delete ids that follow the blob id pattern we generate
                    if (typeof id === 'string' && id.startsWith('song-')) {
                        IdbStorage.deleteBlob(id).catch(() => {});
                    }
                });
            }
        } catch (e) {
            console.warn('Could not delete removed blobs:', e);
        }

        return { removed: true, playlistsUpdated, playlistsDeleted };
    }
}

function populateSongList(selectElement)
{
    Library.loadSongs();
    selectElement.innerHTML = '';

    if (Library.Songs.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'No songs available';
        option.value = '';
        selectElement.appendChild(option);
        return;
    }

    Library.Songs.forEach(song => {
        const option = document.createElement('option');
        option.value = song.name;
        let locationDisplay = '';
        if (typeof song.location === 'string') locationDisplay = song.location;
        else if (song.location && song.location.filename) locationDisplay = song.location.filename;
        else if (song.location && song.location.blobId) locationDisplay = '(local file)';
        option.textContent = `${song.name} (${locationDisplay})`;
        selectElement.appendChild(option);
    });
}

document.addEventListener('DOMContentLoaded', function()
{
    const form = document.getElementById('removeSongForm');
    const selectElement = document.getElementById('songName');
    const errorElement = document.getElementById('songNameError');

    if (!form || !selectElement || !errorElement) {
        return;
    }

    populateSongList(selectElement);

    form.addEventListener('submit', function(event)
    {
        event.preventDefault();
        errorElement.textContent = '';

        const selectedSongName = selectElement.value.trim();

        if (selectedSongName === '') {
            errorElement.textContent = 'Please select a song to remove.';
            return;
        }

        const result = Library.removeSong(selectedSongName);

        if (result && result.removed) {
            populateSongList(selectElement);
            const noticeEl = document.getElementById('playlistNotice');
            let msg = 'Song removed from library.';
            if (result.playlistsUpdated || result.playlistsDeleted) {
                const parts = [];
                if (result.playlistsUpdated) parts.push(result.playlistsUpdated + ' playlist(s) updated');
                if (result.playlistsDeleted) parts.push(result.playlistsDeleted + ' playlist(s) deleted');
                msg += ' ' + parts.join(' and ') + '.';
            }
            if (noticeEl) {
                noticeEl.textContent = msg;
            }
            // Give user a moment to read the notice, then go home
            setTimeout(() => { window.location.href = 'HomePage.html'; }, 1600);
        } else {
            errorElement.textContent = 'That song was not found in the library.';
        }
    });

    // Local files listing and deletion
    async function listLocalFiles() {
        const container = document.getElementById('localFilesList');
        if (!container || !window.IdbStorage) return;
        container.innerHTML = '';
        try {
            const items = await IdbStorage.listBlobs();
            if (!items || items.length === 0) {
                container.textContent = 'No local files stored.';
                return;
            }
            const ul = document.createElement('ul');
            items.forEach(it => {
                const li = document.createElement('li');
                li.style.marginBottom = '6px';
                const name = document.createElement('span');
                name.textContent = it.name + (it.size ? (' (' + Math.round(it.size/1024) + ' KB)') : '');
                const btn = document.createElement('button');
                btn.textContent = 'Delete file';
                btn.style.marginLeft = '8px';
                btn.addEventListener('click', async () => {
                    if (!confirm('Delete stored file "' + it.name + '"? This will also remove library entries referencing it.')) return;
                    try {
                        await IdbStorage.deleteBlob(it.id);
                    } catch (e) {
                        console.warn('Could not delete blob:', e);
                    }
                    // remove library entries referencing this blobId
                    Library.loadSongs();
                    Library.Songs = Library.Songs.filter(s => !(s.location && typeof s.location === 'object' && s.location.blobId === it.id));
                    Library.saveSongs();
                    // prune playlists similarly
                    const raw = localStorage.getItem('playlists');
                    if (raw) {
                        try {
                            let pls = JSON.parse(raw);
                            if (Array.isArray(pls)) {
                                pls = pls.map(pl => {
                                    if (!pl || !Array.isArray(pl.songs)) return pl;
                                    pl.songs = pl.songs.filter(s => !(s.location && typeof s.location === 'object' && s.location.blobId === it.id));
                                    return pl;
                                }).filter(pl => pl && Array.isArray(pl.songs) && pl.songs.length > 0);
                                localStorage.setItem('playlists', JSON.stringify(pls));
                            }
                        } catch (e) { console.warn('Could not prune playlists after blob delete:', e); }
                    }
                    listLocalFiles();
                    populateSongList(selectElement);
                });
                li.appendChild(name);
                li.appendChild(btn);
                ul.appendChild(li);
            });
            container.appendChild(ul);
        } catch (e) {
            console.warn('Could not list local files:', e);
            container.textContent = 'Error listing local files.';
        }
    }

    // show local files on page load
    listLocalFiles();
});