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

    static addSong(song)
    {
        this.Songs.push(song);
    }
}

function testConsole()
{
    console.log("Console Test Submit.");
}

// 1. Select the form element from the DOM
const form = document.getElementById('addSongForm');
// 2. Attach an event listener for the 'submit' action
form.addEventListener('submit', function(event) 
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
        const formData = new FormData(form);
        console.log('Form submitted successfully!');
        console.log('Song Name gathered:', formData.get('songName'));
        // Display success message to the user
        // document.getElementById('formFeedback').textContent = 'Login successful! (Check your console)';
        Library.addSong(new Song(songNameValue, songFileValue));
        console.log(Library.Songs);
        // Navigate User back to main page
        window.location.href = "HomePage.html";
    }
});