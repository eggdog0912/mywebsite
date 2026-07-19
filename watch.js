import { supabase } from "./supabase.js";

// localStorage'dan video verilerini güvenli bir şekilde çekiyoruz
const videoData = JSON.parse(localStorage.getItem("selectedVideo"));
const currentUsername = localStorage.getItem("username") || "Misafir";

// Eğer video verisi yoksa ana sayfaya yönlendir ya da uyar
if (!videoData) {
    alert("Video bilgisi alınamadı, ana sayfaya yönlendiriliyorsunuz.");
    window.location.href = "index.html";
} else {
    // Sayfa elemanlarını doldur
    document.getElementById("watchTitle").textContent = videoData.title;
    document.getElementById("watchChannel").textContent = videoData.channel;
    
    // Yüklenme tarihi alanı veritabanındaki isme (upload_date) göre ayarlandı
    document.getElementById("watchViews").textContent = 
        (videoData.views || 0) + " görüntülenme • " + (videoData.upload_date ? new Date(videoData.upload_date).toLocaleDateString('tr-TR') : "Bilinmiyor");
    
    document.getElementById("watchDescription").textContent = videoData.description || "Açıklama bulunmuyor.";
    
    const video = document.getElementById("watchVideo");
    video.src = videoData.video_url;
}

// Telif Bildirme Buton Mekanizması
const reportCopyrightBtn = document.getElementById("reportCopyrightBtn");

if (reportCopyrightBtn) {
    reportCopyrightBtn.addEventListener("click", async () => {
        if (!videoData) {
            alert("Video bilgisi bulunamadı.");
            return;
        }

        // 1. Kullanıcıdan gerekçe iste
        const reportDescription = prompt("Lütfen telif bildirme gerekçenizi detaylıca yazınız:");

        // İptal edilirse veya boş bırakılırsa durdur
        if (reportDescription === null) return; 
        if (reportDescription.trim() === "") {
            alert("Telif açıklaması boş bırakılamaz.");
            return;
        }

        // 2. Supabase copyright_reports tablosuna veriyi gönder
        const { error } = await supabase
            .from("copyright_reports")
            .insert([
                {
                    video_id: videoData.id,
                    video_title: videoData.title,
                    reported_by: currentUsername,
                    description: reportDescription.trim()
                }
            ]);

        // 3. Kullanıcıyı bilgilendir
        if (error) {
            console.error("Telif bildirimi gönderilemedi:", error);
            alert("Telif bildirimi iletilirken bir hata oluştu: " + error.message);
        } else {
            alert("✅ Telif bildiriminiz başarıyla yöneticilere iletildi. İncelenecektir.");
        }
    });
}