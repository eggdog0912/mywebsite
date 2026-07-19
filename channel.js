import { supabase } from "./supabase.js";

// URL'den veya hafızadan hangi kanala bakıldığını alalım
const urlParams = new URLSearchParams(window.location.search);
const targetChannel = urlParams.get("name") || localStorage.getItem("targetChannel");

if (!targetChannel) {
    alert("Kanal bulunamadı!");
    window.location.href = "index.html";
}

// Sayfa başlıklarını güncelleyelim
document.getElementById("channelTitle").textContent = targetChannel + " - AgaTube";
document.getElementById("channelNameDisplay").textContent = "📺 " + targetChannel;

const channelVideoContainer = document.getElementById("channelVideoContainer");

// ===============================
// Sadece Bu Kanala Ait Videoları Yükle
// ===============================
async function loadChannelVideos() {
    // 🔥 Filtreleme Adımı: .eq("channel", targetChannel) ile sadece bu kanalın videolarını seçiyoruz
    const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("channel", targetChannel)
        .order("id", { ascending: false });

    if (error) {
        console.error("Kanal videoları yüklenemedi:", error);
        return;
    }

    channelVideoContainer.innerHTML = "";

    if (data.length === 0) {
        channelVideoContainer.innerHTML = "<p>Bu kanal henüz hiç video yüklememiş.</p>";
        return;
    }

    data.forEach(video => {
        renderVideoCard(video);
    });
}

// Video kartlarını ekrana basan fonksiyon (index.js'deki yapının aynısı)
function renderVideoCard(videoData) {
    const card = document.createElement("div");
    card.className = "video-card";

    const video = document.createElement("video");
    video.src = videoData.video_url;
    video.controls = true;

    const title = document.createElement("h3");
    title.textContent = videoData.title;

    const views = document.createElement("p");
    views.textContent = videoData.views + " görüntülenme • " + videoData.upload_date;

    card.addEventListener("click", () => {
        localStorage.setItem("selectedVideo", JSON.stringify(videoData));
        window.location.href = "watch.html";
    });

    card.appendChild(video);
    card.appendChild(title);
    card.appendChild(views);
    channelVideoContainer.appendChild(card);
}

// Videoları getir
loadChannelVideos();