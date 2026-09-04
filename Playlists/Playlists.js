let playlistData = {};
const playlistStorageKey = 'playlists';
let selectedPlaylist = null;

const addSongBtn = document.getElementById("addSongButton");
const addSongDialog = document.getElementById("addSongDialog");
const addSongForm = document.getElementById("addSongForm");
const songToAdd = document.getElementById("songToAdd");
const addSongError = document.getElementById("addSongError");
const cancelAddSongBtn = document.getElementById("cancelAddSongButton");
const playPlaylistBtn = document.getElementById("playPlaylistButton");

if (addSongBtn) {
    addSongBtn.addEventListener('click', addSongBtn_Click);
}

const addPlaylistBtn = document.getElementById("createPlaylistButton");
if (addPlaylistBtn) {
    addPlaylistBtn.addEventListener('click', addPlaylistBtn_Click);
}

if (playPlaylistBtn) {
    playPlaylistBtn.addEventListener('click', () => {
        window.location.href = `../Functionality/Playing Songs/playSong.html?playlist=${selectedPlaylist}`;
    });
}

function addSongBtn_Click() {
    if (selectedPlaylist === null) {
        document.getElementById("selectedPlaylistName").textContent = "Select a Playlist first";
        return;
    }

    populateSongOptions();
    addSongError.textContent = '';
    addSongDialog.showModal();
}

function addPlaylistBtn_Click() {
    window.location.href = "PlaylistCreation.html"
}

async function loadPlaylists() {
    const storedPlaylists = typeof localStorage === 'undefined'
        ? null
        : localStorage.getItem(playlistStorageKey);

    if (storedPlaylists) {
        playlistData = JSON.parse(storedPlaylists);
    } else {
        const response = await fetch("PlaylistStorage.json");
        playlistData = await response.json();
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(playlistStorageKey, JSON.stringify(playlistData));
        }
    }

    displayPlaylists();
}


function displayPlaylists() {
    const playlistList = document.getElementById("playlistList");

    playlistList.innerHTML = "";

    playlistData.playlists.forEach((playlist, index) => {

        const li = document.createElement("li");

        li.textContent = playlist.name;

        li.addEventListener("click", () => {
            selectedPlaylist = index;
            displaySongs(index);
        });

        playlistList.appendChild(li);
    });
}

function populateSongOptions() {
    const storedSongs = localStorage.getItem('librarySongs');
    const songs = storedSongs ? JSON.parse(storedSongs) : [];

    songToAdd.innerHTML = '<option value="">Select a song</option>';

    songs
        .filter(song => !playlistData.playlists[selectedPlaylist].songs.includes(song.name))
        .forEach(song => {
            const option = document.createElement('option');
            option.value = song.name;
            option.textContent = `${song.name} (${song.location})`;
            songToAdd.appendChild(option);
        });
}

function addSongToPlaylist(event) {
    event.preventDefault();

    if (songToAdd.value === '') {
        addSongError.textContent = 'Please select a song.';
        return;
    }

    playlistData.playlists[selectedPlaylist].songs.push(songToAdd.value);
    localStorage.setItem(playlistStorageKey, JSON.stringify(playlistData));
    displaySongs(selectedPlaylist);
    addSongDialog.close();
}

if (addSongForm) {
    addSongForm.addEventListener('submit', addSongToPlaylist);
}

if (cancelAddSongBtn) {
    cancelAddSongBtn.addEventListener('click', () => addSongDialog.close());
}


function displaySongs(index) {

    const songList = document.getElementById("songList");
    const playlistName = document.getElementById("selectedPlaylistName");

    songList.innerHTML = "";

    const playlist = playlistData.playlists[index];

    playlistName.textContent = playlist.name;
    if (playPlaylistBtn) {
        playPlaylistBtn.disabled = false;
    }

    playlist.songs.forEach(song => {

        const li = document.createElement("li");

        li.textContent = song;

        songList.appendChild(li);
    });
}

loadPlaylists();