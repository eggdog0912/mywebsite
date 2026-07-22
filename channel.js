import { supabase } from "./supabase.js";

const urlParams = new URLSearchParams(window.location.search);
const channelId = urlParams.get('id');
const targetChannelName = urlParams.get('name') || localStorage.getItem("targetChannel");

const channelVideoContainer = document.getElementById("channelVideoContainer");

async function loadChannelPage() {
    const { data: { user } } = await supabase.auth.getUser();
    
    let profile = null;
    let currentChannelName = "";

    // 1. Profili ID veya Kanal İsmine göre çek
    if (channelId) {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', channelId)
            .maybeSingle();
        profile = data;
    } 
    
    if (!profile && targetChannelName) {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('channel_name', targetChannelName)
            .maybeSingle();
        profile = data;
    }

    currentChannelName = profile?.channel_name || targetChannelName || "Kanal";

    // Sayfa Başlıkları
    document.getElementById("channelTitle").textContent = currentChannelName + " - AgaTube";
    document.getElementById('channelName').innerText = currentChannelName;
    document.getElementById('channelBio').innerText = profile?.bio || "Açıklama girilmemiş.";

    // Banner Görseli
    if (profile?.banner_url) {
        document.getElementById('channelBanner').style.backgroundImage = `url('${profile.banner_url}')`;
    }

    // Avatar (Profil Fotoğrafı)
    const avatarImg = document.getElementById('channelAvatar');
    if (profile?.avatar_url) {
        avatarImg.src = profile.avatar_url;
        avatarImg.style.display = "block";
    } else {
        avatarImg.style.display = "none";
    }

    // Tema Rengi
    const customColor = profile?.custom_color || "#3ea6ff";
    const channelNameEl = document.getElementById('channelName');
    applyCustomColor(customColor, channelNameEl);

    // Kendi Kanalıysa Butonları Aç ve Dinleyicileri Ekle
    // Kendi Kanalıysa Butonları Aç ve Dinleyicileri Ekle
    // Kendi Kanalıysa Butonları Aç ve Dinleyicileri Ekle
    const isOwner = user && (user.id === channelId || profile?.id === user.id);[cite, 3]
    if (isOwner) {[cite, 3]
        document.getElementById('uploadBannerBtn').style.display = "block";[cite, 3]
        document.getElementById('uploadAvatarBtn').style.display = "flex";[cite,3]
        document.getElementById('colorPickerContainer').style.display = "flex";[cite, 3]
        
        // 🔴 CANLI YAYIN BAŞLAT BUTONUNU KANAL SAHİBİNE GÖSTER
        const startLiveBtn = document.getElementById('startLiveBtn');
        if (startLiveBtn) {
            startLiveBtn.style.display = "inline-block";
            startLiveBtn.onclick = () => {
                window.location.href = `live.html?channel=${encodeURIComponent(currentChannelName)}`;
            };
        }
        
       
    
        
        // ✏️ AÇIKLAMA DÜZENLEME BUTONUNU AÇ
        const editBioBtn = document.getElementById('editBioBtn');
        if (editBioBtn) {
            editBioBtn.style.display = "inline-block";
            
            editBioBtn.onclick = async () => {
                const currentBio = profile?.bio || "";
                const newBio = prompt("Yeni kanal açıklamasını girin:", currentBio);
                
                if (newBio !== null) {
                    const trimmedBio = newBio.trim();
                    
                    const { error } = await supabase
                        .from('profiles')
                        .update({ bio: trimmedBio })
                        .eq('id', user.id);

                    if (error) {
                        alert("Açıklama güncellenemedi: " + error.message);
                    } else {
                        document.getElementById('channelBio').innerText = trimmedBio || "Açıklama girilmemiş.";
                        if (profile) profile.bio = trimmedBio;
                        alert("Açıklama başarıyla güncellendi!");
                    }
                }
            };
        }

        // Tema Rengi Seçici
        const colorPicker = document.getElementById('themeColorPicker');
        if (colorPicker) {
            colorPicker.value = customColor;
            colorPicker.addEventListener('change', async (e) => {
                const newColor = e.target.value;
                applyCustomColor(newColor, channelNameEl);
                await supabase.from('profiles').update({ custom_color: newColor }).eq('id', user.id);
            });
        }

        // Banner Yükleme
        document.getElementById('bannerInput').addEventListener('change', (e) => {
            uploadImage(e.target.files[0], 'banner_url', user.id);
        });

        // Profil Fotoğrafı Yükleme
        document.getElementById('avatarInput').addEventListener('change', (e) => {
            uploadImage(e.target.files[0], 'avatar_url', user.id);
        });
    }

    // 2. İstatistikleri ve Videoları Yükle
    loadChannelStatistics(currentChannelName, profile?.id);
    loadChannelVideos(currentChannelName);
}

