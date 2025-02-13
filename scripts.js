document.addEventListener("DOMContentLoaded", function () {
    // Video Embedding Logic
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
        "https://www.youtube.com/embed/nFQafZQWYO8"
    ];

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

    // Typewriter Effect for Subtitle
    const subtitleElement = document.getElementById("subtitle");
    if (subtitleElement) {
        const text = "Bought the ticket. Taking the ride.";
        let index = 0;
        let speed = 100; // Adjust typing speed in milliseconds

        function typeWriter() {
            if (index < text.length) {
                subtitleElement.innerHTML += text.charAt(index);
                index++;
                setTimeout(typeWriter, speed);
            }
        }

        // Clear existing text and start typing effect
        subtitleElement.innerHTML = "";
        typeWriter();
    }
});