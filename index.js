import { supabase } from "./supabase.js";
// Canlı sitede konsol yazılarını ve log üzerinden kaynak kod takibini kapatır
if (window.location.hostname !== "127.0.0.1" && window.location.hostname !== "localhost") {
    console.log = function() {};
    console.error = function() {};
    console.warn = function() {};
}

// Global değişkenler
let currentUsername = "Misafir";
let allVideos = []; // Arama motorunun kullanacağı global video hafızası

// ===============================
// 1. SUPABASE GERÇEK OTURUM KONTROLÜ
// ===============================
async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();

    // Eğer aktif bir oturum yoksa direkt giriş sayfasına yönlendir
    if (!session || error) {
        localStorage.clear();
        window.location.href = "login.html";
        return;
    }

    // Giriş başarılıysa kullanıcının kanal adını çekelim
    const { data: profile } = await supabase
        .from('profiles')
        .select('channel_name')
        .eq('id', session.user.id)
        .single();

    // Profil varsa kanal adını, yoksa mailin ilk kısmını ata
    currentUsername = profile ? profile.channel_name : session.user.email.split('@')[0];
    
    // Tarayıcı hafızasını güncelle ve ekrana yaz
    localStorage.setItem("username", currentUsername);
    document.getElementById("welcome").textContent = "Hoşgeldin " + currentUsername;

    // 🔥 KRİTİK ADIM: Oturum başarıyla doğrulandıktan SONRA videoları yükle!
    await loadVideos();
}

// Oturum kontrolünü başlatıyoruz
checkAuth();

// ===============================
// Elemanlar
// ===============================
const uploadButton = document.getElementById("uploadButton");
const uploadModal = document.getElementById("uploadModal");
const chooseVideo = document.getElementById("chooseVideo");
const uploadVideo = document.getElementById("uploadVideo");
const closeModal = document.getElementById("closeModal");
const videoInput = document.getElementById("videoInput");
const titleInput = document.getElementById("videoTitleInput");
const descriptionInput = document.getElementById("videoDescription");
const selectedVideo = document.getElementById("selectedVideo");
const videoContainer = document.getElementById("videoContainer");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");

// ===============================
// Upload Butonu & Modal Kontrolleri
// ===============================
uploadButton.addEventListener("click", () => {
    uploadModal.style.display = "flex";
});

closeModal.addEventListener("click", closeUploadModal);

uploadModal.addEventListener("click", (event) => {
    if (event.target === uploadModal) {
        closeUploadModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeUploadModal();
    }
});

chooseVideo.addEventListener("click", () => {
    videoInput.click();
});

videoInput.addEventListener("change", () => {
    const file = videoInput.files[0];
    if (!file) return;
    selectedVideo.textContent = file.name;
});

// ===============================
// Video Yükleme (Upload) İşlemi
// ===============================
uploadVideo.addEventListener("click", async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        alert("Oturumunuz sonlanmış, lütfen tekrar giriş yapın.");
        window.location.href = "login.html";
        return;
    }
    const file = videoInput.files[0];

    if (!file) {
        alert("Lütfen video seç.");
        return;
    }

    if (titleInput.value.trim() === "") {
        alert("Video başlığı boş olamaz.");
        return;
    }

    // Dosya adını oluştur
    const fileName = Date.now() + "-" + file.name;

    // Storage'a yükle
    const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, file);

    if (uploadError) {
        console.error(uploadError);
        alert("Video yüklenirken hata oluştu: " + uploadError.message);
        return;
    }

    console.log("✅ Video Storage'a yüklendi!");

    // Public URL al
    const { data: publicUrlData } = supabase.storage
        .from("videos")
        .getPublicUrl(fileName);

    const videoData = {
        title: titleInput.value.trim(),
        description: descriptionInput.value.trim(),
        channel: currentUsername, 
        video_url: publicUrlData.publicUrl,
        views: 0,
        uploadDate: new Date().toISOString()
    };

    // Veritabanına Ekle
    const { error: dbError } = await supabase
        .from("videos")
        .insert([
            {
                title: videoData.title,
                description: videoData.description,
                channel: videoData.channel,
                video_url: videoData.video_url,
                views: videoData.views,
                upload_date: videoData.uploadDate
            }
        ]);

    if (dbError) {
        console.error(dbError);
        alert("Veritabanı kaydı başarısız: " + dbError.message);
        return;
    }

    // Videoları yeniden yükle ve modalı kapat
    await loadVideos();
    closeUploadModal();
});

