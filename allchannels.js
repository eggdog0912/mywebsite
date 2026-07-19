import { supabase } from "./supabase.js";

const channelsListContainer = document.getElementById("channelsListContainer");

async function loadAllChannels() {
    // 🔍 SORUNUN CEVABI: Supabase'deki profiles tablosundaki tüm satırları çekiyoruz.
    // .order('channel_name', { ascending: true }) ile kanalları A'dan Z'ye yukarıdan aşağıya sıralıyoruz.
    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("channel_name", { ascending: true });

    if (error) {
        console.error("Kanallar getirilirken hata oluştu:", error);
        channelsListContainer.innerHTML = "<p>Kanallar yüklenemedi.</p>";
        return;
    }

    channelsListContainer.innerHTML = "";

    if (profiles.length === 0) {
        channelsListContainer.innerHTML = "<p>Henüz açılmış bir kanal bulunmuyor.</p>";
        return;
    }

    // Her bir kanalı yukarıdan aşağıya dikey hizada oluşturuyoruz
    profiles.forEach(profile => {
        renderChannelRow(profile);
    });
}

function renderChannelRow(profileData) {
    // Satır kapsayıcısı
    const row = document.createElement("div");
    // channel.css içindeki .video-card yapısının benzeri şık bir buton tasarımı
    row.style.backgroundColor = "#1c1c1c";
    row.style.padding = "1.2rem";
    row.style.borderRadius = "8px";
    row.style.cursor = "pointer";
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.transition = "transform 0.2s, background-color 0.2s";

    // Hover efekti
    row.addEventListener("mouseenter", () => {
        row.style.transform = "translateX(5px)";
        row.style.backgroundColor = "#2a2a2a";
    });
    row.addEventListener("mouseleave", () => {
        row.style.transform = "translateX(0)";
        row.style.backgroundColor = "#1c1c1c";
    });

    // Kanal ismi sol tarafta
    const nameLabel = document.createElement("h3");
    nameLabel.textContent = profileData.channel_name;
    nameLabel.style.color = "#ffffff";
    nameLabel.style.fontSize = "1.2rem";

    // Sağ tarafa ufak bir yönlendirme oku veya yazı
    const actionLabel = document.createElement("span");
    actionLabel.textContent = "Kanala Git →";
    actionLabel.style.color = "#cc0000";
    actionLabel.style.fontWeight = "bold";
    actionLabel.style.fontSize = "0.9rem";

    // 🚀 Tıklayınca o kanalın özel sayfasına (channel.html) gitme mantığı
    row.addEventListener("click", () => {
        localStorage.setItem("targetChannel", profileData.channel_name);
        window.location.href = `channel.html?name=${encodeURIComponent(profileData.channel_name)}`;
    });

    row.appendChild(nameLabel);
    row.appendChild(actionLabel);
    channelsListContainer.appendChild(row);
}

// Sayfa açıldığında fonksiyonu tetikle
loadAllChannels();