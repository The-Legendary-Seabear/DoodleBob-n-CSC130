const defaultLibrarySongs = [
    {
        name: 'Epic Gammer Music',
        artist: 'Unknown Artist',
        location: '../../Test Files/EPIC_GAMMER_MUSIC.mp3',
        image: '../../Test Files/Ozzy.jpg'
    },
    {
        name: 'Beethoven',
        artist: 'Kenndog',
        location: '../../Test Files/Kenndog - Beethoven.mp3',
        image: '../../Test Files/Senpai.jpg'
    }
];

function initializeLibrarySongs() {
    if (localStorage.getItem('librarySongs') === null) {
        localStorage.setItem('librarySongs', JSON.stringify(defaultLibrarySongs));
    }
}

initializeLibrarySongs();
