import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDyKD92wFofBmhq9QaTAhhyAkv__C_FHT4",
  authDomain: "agatube-41473.firebaseapp.com",
  projectId: "agatube-41473",
  storageBucket: "agatube-41473.firebasestorage.app",
  messagingSenderId: "728848918805",
  appId: "1:728848918805:web:0a5709baf373cdfbd1a11c"
};

const app = initializeApp(firebaseConfig);

// Veritabanını oluştur
const db = getFirestore(app);

// Diğer dosyalar kullanabilsin diye dışa aktar
export { db };

console.log("Firebase Projesi:", app.options.projectId);