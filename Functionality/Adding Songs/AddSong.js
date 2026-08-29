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
    form.addEventListener('submit', function(event) 
    {
        // Prevent the browser from refreshing the page
        event.preventDefault();
        // Clear any previous error/success messages
        document.getElementById('songNameError').textContent = '';
        document.getElementById('songFileError').textContent = '';
        // document.getElementById('formFeedback').textContent = '';

        const songNameValue = document.getElementById('songName').value.trim();
        const songFileInput = document.getElementById('songFile');
        const selectedFile = songFileInput && songFileInput.files && songFileInput.files[0];
        let isValid = true;

        if (songNameValue === '') {
            document.getElementById('songNameError').textContent = 'Song Name is required.';
            isValid = false;
        }
        if (!selectedFile) {
            document.getElementById('songFileError').textContent = 'Song File is required.';
            isValid = false;
        }
        // 5. Process data if validation passes
        if (isValid) {
            const reader = new FileReader();
            reader.onload = function() {
                const formData = new FormData(form);
                console.log('Form submitted successfully!');
                console.log('Song Name gathered:', formData.get('songName'));

                const fileDataUrl = typeof reader.result === 'string' ? reader.result : selectedFile.name;
                Library.addSong(new Song(songNameValue, fileDataUrl));
                console.log(Library.Songs);

                // Navigate User back to main page
                if (window && window.location) {
                    window.location.href = "/HomePage.html";
                }
            };
            reader.readAsDataURL(selectedFile);
        }
    });
}