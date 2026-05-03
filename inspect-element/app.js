// Konfigurasi Firebase Anda
const firebaseConfig = {
    apiKey: "AIzaSyDyx1sfyaz6eEcbd9TtlFREQSlpiNKjKts",
    authDomain: "wa-template-90a0d.firebaseapp.com",
    databaseURL: "https://wa-template-90a0d-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "wa-template-90a0d",
    storageBucket: "wa-template-90a0d.firebasestorage.app",
    messagingSenderId: "803214078238",
    appId: "1:803214078238:web:c91f88e8ddde74b149190f"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const COLLECTION_NAME = "copass"; 

const sectionsContainer = document.getElementById("sectionsContainer");

// Variabel Global untuk Modal
let currentTargetSectionId = null;

document.addEventListener("DOMContentLoaded", () => {
    loadAndRenderData();
});

// --- RENDER DATA ---
async function loadAndRenderData() {
    sectionsContainer.innerHTML = "<p style='text-align:center; color:#666;'>Memuat data laci...</p>";
    try {
        const querySnapshot = await db.collection(COLLECTION_NAME).get();
        sectionsContainer.innerHTML = ""; 

        if (querySnapshot.empty) {
            sectionsContainer.innerHTML = `
                <div style="text-align:center; padding: 40px; background:#fff; border-radius:8px; border:1px dashed #ccc;">
                    <p style="color:#888; margin:0;">Belum ada laci copas yang dibuat.</p>
                </div>`;
            return;
        }

        querySnapshot.forEach((docSnap) => {
            renderSection(docSnap.id, docSnap.data());
        });
    } catch (error) {
        console.error("Error:", error);
        sectionsContainer.innerHTML = "<p style='color:red;'>Gagal memuat data.</p>";
    }
}

function renderSection(sectionId, data) {
    const sectionDiv = document.createElement("div");

    // Header Laci
    const header = document.createElement("div");
    header.className = "section-header";
    header.innerHTML = `
        <span>${data.title}</span> 
        <button class="btn-primary" style="padding: 6px 12px;" onclick="openCopasModal('${sectionId}', event)">+ Tambah Copas</button>
    `;

    // Konten Laci
    const content = document.createElement("div");
    content.className = "section-content";

    // Toggle buka/tutup
    header.addEventListener("click", () => {
        content.classList.toggle("active");
    });

    const copass = data.copassList || [];
    if (copass.length === 0) {
        content.innerHTML = "<p style='text-align:center; color:#888; font-style:italic;'>Laci masih kosong.</p>";
    } else {
        copass.forEach((p, index) => {
            const card = document.createElement("div");
            card.className = "copas-card";
            card.innerHTML = `
                <div class="copas-desc">${p.desc}</div>
                <div class="copas-text" id="text-${sectionId}-${index}">${p.text}</div>
                <div class="btn-group">
                    <button class="btn-copy" onclick="copyText('text-${sectionId}-${index}')">Salin Teks</button>
                    <button class="btn-delete" onclick="deleteCopas('${sectionId}', ${index})">Hapus</button>
                </div>
            `;
            content.appendChild(card);
        });
    }

    sectionDiv.appendChild(header);
    sectionDiv.appendChild(content);
    sectionsContainer.appendChild(sectionDiv);
}

// --- FUNGSI MODAL ---
window.closeModal = (modalId) => {
    document.getElementById(modalId).classList.remove("active");
}

// 1. Modal Laci
document.getElementById("btnOpenSectionModal").addEventListener("click", () => {
    document.getElementById("inputSectionName").value = "";
    document.getElementById("modalSection").classList.add("active");
    document.getElementById("inputSectionName").focus();
});

document.getElementById("btnSaveSection").addEventListener("click", async () => {
    const nameInput = document.getElementById("inputSectionName").value.trim();
    if (!nameInput) return showToast("Nama laci tidak boleh kosong!");

    const btn = document.getElementById("btnSaveSection");
    btn.innerText = "Menyimpan..."; btn.disabled = true;

    try {
        await db.collection(COLLECTION_NAME).add({ title: nameInput, copassList: [] });
        closeModal("modalSection");
        showToast("Laci berhasil dibuat!");
        loadAndRenderData(); 
    } catch (error) {
        showToast("Gagal menyimpan laci.");
    } finally {
        btn.innerText = "Simpan Laci"; btn.disabled = false;
    }
});

// 2. Modal Copas
window.openCopasModal = (sectionId, event) => {
    event.stopPropagation(); // Mencegah laci menutup/membuka saat tombol ditekan
    currentTargetSectionId = sectionId;
    document.getElementById("inputCopasDesc").value = "";
    document.getElementById("inputCopasText").value = "";
    document.getElementById("modalCopas").classList.add("active");
    document.getElementById("inputCopasDesc").focus();
};

document.getElementById("btnSaveCopas").addEventListener("click", async () => {
    const desc = document.getElementById("inputCopasDesc").value.trim();
    const text = document.getElementById("inputCopasText").value.trim();
    
    if (!desc || !text) return showToast("Judul dan isi copas wajib diisi!");

    const btn = document.getElementById("btnSaveCopas");
    btn.innerText = "Menyimpan..."; btn.disabled = true;

    try {
        await db.collection(COLLECTION_NAME).doc(currentTargetSectionId).update({
            copassList: firebase.firestore.FieldValue.arrayUnion({ desc: desc, text: text })
        });
        closeModal("modalCopas");
        showToast("Copas berhasil ditambahkan!");
        loadAndRenderData(); 
    } catch (error) {
        showToast("Gagal menyimpan copas.");
    } finally {
        btn.innerText = "Simpan Copas"; btn.disabled = false;
    }
});

// --- FITUR HAPUS PROMPT ---
window.deleteCopas = async (sectionId, indexToRemove) => {
    // Tampilkan konfirmasi bawaan browser untuk penghapusan (demi keamanan)
    if (!confirm("Yakin ingin menghapus copas ini?")) return;

    try {
        const docRef = db.collection(COLLECTION_NAME).doc(sectionId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            const newList = data.copassList.filter((_, idx) => idx !== indexToRemove);
            
            await docRef.update({ copassList: newList });
            showToast("Copas dihapus!");
            loadAndRenderData();
        }
    } catch (error) {
        showToast("Gagal menghapus data.");
    }
};

// --- COPY & TOAST NOTIFICATION ---
window.copyText = (elementId) => {
    const textToCopy = document.getElementById(elementId).innerText;
    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast("Copas berhasil disalin!");
    });
};

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(() => { toast.classList.remove("show"); }, 3000); // Hilang setelah 3 detik
}

// Menutup modal jika area gelap di luar modal diklik
window.onclick = function(event) {
    if (event.target.classList.contains("modal")) {
        event.target.classList.remove("active");
    }
}
