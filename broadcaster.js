import { supabase } from "./supabase.js";

const AGORA_APP_ID = "2371175caced49d281c5dfde53772455";
const AGORA_TOKEN = "007eJxTYCjyvzAxMbqlT4Dpr1tfdc2p721hSlwLeZ5l1mrGWmmJhykwGBmbGxqamyYnJqemmFimGFkYJpumpKWkmhqbmxuZmJpOEU/MaghkZGidL8rExMAIhiA+D0NKam6+bnJGYl5eag4DAxNchoXB0MDAEACApCDo";

const urlParams = new URLSearchParams(window.location.search);
const channelParam = urlParams.get('demo-channel') || "demo-channel";

// ⚠️ 1. Canlı yayınlar için rtc yerine "live" modu kullanılmalıdır
let client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
let localTracks = { videoTrack: null, audioTrack: null };
let currentUser = null;

document.addEventListener("DOMContentLoaded", async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert("Oturum açılmamış. Lütfen giriş yapın.");
        window.location.href = "login.html";
        return;
    }
    currentUser = user;

    const camBtn = document.getElementById('startCamBtn');
    const screenBtn = document.getElementById('startScreenBtn');
    const stopBtn = document.getElementById('stopStreamBtn');

    if (camBtn) camBtn.onclick = () => startBroadcast('cam');
    if (screenBtn) screenBtn.onclick = () => startBroadcast('screen');
    if (stopBtn) stopBtn.onclick = stopBroadcast;
});

async function startBroadcast(type) {
    const streamTitleInput = document.getElementById('streamTitleInput');
    const streamTitle = streamTitleInput ? streamTitleInput.value.trim() : "Canlı Yayın";

    try {
        // ⚠️ 2. Odaya katılmadan önce istemcinin rolünü zorunlu olarak "host" (Yayıncı) yapıyoruz
        await client.setClientRole("host");

        // ⚠️ 3. 3. parametre olarak AGORA_TOKEN gönderiliyor ve 4. parametre (UID) null bırakılıyor
        await client.join(AGORA_APP_ID, channelParam, AGORA_TOKEN, null);

        if (type === 'screen') {
            const screenTrack = await AgoraRTC.createScreenVideoTrack({ encoderConfig: "1080p_1" }, "auto");
            localTracks.videoTrack = Array.isArray(screenTrack) ? screenTrack[0] : screenTrack;
            if (Array.isArray(screenTrack)) localTracks.audioTrack = screenTrack[1];
        } else {
            [localTracks.audioTrack, localTracks.videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        }

        const previewContainer = document.getElementById("previewContainer");
        if (previewContainer && localTracks.videoTrack) {
            previewContainer.innerHTML = "";
            localTracks.videoTrack.play(previewContainer);
        }

        const tracksToPublish = [];
        if (localTracks.videoTrack) tracksToPublish.push(localTracks.videoTrack);
        if (localTracks.audioTrack) tracksToPublish.push(localTracks.audioTrack);

        if (tracksToPublish.length > 0) {
            await client.publish(tracksToPublish);
        }

        await supabase.from('live_streams').upsert({
            channel_name: channelParam,
            stream_title: streamTitle,
            is_live: true,
            user_id: currentUser.id
        });

        document.getElementById('startCamBtn').style.display = "none";
        document.getElementById('startScreenBtn').style.display = "none";
        document.getElementById('stopStreamBtn').style.display = "inline-block";

    } catch (err) {
        console.error("Yayın başlatma hatası:", err);
        alert("Yayın açılamadı: " + err.message);
    }
}

async function stopBroadcast() {
    try {
        if (localTracks.videoTrack) { localTracks.videoTrack.stop(); localTracks.videoTrack.close(); }
        if (localTracks.audioTrack) { localTracks.audioTrack.stop(); localTracks.audioTrack.close(); }

        await client.leave();

        if (currentUser) {
            await supabase.from('live_streams').update({ is_live: false }).eq('channel_name', channelParam);
        }
        
        window.location.href = "livestreams.html";
    } catch (err) {
        console.error("Yayın durdurma hatası:", err);
    }
}