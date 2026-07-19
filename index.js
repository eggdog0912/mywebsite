
import { supabase } from "./supabase.js";

const loggedInUser = localStorage.getItem("username");

if (!loggedInUser || loggedInUser === "Misafir") {
    // Eğer kullanıcı giriş yapmadıysa direkt login sayfasına fırlatıyoruz
    window.location.href = "login.html";
}


console.log(supabase);

const username = localStorage.getItem("username") || "Misafir";

document.getElementById("welcome").textContent =
"Hoşgeldin " + username;


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
// Upload Butonu
// ===============================

uploadButton.addEventListener("click", () => {

    uploadModal.style.display = "flex";

});


// ===============================
// Modal Kapat
// ===============================

closeModal.addEventListener("click", closeUploadModal);


// Dışarı tıklayınca

uploadModal.addEventListener("click",(event)=>{

    if(event.target===uploadModal){

        closeUploadModal();

    }

});


// ESC

document.addEventListener("keydown",(event)=>{

    if(event.key==="Escape"){

        closeUploadModal();

    }

});


// ===============================
// Video Seç
// ===============================

chooseVideo.addEventListener("click",()=>{

    videoInput.click();

});


videoInput.addEventListener("change",()=>{

    const file = videoInput.files[0];

    if(!file) return;

    selectedVideo.textContent=file.name;

});


// ===============================
// Upload
// ===============================

uploadVideo.addEventListener("click", async () => {

    console.log("1");

    const file = videoInput.files[0];

    console.log("2", file);

    if (!file) {
        alert("Lütfen video seç.");
        return;
    }

    console.log("3");

    if (titleInput.value.trim() === "") {
        alert("Video başlığı boş olamaz.");
        return;
    }

    console.log("4");

    // Dosya adını oluştur
    const fileName = Date.now() + "-" + file.name;

    // Storage'a yükle
 // Storage'a yükle
const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(fileName, file);

if (uploadError) {
    console.error(uploadError);
    return;
}

console.log("✅ Video Storage'a yüklendi!");

// Public URL al
const { data: publicUrlData } = supabase.storage
    .from("videos")
    .getPublicUrl(fileName);

// URL'yi kontrol et
console.log(publicUrlData.publicUrl);

// Artık videoData oluştur
const videoData = {
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    channel: username,
    video_url: publicUrlData.publicUrl,
    views: 0,
    uploadDate: "Az önce"
};



    // Artık videoData'yı oluşturabiliriz


  const { error: dbError } = await supabase
.from("videos")
.insert([
    {
        title: videoData.title,
        description: videoData.description,
        channel: videoData.channel,
        video_url: videoData.video_url,
        views: videoData.views,
        // Sütun adını veritabanındaki gibi alt çizgili yaptık:
        upload_date: videoData.uploadDate 
    }
]);
    if (dbError) {

    console.error(dbError);

    alert(dbError.message);

    return;

}

    

    // Şimdilik sadece ekranda gösterelim
   await loadVideos();

    closeUploadModal();

});

// ===============================
// Video Oluştur
// ===============================

function renderVideo(videoData){


    const card = document.createElement("div");
    card.className = "video-card";

    const video = document.createElement("video");
    video.src = videoData.video_url;
    video.controls = true;

    const title = document.createElement("h3");
title.textContent = videoData.title;

const channel = document.createElement("p");
channel.textContent = videoData.channel;

    const views = document.createElement("p");
    views.textContent =
  videoData.views +
  " görüntülenme • " +
  videoData.upload_date; 
    


  card.addEventListener("click",()=>{
       localStorage.setItem(
        "selectedVideo",
        JSON.stringify(videoData)
    );

  


    window.location.href="watch.html";

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

function closeUploadModal(){

    uploadModal.style.display="none";

    titleInput.value="";

    descriptionInput.value="";

    selectedVideo.textContent="Henüz video seçilmedi.";

    videoInput.value="";

}
async function loadVideos() {

    const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("id", { ascending: false });

    if (error) {

        console.error(error);

        return;

    }

    videoContainer.innerHTML = "";

    data.forEach(video => {

        renderVideo(video);

    });

}
loadVideos();