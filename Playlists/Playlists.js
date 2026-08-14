let playlistData = {};
let selectedPlaylist = null;


async function loadPlaylists() {
    const response = await fetch("playlists.json");
    playlistData = await response.json();

    displayPlaylists();
}


function displayPlaylists() {
    const playlistList = document.getElementById("playlistList");

    playlistList.innerHTML = "";

    playlistData.playlists.forEach((playlist, index) => {

        const li = document.createElement("li");

        li.textContent = playlist.name;

        li.addEventListener("click", () => {
            displaySongs(index);
        });

        playlistList.appendChild(li);
    });
}


function displaySongs(index) {

    const songList = document.getElementById("songList");
    const playlistName = document.getElementById("selectedPlaylistName");

    songList.innerHTML = "";

    const playlist = playlistData.playlists[index];

    playlistName.textContent = playlist.name;

    playlist.songs.forEach(song => {

        const li = document.createElement("li");

        li.textContent = song;

        songList.appendChild(li);
    });
}

loadPlaylists();