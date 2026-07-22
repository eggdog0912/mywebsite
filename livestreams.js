import { supabase } from "./supabase.js";

const liveGridContainer = document.getElementById("liveGridContainer");
const goLiveBtn = document.getElementById("goLiveBtn");

// 1. Kullanıcı Oturum Kontrolü
async function initPage() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const userName = session.user.email.split('@')[0];
        document.getElementById("welcome").textContent = "Hoşgeldin " + userName;
    }

    // Aktif yayınları çek
    loadActiveStreams();
}

// 2. Aktif Yayınları Yükleme Fonksiyonu
async function loadActiveStreams() {
    liveGridContainer.innerHTML = "<p style='color: #aaa;'>Yayınlar yükleniyor...</p>";

    const { data: streams, error } = await supabase
        .from('live_streams')
        .select('*')
        .eq('is_live', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Yayınlar çekilemedi:", error);
        liveGridContainer.innerHTML = "<p style='color: #ff4d4d;'>Yayınlar yüklenirken bir hata oluştu.</p>";
        return;
    }

    if (!streams || streams.length === 0) {
        liveGridContainer.innerHTML = "<p style='color: #aaa; grid-column: 1/-1; text-align: center; margin-top: 50px;'>Şu an canlı yayında kimse yok. İlk yayını sen aç!</p>";
        return;
    }

    liveGridContainer.innerHTML = "";

    streams.forEach(stream => {
        const card = document.createElement("div");
        card.className = "video-card";
        card.style.cssText = "background: #181818; border-radius: 10px; overflow: hidden; border: 1px solid #282828; cursor: pointer;";

        card.onclick = () => {
            // İzleyici olarak yayına yönlendir
            window.location.href = `watch_live.html?channel=${encodeURIComponent(stream.channel_name)}`;
        };

        card.innerHTML = `
            <div style="height: 160px; background: #000; position: relative; display: flex; align-items: center; justify-content: center;">
                <span style="position: absolute; top: 10px; left: 10px; background: #cc0000; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">🔴 CANLI</span>
                <i class="fa-solid fa-play" style="font-size: 36px; color: rgba(255,255,255,0.7);"></i>
            </div>
            <div style="padding: 12px;">
                <h3 style="margin: 0 0 6px 0; color: #fff; font-size: 15px;">${stream.stream_title || 'Canlı Yayın'}</h3>
                <p style="margin: 0; color: #3ea6ff; font-size: 13px; font-weight: bold;">${stream.channel_name}</p>
            </div>
        `;

        liveGridContainer.appendChild(card);
    });
}

// 3. "Go Live" Butonuna Basınca Yayın Açma Sayfasına Gitme
if (goLiveBtn) {
    goLiveBtn.addEventListener("click", async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("Lütfen önce giriş yapın!");
            window.location.href = "login.html";
            return;
        }

        const channelName = user.user_metadata?.channel_name || user.email.split('@')[0];
        window.location.href = `broadcaster.html?channel=${encodeURIComponent(channelName)}`;
    });
}

initPage();