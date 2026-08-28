let playlistData = {};
const playlistStorageKey = 'playlists';

async function loadPlaylists() {
    const storedPlaylists = typeof localStorage === 'undefined'
        ? null
        : localStorage.getItem(playlistStorageKey);

    if (storedPlaylists) {
        playlistData = JSON.parse(storedPlaylists);
        return;
    }

    const response = await fetch("PlaylistStorage.json");
    playlistData = await response.json();
}

const form = document.getElementById('createPlaylistForm');
const playlistsLoaded = loadPlaylists();

if (form) {
    form.addEventListener('submit', async function(event) 
    {
        // Prevent the browser from refreshing the page
        event.preventDefault();
        // Clear any previous error/success messages
        document.getElementById('playlistNameError').textContent = '';
        document.getElementById('descriptionError').textContent = '';
        // document.getElementById('formFeedback').textContent = '';

        const playlistNameValue = document.getElementById('playlistName').value.trim();
        const descriptionValue = document.getElementById('description').value;
        let isValid = true;

        if (playlistNameValue === '') {
            document.getElementById('playlistNameError').textContent = 'Playlist Name is required.';
            isValid = false;
        }
        // 5. Process data if validation passes
        if (isValid) {
            await playlistsLoaded;
            // Gather data using the native FormData API
            const formData = new FormData(form);
            console.log('Form submitted successfully!');
            console.log('Playlist Name gathered:', formData.get('playlistName'));
            // Display success message to the user
            // document.getElementById('formFeedback').textContent = 'Login successful! (Check your console)';
            playlistData.playlists.push({
                name: playlistNameValue,
                description: descriptionValue,
                songs: []
            });
            localStorage.setItem(playlistStorageKey, JSON.stringify(playlistData));
            console.log(playlistData.playlists);
            // Navigate User back to playlists
            window.location.href = "Playlists.html";
        }
    });
}