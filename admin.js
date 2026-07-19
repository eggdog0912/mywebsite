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