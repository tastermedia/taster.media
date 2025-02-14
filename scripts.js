document.addEventListener("DOMContentLoaded", function () {
    // 🎥 Video URLs
    const videos = [
        "https://www.youtube.com/embed/3N54tQj83zU",
        "https://www.youtube.com/embed/RaUkKfppTIs",
        "https://www.youtube.com/embed/asVojYYSmyA",
        "https://www.youtube.com/embed/Kki2nnAu8gg",
        "https://www.youtube.com/embed/rbW9xQ--Y6A",
        "https://www.youtube.com/embed/r-VGJXAhe_8",
        "https://www.youtube.com/embed/-vJyLUWFBtM",
        "https://www.youtube.com/embed/MArDiSiZ20g",
        "https://www.youtube.com/embed/Cwi9jKTVhU8",
        "https://www.youtube.com/embed/gcXg0gaUJCY",
        "https://www.youtube.com/embed/0kdjhSyPQ1k",
        "https://www.youtube.com/embed/ObOaxdn7E8U",
        "https://www.youtube.com/embed/OtwA4PBUZ6Y",
        "https://www.youtube.com/embed/WuUsgJqPnu4",
        "https://www.youtube.com/embed/nFQafZQWYO8?si=HfWJ9fWUVxZPli1C",
        
    ];

    // 🔀 Shuffle function (Fisher-Yates Algorithm)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    shuffleArray(videos);
    const videoGrid = document.getElementById("videoGrid");

    if (videoGrid) {
        videos.forEach(video => {
            const div = document.createElement("div");
            div.className = "video";
            div.innerHTML = `<iframe src="${video}" frameborder="0" allowfullscreen></iframe>`;
            videoGrid.appendChild(div);
        });
    }

    // 📝 Typewriter Effect for Subtitle
    let text = "Bought the ticket. Taking the ride.";
    let index = 0;
    let speed = 100; // Typing speed in milliseconds
    let subtitleElement = document.getElementById("subtitle");

    function typeWriter() {
        if (index < text.length) {
            subtitleElement.innerHTML += text.charAt(index);
            index++;
            setTimeout(typeWriter, speed);
        }
    }

    // Clear any existing text and start the effect
    if (subtitleElement) {
        subtitleElement.innerHTML = "";
        typeWriter();
    }
});