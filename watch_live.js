import { supabase } from "./supabase.js";

// ⚠️ Tüm sistemde kullanılan ortak Agora App ID ve Token
const AGORA_APP_ID = "2371175caced49d281c5dfde53772455";
const AGORA_TOKEN = "007eJxTYCjyvzAxMbqlT4Dpr1tfdc2p721hSlwLeZ5l1mrGWmmJhykwGBmbGxqamyYnJqemmFimGFkYJpumpKWkmhqbmxuZmJpOEU/MaghkZGidL8rExMAIhiA+D0NKam6+bnJGYl5eag4DAxNchoXB0MDAEACApCDo";

const urlParams = new URLSearchParams(window.location.search);
// ⚠️ DİKKAT: Token oluştururken Agora panelinde yazdığın kanal adı neyse, bağlanılan kanal da o olmalıdır!
const channelParam = urlParams.get('demo-channel') || "demo-channel";

// Canlı yayın altyapısı için rtc yerine "live" modu kullanılmalıdır
let client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });

async function initAudience() {
    const streamerNameEl = document.getElementById('streamerName');
    if (streamerNameEl) streamerNameEl.innerText = `Yayıncı: ${channelParam}`;

    try {
        // İstemci rolü zorunlu olarak "audience" (izleyici) ayarlanır
        await client.setClientRole("audience");
        
        // ⚠️ Odaya bağlanırken 3. parametre olarak AGORA_TOKEN gönderilir
        await client.join(AGORA_APP_ID, channelParam, AGORA_TOKEN, null);

        client.on("user-published", async (user, mediaType) => {
            await client.subscribe(user, mediaType);
            if (mediaType === "video") {
                const playerContainer = document.getElementById("playerContainer");
                if (playerContainer) {
                    playerContainer.innerHTML = "";
                    user.videoTrack.play(playerContainer);
                }
            }
            if (mediaType === "audio") {
                user.audioTrack.play();
            }
        });
    } catch (err) {
        console.error("Yayın izleme hatası:", err);
    }

    initChat();
}

function initChat() {
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');

    if (!chatMessages || !chatInput || !sendBtn) return;

    const chatChannel = supabase.channel(`chat_${channelParam}`)
        .on('broadcast', { event: 'message' }, ({ payload }) => {
            appendMessage(payload.user, payload.text);
        })
        .subscribe();

    async function send() {
        const text = chatInput.value.trim();
        if (!text) return;
        const { data: { user } } = await supabase.auth.getUser();
        const username = user ? user.email.split('@')[0] : "Misafir";

        chatChannel.send({ type: 'broadcast', event: 'message', payload: { user: username, text } });
        appendMessage("Sen", text);
        chatInput.value = "";
    }

    sendBtn.onclick = send;
    chatInput.onkeypress = (e) => { if (e.key === 'Enter') send(); };

    function appendMessage(user, text) {
        const div = document.createElement('div');
        div.className = 'chat-msg';
        div.innerHTML = `<strong>${user}:</strong> ${text}`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

document.addEventListener("DOMContentLoaded", initAudience);