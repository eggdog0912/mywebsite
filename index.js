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
// ===================================
// "Yükle" Butonuna Basınca Çalışacak Kısım
// ===================================
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

    // Modal içindeki videoTitleInput kontrolü
    const titleInput = document.getElementById("videoTitleInput");
    if (!titleInput || titleInput.value.trim() === "") {
        alert("Video başlığı boş olamaz.");
        return;
    }

    // 🚀 "Yükle"ye basıldığı an yükleniyor ekranını görünür yapıyoruz
    const loadingOverlay = document.getElementById("loadingOverlay");
    if (loadingOverlay) {
        loadingOverlay.style.display = "flex";
    }

    try {
        // Dosya adını temizleme işlemi
        let safeFileName = file.name
            .toLowerCase()
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9.]/g, '-') 
            .replace(/-+/g, '-');        

        const fileName = Date.now() + "-" + safeFileName;

        // 1. Supabase Storage'a yükle
        const { error: uploadError } = await supabase.storage
            .from("videos")
            .upload(fileName, file);

        if (uploadError) {
            throw new Error("Storage hatası: " + uploadError.message);
        }

        // Public URL al
        const { data: publicUrlData } = supabase.storage
            .from("videos")
            .getPublicUrl(fileName);

        const descriptionInput = document.getElementById("videoDescription");

        // 2. Veritabanına (Database) Kaydet
        const { error: dbError } = await supabase
            .from("videos")
            .insert([
                {
                    title: titleInput.value.trim(),
                    description: descriptionInput ? descriptionInput.value.trim() : "",
                    channel: currentUsername, 
                    video_url: publicUrlData.publicUrl,
                    views: 0,
                    upload_date: new Date().toISOString()
                }
            ]);

        if (dbError) {
            throw new Error("Veritabanı hatası: " + dbError.message);
        }

        // İşlem sorunsuz bittiğinde
        alert("✅ Video başarıyla yüklendi!");
        await loadVideos();
        closeUploadModal();

    } catch (error) {
        console.error(error);
        alert("Hata oluştu: " + error.message);
    } finally {
        // 🚀 İşlem ister başarılı bitsin ister hata versin, yükleniyor ekranını kapatıyoruz
        if (loadingOverlay) {
            loadingOverlay.style.display = "none";
        }
    }
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