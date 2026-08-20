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
        const songFound = this.Songs.some(song => song.name.toLowerCase() === songName.toLowerCase());

        if (!songFound) {
            return false;
        }

        this.Songs = this.Songs.filter(song => song.name.toLowerCase() !== songName.toLowerCase());
        this.saveSongs();
        return true;
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
        option.textContent = `${song.name} (${song.location})`;
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

        const wasRemoved = Library.removeSong(selectedSongName);

        if (wasRemoved) {
            populateSongList(selectElement);
            window.location.href = 'HomePage.html';
        } else {
            errorElement.textContent = 'That song was not found in the library.';
        }
    });
});