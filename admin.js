import { supabase } from "./supabase.js";

async function loadReports() {
    const tableBody = document.getElementById("reportTableBody");
    tableBody.innerHTML = "";

    // Telif raporlarını çek
    const { data: reports, error } = await supabase
        .from("copyright_reports")
        .select("*");

    if (error) return console.error(error);

    reports.forEach(report => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${report.video_title}</td>
            <td>${report.reported_by}</td>
            <td>${report.description}</td>
            <td><button class="delete-btn" data-video-id="${report.video_id}">Videoyu Kaldır</button></td>
        `;

        tableBody.appendChild(tr);
    });

    // Silme butonlarına olay dinleyici ekle
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const videoId = e.target.getAttribute("data-video-id");
            
            if (confirm("Bu videoyu telif ihlali nedeniyle kaldırmak istediğinize emin misiniz?")) {
                // Videos tablosundan sil (Storage entegrasyonuna göre storage silme adımını da ekleyebilirsin)
                const { error: deleteError } = await supabase
                    .from("videos")
                    .delete()
                    .eq("id", videoId);

                if (deleteError) {
                    alert("Silme hatası: " + deleteError.message);
                } else {
                    alert("Video başarıyla kaldırıldı!");
                    loadReports(); // Tabloyu yenile
                }
            }
        });
    });
}

loadReports();

// ==========================================
// GÜNCELLEME NOTLARI YÖNETİMİ
// ==========================================
async function loadAdminNotes() {
    const adminNotesList = document.getElementById("adminNotesList");
    if (!adminNotesList) return;
    adminNotesList.innerHTML = "";

    const { data: notes, error } = await supabase
        .from("update_notes")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) return console.error(error);

    notes.forEach(note => {
        const li = document.createElement("li");
        li.style.cssText = "background: #1e1e1e; padding: 10px; margin-bottom: 10px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;";
        li.innerHTML = `
            <div>
                <strong style="color: #3ea6ff;">${note.title}</strong>
                <p style="margin: 5px 0 0 0; color: #ccc; font-size: 14px;">${note.content}</p>
            </div>
            <button class="delete-note-btn" data-id="${note.id}" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Sil</button>
        `;
        adminNotesList.appendChild(li);
    });

    // Silme butonlarına olay ekle
    document.querySelectorAll(".delete-note-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            if (confirm("Bu güncelleme notunu silmek istediğinize emin misiniz?")) {
                await supabase.from("update_notes").delete().eq("id", id);
                loadAdminNotes();
            }
        });
    });
}

// Not Ekleme Butonu
const addNoteBtn = document.getElementById("addNoteBtn");
if (addNoteBtn) {
    addNoteBtn.addEventListener("click", async () => {
        const title = document.getElementById("noteTitle").value.trim();
        const content = document.getElementById("noteContent").value.trim();

        if (!title || !content) {
            alert("Lütfen başlık ve içerik alanlarını doldurun.");
            return;
        }

        const { error } = await supabase
            .from("update_notes")
            .insert([{ title, content }]);

        if (error) {
            alert("Hata oluştu: " + error.message);
        } else {
            document.getElementById("noteTitle").value = "";
            document.getElementById("noteContent").value = "";
            alert(" Güncelleme notu başarıyla yayınlandı!");
            loadAdminNotes();
        }
    });
}

// Sayfa açıldığında notları yükle
loadAdminNotes();