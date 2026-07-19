import { supabase } from "./supabase.js";

const videoData = JSON.parse(localStorage.getItem("selectedVideo"));
const currentUsername = localStorage.getItem("username") || "Misafir";

if (!videoData) {
    alert("Video bilgisi alınamadı, ana sayfaya yönlendiriliyorsunuz.");
    window.location.href = "index.html";
} else {
    // Sayfa elemanlarını doldur
    document.getElementById("watchTitle").textContent = videoData.title;
    document.getElementById("watchChannel").textContent = videoData.channel;
    document.getElementById("watchDescription").textContent = videoData.description || "Açıklama bulunmuyor.";
    
    const video = document.getElementById("watchVideo");
    video.src = videoData.video_url;

    // Canlı beğeni sayılarını ve butonları yükle
    loadVideoStats();
}

// ==========================================
// CANLI İSTATİSTİKLERİ VE REAKSİYONLARI YÜKLE
// ==========================================
async function loadVideoStats() {
    // Videos tablosundan güncel sayıları çekelim
    const { data: video, error } = await supabase
        .from("videos")
        .select("views, likes_count, dislikes_count, upload_date")
        .eq("id", videoData.id)
        .single();

    if (error || !video) return;

    // Görüntülenme ve Tarih Bilgisini Yazdır
    document.getElementById("watchViews").textContent = 
        (video.views || 0) + " görüntülenme • " + (video.upload_date ? new Date(video.upload_date).toLocaleDateString('tr-TR') : "Bilinmiyor");

    // Like / Dislike sayılarını HTML'e aktar
    document.getElementById("likeCount").textContent = video.likes_count || 0;
    document.getElementById("dislikeCount").textContent = video.dislikes_count || 0;

    // Kullanıcının daha önce ne bastığını kontrol edip buton renklerini güncelle
    const { data: userReaction } = await supabase
        .from("video_reactions")
        .select("reaction_type")
        .eq("video_id", videoData.id)
        .eq("username", currentUsername)
        .single();

    const likeBtn = document.getElementById("likeBtn");
    const dislikeBtn = document.getElementById("dislikeBtn");

    // Renkleri sıfırla
    likeBtn.style.backgroundColor = "#272727";
    dislikeBtn.style.backgroundColor = "#272727";

    if (userReaction) {
        if (userReaction.reaction_type === 'like') likeBtn.style.backgroundColor = "#3ea6ff"; // Aktif mavi like
        if (userReaction.reaction_type === 'dislike') dislikeBtn.style.backgroundColor = "#f00"; // Aktif kırmızı dislike
    }
}

// ==========================================
// REAKSİYON TETİKLEME FONKSİYONU (LIKE/DISLIKE)
// ==========================================
async function handleReaction(type) {
    if (currentUsername === "Misafir") {
        alert("Beğeni bırakabilmek için giriş yapmalısınız.");
        return;
    }

    // 1. Önce bu kullanıcının bu videoya daha önce reaksiyon verip vermediğine bakalım
    const { data: existingReaction } = await supabase
        .from("video_reactions")
        .select("*")
        .eq("video_id", videoData.id)
        .eq("username", currentUsername)
        .single();

    let currentLikes = parseInt(document.getElementById("likeCount").textContent);
    let currentDislikes = parseInt(document.getElementById("dislikeCount").textContent);

    if (existingReaction) {
        // Durum A: Kullanıcı ZATEN aynı butona bastıysa (Oyu geri çekiyor)
        if (existingReaction.reaction_type === type) {
            await supabase.from("video_reactions").delete().eq("id", existingReaction.id);
            if (type === 'like') currentLikes--;
            if (type === 'dislike') currentDislikes--;
        } 
        // Durum B: Kullanıcı Like'tan Dislike'a ya da tam tersine geçiş yapıyorsa
        else {
            await supabase.from("video_reactions").update({ reaction_type: type }).eq("id", existingReaction.id);
            if (type === 'like') { currentLikes++; currentDislikes--; }
            if (type === 'dislike') { currentLikes--; currentDislikes++; }
        }
    } else {
        // Durum C: İlk defa oy kullanıyor
        await supabase.from("video_reactions").insert([{ video_id: videoData.id, username: currentUsername, reaction_type: type }]);
        if (type === 'like') currentLikes++;
        if (type === 'dislike') currentDislikes++;
    }

    // 2. Videos tablosundaki toplam sayıları güncelle
    await supabase
        .from("videos")
        .update({ likes_count: currentLikes, dislikes_count: currentDislikes })
        .eq("id", videoData.id);

    // 3. Sayfayı yenilemeden arayüzü güncelle
    loadVideoStats();
}

// Butonlara tıklama olayları
document.getElementById("likeBtn").addEventListener("click", () => handleReaction('like'));
document.getElementById("dislikeBtn").addEventListener("click", () => handleReaction('dislike'));

// ==========================================
// TELİF BİLDİRME SİSTEMİ (Mevcut Kodun)
// ==========================================
const reportCopyrightBtn = document.getElementById("reportCopyrightBtn");
if (reportCopyrightBtn) {
    reportCopyrightBtn.addEventListener("click", async () => {
        const reportDescription = prompt("Lütfen telif bildirme gerekçenizi detaylıca yazınız:");
        if (reportDescription === null) return; 
        if (reportDescription.trim() === "") {
            alert("Telif açıklaması boş bırakılamaz.");
            return;
        }

        const { error } = await supabase
            .from("copyright_reports")
            .insert([{ video_id: videoData.id, video_title: videoData.title, reported_by: currentUsername, description: reportDescription.trim() }]);

        if (error) {
            alert("Telif bildirimi iletilirken bir hata oluştu: " + error.message);
        } else {
            alert("✅ Telif bildiriminiz başarıyla yöneticilere iletildi. İncelenecektir.");
        }
    });
}