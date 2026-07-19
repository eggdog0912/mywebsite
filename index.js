import { supabase } from "./supabase.js";
// Canlı sitede konsol yazılarını ve log üzerinden kaynak kod takibini kapatır
if (window.location.hostname !== "127.0.0.1" && window.location.hostname !== "localhost") {
    console.log = function() {};
    console.error = function() {};
    console.warn = function() {};
}

// Global değişken (Dışarıdaki fonksiyonların da isme erişebilmesi için)
let currentUsername = "Misafir";

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

    // Veritabanına kaydedilecek objeyi oluştur (currentUsername global değişkenini kullanıyoruz)
    // Artık videoData oluştur (uploadDate alanına gerçek zamanı ISO string olarak atıyoruz)
    const videoData = {
        title: titleInput.value.trim(),
        description: descriptionInput.value.trim(),
        channel: currentUsername, 
        video_url: publicUrlData.publicUrl,
        views: 0,
        uploadDate: new Date().toISOString() // 🚀 Sabit yazı yerine gerçek zaman damgası
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
                upload_date: videoData.uploadDate // ISO String veritabanına gider
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
    channel.style.color = "#0066cc"; // Tıklanabilir olduğunu belli etmek için mavi renk veya hover efekti
    
    // Kanal ismine tıklanınca tetiklenecek olay
    channel.addEventListener("click", (event) => {
        event.stopPropagation(); // 🚨 KRİTİK: Karta tıklayıp watch.html'e gitme eylemini durdurur!
        
        // Target kanalı kaydedip yönlendiriyoruz
        localStorage.setItem("targetChannel", videoData.channel);
        window.location.href = `channel.html?name=${encodeURIComponent(videoData.channel)}`;
    });

   const views = document.createElement("p");
    // videoData.upload_date verisini timeAgo fonksiyonundan geçiriyoruz:
    views.textContent = videoData.views + " görüntülenme • " + timeAgo(videoData.upload_date);

  card.addEventListener("click", async () => {
        // 1. Tıklanan videonun izlenme sayısını anlık olarak 1 artırıyoruz
        const updatedViews = (videoData.views || 0) + 1;

        // 2. Supabase'de bu videonuk views alanını güncelliyoruz
        const { error } = await supabase
            .from("videos")
            .update({ views: updatedViews })
            .eq("id", videoData.id);

        if (error) {
            console.error("İzlenme sayısı güncellenemedi:", error);
        } else {
            // Eğer veritabanı başarıyla güncellendiyse, local objeyi de güncelleyelim
            videoData.views = updatedViews;
        }

        // 3. watch.html sayfasının güncel veriyi okuyabilmesi için localStorage'a yazıyoruz
        localStorage.setItem("selectedVideo", JSON.stringify(videoData));

        // 4. İzleme sayfasına yönlendiriyoruz
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

    videoContainer.innerHTML = "";
    data.forEach(video => {
        renderVideo(video);
    });
}

// ISO Tarihini "X süre önce" formatına çeviren yardımcı fonksiyon
function timeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const msPerMinute = 60 * 1000;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;

    const elapsed = now - past;

    // Eğer tarih geçerli değilse veya henüz yüklenmişse
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
        // Gün hesabı
        const days = Math.round(elapsed / msPerDay);
        if (days === 1) return 'Dün';
        if (days < 30) return days + ' gün önce';
        
        // 30 günden fazla ise normal tarih gösterelim
        return past.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
}