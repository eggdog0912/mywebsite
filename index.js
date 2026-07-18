import { db } from "./firebase.js";

import {
    collection,
    addDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

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

    const videoData = {
        file: file,
        title: titleInput.value.trim(),
        description: descriptionInput.value.trim(),
        channel: username,
        views: 0,
        uploadDate: "Az önce"
    };

    console.log("5", videoData);

    try {

        console.log("6");

        await addDoc(collection(db, "videos"), {
            title: videoData.title,
            description: videoData.description,
            channel: videoData.channel,
            views: videoData.views,
            uploadDate: videoData.uploadDate
        });

        console.log("7");

    } catch(error){

    console.error("FIREBASE HATASI:");
    console.error(error);
    alert(error.message);

}

    console.log("8");

    renderVideo(videoData);

    closeUploadModal();

});

// ===============================
// Video Oluştur
// ===============================

function renderVideo(videoData){


    const card = document.createElement("div");
    card.className = "video-card";

    const video = document.createElement("video");
    video.src = URL.createObjectURL(videoData.file);
    video.controls = true;

    const title = document.createElement("h3");
title.textContent = videoData.title;

const channel = document.createElement("p");
channel.textContent = videoData.channel;

    const views = document.createElement("p");
  views.textContent =
    videoData.views +
    " görüntülenme • " +
    videoData.uploadDate;
    


  card.addEventListener("click",()=>{
       localStorage.setItem(
        "selectedVideo",
        JSON.stringify(videoData)
    );

    localStorage.setItem(
        "selectedVideoUrl",
        URL.createObjectURL(videoData.file)
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