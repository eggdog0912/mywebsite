const videoData =
JSON.parse(
localStorage.getItem("selectedVideo")
);

document.getElementById("watchTitle").textContent =
videoData.title;

document.getElementById("watchChannel").textContent =
videoData.channel;

document.getElementById("watchViews").textContent =
videoData.views +
" görüntülenme • " +
videoData.uploadDate;

document.getElementById("watchDescription").textContent =
videoData.description;
const video =
document.getElementById("watchVideo");

video.src =
localStorage.getItem("selectedVideoUrl");