// 📤 GÖRSEL YÜKLEME FONKSİYONU
async function uploadImage(file, fieldName, userId) {
    if (!file) return;

    try {
        const fileExt = file.name.split('.').pop();
        const filePath = `${userId}/${fieldName}_${Date.now()}.${fileExt}`;

        // 1. Storage'a Yükle
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // 2. Public URL Al
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // 3. Profiles Tablosunu Güncelle
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ [fieldName]: publicUrl })
            .eq('id', userId);

        if (updateError) throw updateError;

        // 4. Arayüzde Anında Göster
        if (fieldName === 'banner_url') {
            document.getElementById('channelBanner').style.backgroundImage = `url('${publicUrl}')`;
        } else if (fieldName === 'avatar_url') {
            const avatarImg = document.getElementById('channelAvatar');
            avatarImg.src = publicUrl;
            avatarImg.style.display = "block";
        }

        alert("Görsel başarıyla yüklendi!");

    } catch (err) {
        console.error("Yükleme hatası:", err);
        alert("Görsel yüklenirken bir sorun oluştu: " + err.message);
    }
}

// Tema Rengini Sayfaya Uygulama
function applyCustomColor(color, nameElement) {
    if (nameElement) nameElement.style.color = color;
    document.documentElement.style.setProperty('--user-theme-color', color);
    
    const styleTag = document.getElementById('customColorStyles') || document.createElement('style');
    styleTag.id = 'customColorStyles';
    styleTag.innerHTML = `
        .video-card { border-top: 3px solid ${color} !important; }
        .video-title { color: ${color} !important; }
    `;
    document.head.appendChild(styleTag);
}

// 📊 İSTATİSTİK HESAPLAMA
async function loadChannelStatistics(channelName, userId) {
    try {
        const { count: subCount } = await supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .or(`subscribed_to.eq.${channelName},subscribed_to.eq.${userId}`);

        const { data: videos } = await supabase
            .from('videos')
            .select('views, likes_count')
            .eq('channel', channelName);

        let totalViews = 0;
        let totalLikes = 0;

        if (videos && videos.length > 0) {
            videos.forEach(v => {
                totalViews += Number(v.views || 0);
                totalLikes += Number(v.likes_count || 0);
            });
        }

        document.getElementById('statSubs').innerText = subCount || 0;
        document.getElementById('statViews').innerText = totalViews;
        document.getElementById('statLikes').innerText = totalLikes;

    } catch (err) {
        console.error("İstatistik hatası:", err);
    }
}

// Modal Aç/Kapat Mantığı
const showStatsBtn = document.getElementById('showStatsBtn');
const closeStatsBtn = document.getElementById('closeStatsBtn');
const statsModal = document.getElementById('statsModal');

if (showStatsBtn && statsModal) showStatsBtn.onclick = () => statsModal.style.display = 'flex';
if (closeStatsBtn && statsModal) closeStatsBtn.onclick = () => statsModal.style.display = 'none';

// 🎬 KANAL VİDEOLARINI YÜKLE
async function loadChannelVideos(channelName) {
    if (!channelVideoContainer) return;

    const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("channel", channelName)
        .order("id", { ascending: false });

    if (error || !data || data.length === 0) {
        channelVideoContainer.innerHTML = "<p style='color: #888; padding: 10px;'>Bu kanal henüz hiç video yüklememiş.</p>";
        return;
    }

    channelVideoContainer.innerHTML = "";
    data.forEach(video => renderVideoCard(video));
}

// Video Kartlarını Oluşturma
function renderVideoCard(videoData) {
    const card = document.createElement("div");
    card.className = "video-card";

    const video = document.createElement("video");
    video.src = videoData.video_url;
    video.controls = true;

    const title = document.createElement("h3");
    title.className = "video-title";
    title.textContent = videoData.title;

    const views = document.createElement("p");
    views.textContent = (videoData.views || 0) + " görüntülenme";

    card.addEventListener("click", (e) => {
        if (e.target.tagName === 'VIDEO') return;
        localStorage.setItem("selectedVideo", JSON.stringify(videoData));
        window.location.href = "watch.html";
    });

    card.appendChild(video);
    card.appendChild(title);
    card.appendChild(views);
    channelVideoContainer.appendChild(card);
}

// Sayfa Başlatıcı
loadChannelPage();