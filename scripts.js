document.addEventListener("DOMContentLoaded", function () {
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
        "https://www.youtube.com/embed/gcXg0gaUJCY"
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
});