// ===============================
// Video Kartı Oluşturma (Render)
// ===============================
function renderVideo(videoData) {
    const card = document.createElement("div");
    card.className = "video-card";

    const video = document.createElement("video");
    video.src = videoData.video_url;
    video.controls = true;

    const title = document.createElement("h3");
    title.textContent = videoData.title;

    const channel = document.createElement("p");
    channel.textContent = videoData.channel;
    channel.style.cursor = "pointer";
    channel.style.color = "#0066cc";
    
    channel.addEventListener("click", (event) => {
        event.stopPropagation(); // Karta tıklama eylemini durdurur
        localStorage.setItem("targetChannel", videoData.channel);
        window.location.href = `channel.html?name=${encodeURIComponent(videoData.channel)}`;
    });

    const views = document.createElement("p");
    views.textContent = videoData.views + " görüntülenme • " + timeAgo(videoData.upload_date);

    card.addEventListener("click", async () => {
        const updatedViews = (videoData.views || 0) + 1;

        const { error } = await supabase
            .from("videos")
            .update({ views: updatedViews })
            .eq("id", videoData.id);

        if (error) {
            console.error("İzlenme sayısı güncellenemedi:", error);
        } else {
            videoData.views = updatedViews;
        }

        localStorage.setItem("selectedVideo", JSON.stringify(videoData));
        window.location.href = "watch.html";
    });

    card.appendChild(video);
    card.appendChild(title);
    card.appendChild(channel);
    card.appendChild(views);

    videoContainer.appendChild(card);
}

// ===============================
// Modal Temizle
// ===============================
function closeUploadModal() {
    uploadModal.style.display = "none";
    titleInput.value = "";
    descriptionInput.value = "";
    selectedVideo.textContent = "Henüz video seçilmedi.";
    videoInput.value = "";
}

// ===============================
// Videoları Veritabanından Getir
// ===============================
async function loadVideos() {
    const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
        console.error("Videolar yüklenemedi:", error);
        return;
    }

    // Verileri küresel hafızaya alıp ekrana basma işini displayVideos'a aktarıyoruz
    allVideos = data; 
    displayVideos(allVideos);
}

// ===============================
// ARAMA VE EKRANA BASMA MOTORU
// ===============================
function displayVideos(videosToRender) {
    videoContainer.innerHTML = "";

    if (videosToRender.length === 0) {
        videoContainer.innerHTML = "<p style='color: #aaa; text-align: center; grid-column: 1/-1; margin-top: 2rem;'>düzgün video arat la döllaç</p>";
        return;
    }

    videosToRender.forEach(video => {
        renderVideo(video);
    });
}

function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();

    // YouTube tarzı harf eşleşme filtresi (Başlık veya açıklama üzerinden)
    const filteredVideos = allVideos.filter(video => {
        const titleMatch = video.title ? video.title.toLowerCase().includes(query) : false;
        const descMatch = video.description ? video.description.toLowerCase().includes(query) : false;
        return titleMatch || descMatch;
    });

    displayVideos(filteredVideos);
}

// Arama Olayı Dinleyicileri (Anlık ve butonla arama)
searchButton.addEventListener("click", handleSearch);
searchInput.addEventListener("input", handleSearch);
searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        handleSearch();
    }
});

// ===============================
// YARDIMCI FONKSİYONLAR
// ===============================
function timeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const msPerMinute = 60 * 1000;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;

    const elapsed = now - past;

    if (isNaN(elapsed) || elapsed < 0) {
        return "Az önce";
    }

    if (elapsed < msPerMinute) {
        return Math.round(elapsed / 1000) + ' saniye önce';   
    } else if (elapsed < msPerHour) {
        return Math.round(elapsed / msPerMinute) + ' dakika önce';   
    } else if (elapsed < msPerDay) {
        return Math.round(elapsed / msPerHour) + ' saat önce';   
    } else {
        const days = Math.round(elapsed / msPerDay);
        if (days === 1) return 'Dün';
        if (days < 30) return days + ' gün önce';
        
        return past.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
}