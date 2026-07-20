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

// Sayfa yüklendiğinde abonelik durumunu da kontrol etmesi için kod tetikleyelim
if (videoData) {
    checkSubscriptionStatus();
}

// ==========================================
// ABONELİK DURUMU KONTROLÜ VE ARAYÜZÜ
// ==========================================
// ==========================================
// ABONELİK DURUMU VE ABONE SAYISI KONTROLÜ
// ==========================================
async function checkSubscriptionStatus() {
    const subscribeBtn = document.getElementById("subscribeBtn");
    const subCountSpan = document.getElementById("subCount");
    if (!subscribeBtn || !subCountSpan) return;

    // 1. Kanala ait TOPLAM abone sayısını veritabanından çek ve yazdır
    const { count, error: countError } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true }) // Sadece kaç satır olduğunu (count) çeker, veriyi indirmez (hızlıdır)
        .eq("subscribed_to", videoData.channel);

    if (!countError) {
        subCountSpan.textContent = `${count || 0} abone`;
    }

    // 2. Kullanıcı kendi kanalının videosunu izliyorsa Abone Ol butonunu gizle
    if (videoData.channel === currentUsername) {
        subscribeBtn.style.display = "none";
        return;
    }

    if (currentUsername === "Misafir") {
        subscribeBtn.textContent = "Abone Ol";
        subscribeBtn.style.backgroundColor = "#cc0000";
        return;
    }

    // 3. Giriş yapan kullanıcının bu kanala abone olup olmadığını kontrol et
    const { data: subData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("subscriber", currentUsername)
        .eq("subscribed_to", videoData.channel)
        .single();

    if (subData) {
        // Zaten aboneyse
        subscribeBtn.textContent = "Abonelikten Çık";
        subscribeBtn.style.backgroundColor = "#303030";
        subscribeBtn.style.color = "#aaa";
    } else {
        // Abone değilse
        subscribeBtn.textContent = "Abone Ol";
        subscribeBtn.style.backgroundColor = "#cc0000";
        subscribeBtn.style.color = "white";
    }
}

// ==========================================
// ABONE OLMA / ABONELİKTEN ÇIKMA TETİKLEYİCİSİ
// ==========================================
const subscribeBtn = document.getElementById("subscribeBtn");
if (subscribeBtn) {
    subscribeBtn.addEventListener("click", async () => {
        if (currentUsername === "Misafir") {
            alert("Abone olabilmek için giriş yapmalısınız.");
            return;
        }

        // Mevcut abonelik durumuna tekrar bakalım
        const { data: subData } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("subscriber", currentUsername)
            .eq("subscribed_to", videoData.channel)
            .single();

        if (subData) {
            // Durum A: Zaten aboneyse abonelikten çıkar
            const { error } = await supabase
                .from("subscriptions")
                .delete()
                .eq("id", subData.id);

            if (error) console.error("Abonelikten çıkılamadı:", error);
        } else {
            // Durum B: Abone değilse yeni abonelik satırı ekle
            const { error } = await supabase
                .from("subscriptions")
                .insert([
                    {
                        subscriber: currentUsername,
                        subscribed_to: videoData.channel
                    }
                ]);

            if (error) console.error("Abone olunamadı:", error);
        }

        // Durumu yeniden kontrol edip arayüzü güncelle
        checkSubscriptionStatus();
    });
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

// ==========================================
// KENDİ VİDEOSUNU SİLME ÖZELLİĞİ
// ==========================================
const deleteMyVideoBtn = document.getElementById("deleteMyVideoBtn");

// Eğer videoyu yükleyen kişi ile şu anki kullanıcı aynıysa butonu göster
if (videoData && currentUsername !== "Misafir" && videoData.channel === currentUsername) {
    if (deleteMyVideoBtn) {
        deleteMyVideoBtn.style.display = "inline-block"; // Butonu görünür yap
    }
}

if (deleteMyVideoBtn) {
    deleteMyVideoBtn.addEventListener("click", async () => {
        const confirmDelete = confirm("Bu videoyu kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.");
        
        if (!confirmDelete) return;

        // 🚀 Arayüze yükleniyor hissiyatı verelim
        deleteMyVideoBtn.disabled = true;
        deleteMyVideoBtn.textContent = "Siliniyor...";

        try {
            // 1. Önce videonun storage'daki dosya adını URL'den çekmemiz gerekir.
            // URL yapısı genelde ".../storage/v1/object/public/videos/dosya_adi.mp4" şeklindedir.
            const urlParts = videoData.video_url.split('/');
            const fileName = urlParts[urlParts.length - 1];

            // 2. Supabase Storage'dan video dosyasını sil
            const { error: storageError } = await supabase.storage
                .from("videos")
                .remove([fileName]);

            if (storageError) {
                console.warn("Storage dosya silme uyarısı:", storageError.message);
                // Not: Dosya storage'dan silinirken hata çıksa bile DB'den silmeye devam etmesi için durdurmuyoruz.
            }

            // 3. Supabase Database (videos tablosundan) satırı sil
            const { error: dbError } = await supabase
                .from("videos")
                .delete()
                .eq("id", videoData.id);

            if (dbError) {
                throw new Error(dbError.message);
            }

            alert("✅ Videonuz başarıyla silindi.");
            // Video silindiği için kullanıcıyı ana sayfaya yönlendir
            window.location.href = "index.html";

        } catch (error) {
            console.error(error);
            alert("Video silinirken bir hata oluştu: " + error.message);
            deleteMyVideoBtn.disabled = false;
            deleteMyVideoBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Videomu Sil';
        }
    });
}
// Sayfa ilk yüklendiğinde yorumları getirmesi için fonksiyonu tetikleyelim
if (videoData) {
    loadComments();
}

// ==========================================
// VİDEO YORUMLARINI YÜKLE VE LİSTELE
// ==========================================
async function loadComments() {
    const commentsList = document.getElementById("commentsList");
    const commentCountSpan = document.getElementById("commentCount");
    if (!commentsList || !commentCountSpan) return;

    commentsList.innerHTML = ""; // Listeyi temizle

    // Veritabanından bu videoya ait yorumları en yeniden en eskiye doğru çekiyoruz
    const { data: comments, error } = await supabase
        .from("video_comments")
        .select("*")
        .eq("video_id", videoData.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Yorumlar yüklenirken hata oluştu:", error);
        return;
    }

    // Toplam yorum sayısını yazdır
    commentCountSpan.textContent = comments.length;

    if (comments.length === 0) {
        commentsList.innerHTML = '<p style="color: #888; font-style: italic;">Henüz yorum yapılmamış. İlk yorumu sen yap!</p>';
        return;
    }

    // Yorumları HTML içine ekle
    comments.forEach(comment => {
        const commentDiv = document.createElement("div");
        commentDiv.style.borderBottom = "1px solid #222";
        commentDiv.style.paddingBottom = "10px";

        // Yorum tarihi formatlama
        const commentDate = new Date(comment.created_at).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        commentDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <strong style="color: #3ea6ff;">@${comment.username}</strong>
                <span style="color: #606060; font-size: 12px;">${commentDate}</span>
            </div>
            <p style="margin: 0; color: #ddd; line-height: 1.4;">${comment.comment_text}</p>
        `;

        commentsList.appendChild(commentDiv);
    });
}

// ==========================================
// YENİ YORUM GÖNDERME İŞLEMİ
// ==========================================
const submitCommentBtn = document.getElementById("submitCommentBtn");
const commentInput = document.getElementById("commentInput");

if (submitCommentBtn && commentInput) {
    submitCommentBtn.addEventListener("click", async () => {
        if (currentUsername === "Misafir") {
            alert("Yorum yapabilmek için giriş yapmalısınız.");
            return;
        }

        const commentText = commentInput.value.trim();
        if (commentText === "") {
            alert("Boş yorum gönderemezsiniz.");
            return;
        }

        submitCommentBtn.disabled = true;
        submitCommentBtn.textContent = "Gönderiliyor...";

        // Supabase tablosuna yorum ekleme
        const { error } = await supabase
            .from("video_comments")
            .insert([
                {
                    video_id: videoData.id,
                    username: currentUsername,
                    comment_text: commentText
                }
            ]);

        submitCommentBtn.disabled = false;
        submitCommentBtn.textContent = "Yorum Yap";

        if (error) {
            alert("Yorum gönderilirken hata oluştu: " + error.message);
        } else {
            commentInput.value = ""; // Girdi kutusunu temizle
            loadComments(); // Yorum listesini anlık olarak yenile
        }
    });

    // Enter tuşuna basınca da yorumu göndermesi için kısayol
    commentInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            submitCommentBtn.click();
        }
    });
}