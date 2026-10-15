/**
 * Matek Ambis - Portal Informasi Lomba & Olimpiade
 * Core Application Logic (App.js) — versi read-only (data dari Google Sheets)
 *
 * Data lomba dikelola langsung di Google Sheets, poster di Google Drive.
 * Frontend hanya menampilkan (tidak ada admin / tulis ke cloud).
 */

document.addEventListener("DOMContentLoaded", () => {
  // ========================================================================
  // 1. Application State & Storage
  // ========================================================================
  const STORAGE_KEYS = {
    LOMBA_DATA: "matek_ambis_lomba_data",
    FAVORITES: "matek_ambis_favorites",
    THEME: "matek_ambis_theme",
    CATEGORIES: "matek_ambis_categories"
  };

  const FALLBACK_POSTER = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80";

  // --- Safe storage: fallback memory bila localStorage gagal (mis. SecurityError) ---
  const memoryStore = new Map();
  let storageWarningShown = false;
  function safeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      if (memoryStore.has(key)) return memoryStore.get(key);
      return null;
    }
  }
  function safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
      memoryStore.set(key, value);
    } catch (e) {
      memoryStore.set(key, value);
      if (!storageWarningShown) {
        storageWarningShown = true;
        setTimeout(() => showToast("Penyimpanan browser diblokir; data hanya tersimpan sementara di memori.", "danger"), 0);
      }
    }
  }

  let customCategories = loadCategories();
  let allLomba = loadLombaData();
  let favoriteIds = new Set(loadFavoritesData());
  let currentTab = "all"; // 'all' | 'saved'
  let activeModalLombaId = null;

  // Filter state
  const filterState = {
    search: "",
    category: "semua",
    biaya: "semua",
    status: "semua",
    sortBy: "deadline-asc"
  };

  // ========================================================================
  // 2. DOM Elements
  // ========================================================================
  const elements = {
    lombaGrid: document.getElementById("lombaGrid"),
    resultsBadge: document.getElementById("resultsCountBadge"),
    savedCountBadge: document.getElementById("savedCountBadge"),

    // Search & Filters
    heroSearchInput: document.getElementById("heroSearchInput"),
    clearSearchBtn: document.getElementById("clearSearchBtn"),
    filterKategoriSelect: document.getElementById("filterKategoriSelect"),
    feePills: document.querySelectorAll(".fee-pill"),
    filterStatus: document.getElementById("filterStatus"),
    sortBySelect: document.getElementById("sortBySelect"),
    resetFiltersBtn: document.getElementById("resetFiltersBtn"),

    // Tabs & Nav
    tabAllLomba: document.getElementById("tabAllLomba"),
    tabSavedLomba: document.getElementById("tabSavedLomba"),
    themeToggleBtn: document.getElementById("themeToggleBtn"),

    // Lightbox Modal
    lightboxModal: document.getElementById("lightboxModal"),
    lightboxTitle: document.getElementById("lightboxTitle"),
    lightboxImg: document.getElementById("lightboxImg"),
    lightboxDownloadBtn: document.getElementById("lightboxDownloadBtn"),
    closeLightboxBtn: document.getElementById("closeLightboxBtn"),

    // Detail Modal
    detailModal: document.getElementById("detailModal"),
    closeDetailModalBtn: document.getElementById("closeDetailModalBtn"),
    modalDetailTitle: document.getElementById("modalDetailTitle"),
    modalDetailOrganizer: document.getElementById("modalDetailOrganizer"),
    modalDetailBadges: document.getElementById("modalDetailBadges"),
    modalDetailPosterWrap: document.getElementById("modalDetailPosterWrap"),
    modalDetailPosterImg: document.getElementById("modalDetailPosterImg"),
    btnZoomModalPoster: document.getElementById("btnZoomModalPoster"),
    modalDetailBiaya: document.getElementById("modalDetailBiaya"),
    modalDetailCountdown: document.getElementById("modalDetailCountdown"),
    modalDetailTglMulai: document.getElementById("modalDetailTglMulai"),
    modalDetailTglSelesai: document.getElementById("modalDetailTglSelesai"),
    modalDetailDesc: document.getElementById("modalDetailDesc"),
    modalRegisterBtn: document.getElementById("modalRegisterBtn"),
    modalBookmarkActionBtn: document.getElementById("modalBookmarkActionBtn"),

    // Toast Container
    toastContainer: document.getElementById("toastContainer")
  };

  // ========================================================================
  // 3. Initialization
  // ========================================================================
  initTheme();
  setupDialogLightDismissFallbacks([
    elements.detailModal,
    elements.lightboxModal
  ]);
  syncCategoriesWithLomba();
  renderFilterCategoryOptions();
  renderLombaList();
  setupEventListeners();
  loadDataFromBackend();

  // ========================================================================
  // 4. Data Loading & Persistence
  // ========================================================================
  function loadCategories() {
    try {
      const stored = safeGet(STORAGE_KEYS.CATEGORIES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Gagal memuat data kategori:", e);
    }
    return [...DEFAULT_CATEGORIES];
  }

  function saveCategories(cats) {
    try {
      safeSet(STORAGE_KEYS.CATEGORIES, JSON.stringify(cats));
    } catch (e) {
      console.error("Gagal menyimpan data kategori:", e);
    }
  }

  function syncCategoriesWithLomba() {
    let changed = false;
    allLomba.forEach(l => {
      if (l.kategori && !customCategories.includes(l.kategori)) {
        customCategories.push(l.kategori);
        changed = true;
      }
    });
    if (changed) saveCategories(customCategories);
  }

  function loadLombaData() {
    try {
      const stored = safeGet(STORAGE_KEYS.LOMBA_DATA);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Gagal memuat data dari localStorage:", e);
    }
    return [...DEFAULT_LOMBA];
  }

  // Ambil data terbaru dari Google Sheets (read-only). Cache lokal dipakai
  // sebagai tampilan awal / fallback bila jaringan gagal.
  async function loadDataFromBackend() {
    try {
      const remoteData = await fetchLombaFromSheets();
      if (Array.isArray(remoteData)) {
        allLomba = remoteData;
        saveLombaData();
        syncCategoriesWithLomba();
        renderFilterCategoryOptions();
        renderLombaList();
      }
    } catch (e) {
      console.warn("Gagal memuat data dari Sheets, memakai cache lokal:", e);
    }
  }

  function saveLombaData() {
    try {
      const json = JSON.stringify(allLomba);
      if (json.length > 4.5 * 1024 * 1024) return; // jaga kuota ~5MB
      safeSet(STORAGE_KEYS.LOMBA_DATA, json);
    } catch (e) {
      console.error("Gagal menyimpan cache data lomba:", e);
    }
  }

  function loadFavoritesData() {
    try {
      const stored = safeGet(STORAGE_KEYS.FAVORITES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Gagal memuat data favorit:", e);
    }
    return [];
  }

  function saveFavoritesData() {
    try {
      safeSet(STORAGE_KEYS.FAVORITES, JSON.stringify(Array.from(favoriteIds)));
    } catch (e) {
      console.error("Gagal menyimpan data favorit:", e);
    }
  }

  // ========================================================================
  // 5. Theme Toggling
  // ========================================================================
  function initTheme() {
    const savedTheme = safeGet(STORAGE_KEYS.THEME) ||
      (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(savedTheme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    safeSet(STORAGE_KEYS.THEME, theme);
    if (elements.themeToggleBtn) {
      elements.themeToggleBtn.innerHTML = theme === "dark"
        ? '<i class="fa-solid fa-sun" style="color: #f59e0b;"></i>'
        : '<i class="fa-solid fa-moon"></i>';
      elements.themeToggleBtn.setAttribute("title", theme === "dark" ? "Mode Terang" : "Mode Gelap");
      elements.themeToggleBtn.setAttribute("aria-label", theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap");
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(current === "dark" ? "light" : "dark");
  }

  // ========================================================================
  // 6. Dialog helpers: sinkron (gesture) + fallback iOS/Safari lama
  // ========================================================================
  function openDialogSafe(d) {
    if (!d) return;
    try {
      if (typeof d.showModal === "function") {
        if (!d.open) d.showModal();
        return;
      }
    } catch (e) { /* lanjut ke fallback */ }
    d.setAttribute("open", "");
    document.body.style.overflow = "hidden";
  }
  function closeDialogSafe(d) {
    if (!d) return;
    try { if (d.open) d.close(); } catch (e) { /* abaikan */ }
    d.removeAttribute("open");
    if (!document.querySelector("dialog[open]")) document.body.style.overflow = "";
  }

  // ========================================================================
  // 7. Lightbox Poster Preview
  // ========================================================================
  function openLightbox(imageUrl, title = "Poster Lomba") {
    if (!elements.lightboxModal || !imageUrl) return;
    elements.lightboxImg.src = imageUrl;
    elements.lightboxImg.alt = `Poster lomba ${title}`;
    elements.lightboxTitle.textContent = title;
    elements.lightboxDownloadBtn.href = imageUrl;
    openDialogSafe(elements.lightboxModal);
  }

  // ========================================================================
  // 8. Category dropdown
  // ========================================================================
  function getCategoryIcon(catName) {
    const lower = String(catName || "").toLowerCase();
    if (lower.includes("data") || lower.includes("ai")) return "fa-chart-pie";
    if (lower.includes("business") || lower.includes("case")) return "fa-briefcase";
    if (lower.includes("essay") || lower.includes("esai")) return "fa-pen-nib";
    if (lower.includes("poster") || lower.includes("desain")) return "fa-palette";
    return "fa-trophy";
  }

  function renderFilterCategoryOptions() {
    if (!elements.filterKategoriSelect) return;
    const currentVal = elements.filterKategoriSelect.value;
    elements.filterKategoriSelect.innerHTML = `<option value="semua">Semua Kategori</option>`;
    customCategories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      elements.filterKategoriSelect.appendChild(opt);
    });
    elements.filterKategoriSelect.value = currentVal || "semua";
  }

  // ========================================================================
  // 9. Time, Date, & Fee Helpers
  // ========================================================================
  /**
   * Parse tanggal dari Sheets. Dua format yang mungkin:
   * - "YYYY-MM-DD" (sel bertipe tanggal/teks)
   * - timestamp ISO, mis. "2026-10-18T17:00:00.000Z" (hasil JSON dari Apps Script)
   * Untuk timestamp, tanggal diambil menurut zona Asia/Jakarta agar sama dengan
   * yang tampil di Sheets (18 Okt 17:00Z = 19 Okt 00:00 WIB).
   */
  function parseLombaDate(value) {
    if (!value) return null;
    const s = String(value).trim();

    const plain = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (plain) return new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]));

    const d = new Date(s);
    if (isNaN(d.getTime())) return null;

    // Timestamp ISO → tanggal menurut WIB (UTC+7, tanpa DST).
    const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
    return new Date(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate());
  }

  function formatDateIndo(dateStr) {
    if (!dateStr) return "-";
    const d = parseLombaDate(dateStr);
    if (!d) return String(dateStr);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }

  function calculateRegistrationStatus(startStr, endStr) {
    // Hari ini menurut zona Asia/Jakarta, dibandingkan sebagai tanggal (bukan selisih ms).
    const todayMid = parseLombaDate(new Date().toISOString());
    const endMid = parseLombaDate(endStr);
    const startMid = parseLombaDate(startStr);

    if (startMid && !isNaN(startMid.getTime()) && todayMid < startMid) {
      return { status: "upcoming", label: `Buka ${formatDateIndo(startStr)}`, pillClass: "safe", icon: "fa-calendar" };
    }

    if (!endMid || isNaN(endMid.getTime())) {
      return { status: "closed", label: "Pendaftaran Ditutup", pillClass: "closed", icon: "fa-ban" };
    }

    const diffDays = Math.round((endMid - todayMid) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { status: "closed", label: "Pendaftaran Ditutup", pillClass: "closed", icon: "fa-ban" };
    }
    if (diffDays === 0) {
      return { status: "urgent", label: "Berakhir Hari Ini!", pillClass: "urgent", icon: "fa-fire" };
    } else if (diffDays <= 7) {
      return { status: "urgent", label: `Tersisa ${diffDays} Hari`, pillClass: "urgent", icon: "fa-triangle-exclamation" };
    } else {
      return { status: "safe", label: `Tersisa ${diffDays} Hari`, pillClass: "safe", icon: "fa-clock" };
    }
  }

  function formatFeeText(biaya) {
    const nominal = Number(biaya) || 0;
    if (nominal === 0) {
      return '<span style="color: var(--status-free-text); font-weight: 700;">Gratis (Free)</span>';
    }
    return `Rp ${nominal.toLocaleString("id-ID")}`;
  }

  // ========================================================================
  // 10. Filter, Sort, & Render Pipeline
  // ========================================================================
  function filterAndSortLomba() {
    let results = allLomba.filter(lomba => {
      if (currentTab === "saved" && !favoriteIds.has(lomba.id)) return false;

      if (filterState.category !== "semua" && lomba.kategori !== filterState.category) return false;

      if (filterState.search.trim() !== "") {
        const query = filterState.search.toLowerCase().trim();
        const matchTitle = (lomba.judul || "").toLowerCase().includes(query);
        const matchOrg = (lomba.penyelenggara || "").toLowerCase().includes(query);
        const matchCat = (lomba.kategori || "").toLowerCase().includes(query);
        const matchDesc = (lomba.deskripsi || "").toLowerCase().includes(query);
        if (!matchTitle && !matchOrg && !matchCat && !matchDesc) return false;
      }

      const feeNum = Number(lomba.biaya) || 0;
      if (filterState.biaya === "gratis" && feeNum > 0) return false;
      if (filterState.biaya === "berbayar" && feeNum === 0) return false;

      if (filterState.status !== "semua") {
        const regStatus = calculateRegistrationStatus(lomba.tanggalMulai, lomba.tanggalSelesai);
        if (filterState.status === "aktif" && !["safe", "urgent"].includes(regStatus.status)) return false;
        if (filterState.status === "upcoming" && regStatus.status !== "upcoming") return false;
        if (filterState.status === "urgent" && regStatus.status !== "urgent") return false;
        if (filterState.status === "selesai" && regStatus.status !== "closed") return false;
      }

      return true;
    });

    results.sort((a, b) => {
      if (filterState.sortBy === "deadline-asc") {
        return new Date(a.tanggalSelesai) - new Date(b.tanggalSelesai);
      } else if (filterState.sortBy === "title-asc") {
        return (a.judul || "").localeCompare(b.judul || "");
      } else if (filterState.sortBy === "biaya-asc") {
        return (Number(a.biaya) || 0) - (Number(b.biaya) || 0);
      }
      return 0;
    });

    return results;
  }

  function renderLombaList() {
    const list = filterAndSortLomba();

    elements.resultsBadge.textContent = `${list.length} kompetisi${currentTab === "saved" ? " tersimpan" : " ditemukan"}`;
    elements.savedCountBadge.textContent = favoriteIds.size;
    const isDefaultFilter = filterState.search.trim() === "" && filterState.category === "semua" && filterState.biaya === "semua" && filterState.status === "semua" && filterState.sortBy === "deadline-asc" && currentTab === "all";
    elements.resetFiltersBtn.disabled = isDefaultFilter;
    elements.resetFiltersBtn.setAttribute("aria-disabled", String(isDefaultFilter));

    if (list.length === 0) {
      elements.lombaGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <i class="fa-solid fa-magnifying-glass-chart"></i>
          </div>
          <h3 class="empty-title">${currentTab === "saved" && favoriteIds.size === 0 ? "Ambis boleh, lupa jangan." : "Belum ketemu yang cocok?"}</h3>
          <p class="empty-desc">
            ${currentTab === "saved" && favoriteIds.size === 0
              ? "Kamu belum memiliki lomba yang disimpan ke daftar favorit. Tandai ikon bookmark pada kartu lomba untuk menyimpannya di sini!"
              : "Coba ubah kata kunci pencarian atau sesuaikan opsi filter kategori untuk menemukan kompetisi lainnya."}
          </p>
          <button type="button" class="cta-btn-sm" id="emptyResetBtn" style="margin: 0 auto;">
            <i class="fa-solid fa-rotate-left"></i> ${currentTab === "saved" ? "Lihat Semua Lomba" : "Reset Filter"}
          </button>
        </div>
      `;

      const emptyResetBtn = document.getElementById("emptyResetBtn");
      if (emptyResetBtn) {
        emptyResetBtn.addEventListener("click", () => {
          if (currentTab === "saved") {
            resetAllFilters();
            switchTab("all");
          } else {
            resetAllFilters();
          }
        });
      }
      return;
    }

    elements.lombaGrid.innerHTML = "";

    list.forEach(lomba => {
      const regStatus = calculateRegistrationStatus(lomba.tanggalMulai, lomba.tanggalSelesai);
      const isBookmarked = favoriteIds.has(lomba.id);
      const feeNum = Number(lomba.biaya) || 0;
      const posterSrc = lomba.posterUrl || FALLBACK_POSTER;

      const card = document.createElement("article");
      card.className = "lomba-card";
      card.setAttribute("aria-label", `Kompetisi: ${lomba.judul} oleh ${lomba.penyelenggara}`);
      card.innerHTML = `
        <div>
          <div class="card-visual">
            <button type="button" class="card-poster" data-action="preview-poster" data-id="${escapeHtml(lomba.id)}" aria-label="Perbesar poster ${escapeHtml(lomba.judul)}">
              <img src="${escapeHtml(posterSrc)}" alt="Poster lomba ${escapeHtml(lomba.judul)}" loading="lazy">
              <span class="poster-zoom-hint"><i class="fa-solid fa-expand" aria-hidden="true"></i> Lihat poster</span>
            </button>
            <span class="class-badge ${feeNum === 0 ? 'free' : 'paid'}">${feeNum === 0 ? 'Gratis' : 'Rp ' + feeNum.toLocaleString('id-ID')}</span>
            <button type="button" class="btn-bookmark ${isBookmarked ? 'bookmarked' : ''}" data-action="bookmark" data-id="${escapeHtml(lomba.id)}" aria-pressed="${isBookmarked}" aria-label="${isBookmarked ? 'Hapus dari tersimpan' : 'Simpan lomba'}: ${escapeHtml(lomba.judul)}" title="${isBookmarked ? 'Hapus dari tersimpan' : 'Simpan lomba'}">
              <i class="fa-${isBookmarked ? 'solid' : 'regular'} fa-bookmark" aria-hidden="true"></i>
            </button>
          </div>
          <div class="card-content">
            <div class="category-caption"><i class="fa-solid ${getCategoryIcon(lomba.kategori || '')}" aria-hidden="true"></i> ${escapeHtml((lomba.kategori || 'Kompetisi').replace(/ Competition$/i, ''))}</div>
            <h3 class="card-title">${escapeHtml(lomba.judul)}</h3>
            <div class="card-organizer"><i class="fa-solid fa-building-columns" aria-hidden="true"></i> ${escapeHtml(lomba.penyelenggara)}</div>
            ${lomba.deskripsi ? `<p class="card-summary">${linkifySafe(lomba.deskripsi)}</p>` : ''}
          </div>
        </div>
        <div class="card-bottom">
          <div class="card-info-box">
            <div class="info-box-row"><span class="label"><i class="fa-regular fa-calendar" aria-hidden="true"></i> Batas pendaftaran</span><span class="deadline-value">${formatDateIndo(lomba.tanggalSelesai)}</span></div>
            <div class="info-box-row"><span class="label">Status pendaftaran</span><span class="countdown-badge ${regStatus.pillClass}"><i class="fa-solid ${regStatus.icon}" aria-hidden="true"></i> ${escapeHtml(regStatus.label)}</span></div>
          </div>
          <div class="card-actions">
            <button type="button" class="btn-card-detail" data-action="detail" data-id="${escapeHtml(lomba.id)}" aria-label="Lihat detail ${escapeHtml(lomba.judul)}">Lihat detail <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>
            <button type="button" class="btn-copy" data-action="share" data-id="${escapeHtml(lomba.id)}" title="Bagikan info lomba" aria-label="Bagikan ${escapeHtml(lomba.judul)}"><i class="fa-solid fa-arrow-up-from-bracket" aria-hidden="true"></i></button>
          </div>
        </div>
      `;

      const poster = card.querySelector('.card-poster img');
      poster.addEventListener('error', () => {
        poster.hidden = true;
        const fallback = document.createElement('span');
        fallback.className = 'poster-fallback';
        fallback.innerHTML = '<i class="fa-solid fa-trophy" aria-hidden="true"></i><span>Poster belum tersedia</span>';
        poster.parentElement.appendChild(fallback);
      }, { once: true });
      elements.lombaGrid.appendChild(card);
    });
  }

  // ========================================================================
  // 11. Card Event Delegation
  // ========================================================================
  elements.lombaGrid.addEventListener("click", (e) => {
    const posterEl = e.target.closest(".card-poster");
    if (posterEl) {
      e.stopPropagation();
      const id = posterEl.dataset.id;
      const lomba = allLomba.find(item => item.id === id);
      if (lomba && lomba.posterUrl) {
        openLightbox(lomba.posterUrl, lomba.judul);
      }
      return;
    }

    const btn = e.target.closest("button[data-action]");
    if (btn) {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const lomba = allLomba.find(item => item.id === id);
      if (!lomba) return;

      if (action === "detail") {
        openDetailModal(lomba);
      } else if (action === "bookmark") {
        toggleBookmark(id);
      } else if (action === "share") {
        shareLomba(lomba);
      }
      return;
    }

    // Mobile: tap judul/isi kartu juga membuka detail
    const cardContent = e.target.closest(".card-content");
    if (cardContent) {
      const card = cardContent.closest(".lomba-card");
      const detailBtn = card ? card.querySelector('button[data-action="detail"]') : null;
      if (detailBtn) {
        e.stopPropagation();
        const lomba = allLomba.find(item => item.id === detailBtn.dataset.id);
        if (lomba) openDetailModal(lomba);
      }
    }
  });

  // ========================================================================
  // 12. Bookmark & Share Handling
  // ========================================================================
  function toggleBookmark(id) {
    const lomba = allLomba.find(item => item.id === id);
    if (!lomba) return;

    if (favoriteIds.has(id)) {
      favoriteIds.delete(id);
      showToast(`"${lomba.judul.substring(0, 30)}..." dihapus dari tersimpan`, "info");
    } else {
      favoriteIds.add(id);
      showToast(`Berhasil menyimpan "${lomba.judul.substring(0, 30)}..."`, "success");
    }

    const focusedBookmark = document.activeElement?.matches('[data-action="bookmark"]');
    saveFavoritesData();
    renderLombaList();
    if (focusedBookmark) {
      const nextBookmark = Array.from(elements.lombaGrid.querySelectorAll('[data-action="bookmark"]')).find(button => button.dataset.id === id);
      (nextBookmark || elements.tabSavedLomba).focus({ preventScroll: true });
    }

    if (activeModalLombaId === id) updateModalBookmarkButton(id);
  }

  function shareLomba(lomba) {
    const feeText = Number(lomba.biaya) === 0 ? "Gratis" : `Rp ${Number(lomba.biaya).toLocaleString('id-ID')}`;
    const shareData = {
      title: lomba.judul,
      text: `Info Lomba: ${lomba.judul} oleh ${lomba.penyelenggara} (${lomba.kategori} - ${feeText}). Link pendaftaran: ${lomba.linkPendaftaran || window.location.href}`,
      url: window.location.href
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${lomba.judul} (${lomba.kategori}) - Info Lomba di Radian Ambis: ${window.location.href}`)
        .then(() => showToast("Tautan info lomba berhasil disalin ke clipboard!", "success"))
        .catch(() => showToast("Gagal menyalin tautan", "danger"));
    }
  }

  // ========================================================================
  // 13. Modal Dialog Logic (Detail Lomba)
  // ========================================================================
  function setupDialogLightDismissFallbacks(dialogs) {
    dialogs.forEach(dialog => {
      if (!dialog) return;
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) closeDialogSafe(dialog);
      });
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        const open = document.querySelector("dialog[open]");
        if (open) closeDialogSafe(open);
      }
    });
  }

  function openDetailModal(lomba) {
    if (!lomba) return;
    activeModalLombaId = lomba.id;
    const regStatus = calculateRegistrationStatus(lomba.tanggalMulai, lomba.tanggalSelesai);
    const feeNum = Number(lomba.biaya) || 0;

    elements.modalDetailTitle.textContent = lomba.judul;
    elements.modalDetailOrganizer.innerHTML = `<i class="fa-solid fa-building-columns"></i> ${escapeHtml(lomba.penyelenggara)}`;
    elements.modalDetailBiaya.innerHTML = formatFeeText(feeNum);

    elements.modalDetailBadges.innerHTML = `
      <span class="class-badge ${feeNum === 0 ? 'free' : 'paid'}">
        <i class="fa-solid ${feeNum === 0 ? 'fa-gift' : 'fa-ticket'}"></i> ${feeNum === 0 ? 'Gratis' : 'Rp ' + feeNum.toLocaleString('id-ID')}
      </span>
      <span class="class-badge">
        <i class="fa-solid ${getCategoryIcon(lomba.kategori)}"></i> ${escapeHtml(lomba.kategori)}
      </span>
    `;

    if (lomba.posterUrl) {
      elements.modalDetailPosterWrap.style.display = "flex";
      elements.modalDetailPosterImg.src = lomba.posterUrl;
      elements.modalDetailPosterImg.alt = `Poster lomba ${lomba.judul}`;
      elements.btnZoomModalPoster.onclick = () => openLightbox(lomba.posterUrl, lomba.judul);
    } else {
      elements.modalDetailPosterWrap.style.display = "none";
    }

    elements.modalDetailCountdown.innerHTML = `
      <span class="countdown-badge ${regStatus.pillClass}" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">
        <i class="fa-solid ${regStatus.icon}"></i> ${regStatus.label}
      </span>
    `;

    elements.modalDetailTglMulai.textContent = formatDateIndo(lomba.tanggalMulai);
    elements.modalDetailTglSelesai.textContent = formatDateIndo(lomba.tanggalSelesai);

    elements.modalDetailDesc.innerHTML = lomba.deskripsi
      ? linkifySafe(lomba.deskripsi).replace(/\n/g, "<br>")
      : "Informasi lebih lengkap dapat dilihat langsung pada tautan pendaftaran resmi.";

    elements.modalRegisterBtn.href = lomba.linkPendaftaran || "./";
    elements.modalRegisterBtn.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i> ${["upcoming", "closed"].includes(regStatus.status) ? "Lihat situs resmi" : "Daftar sekarang"}`;

    updateModalBookmarkButton(lomba.id);
    openDialogSafe(elements.detailModal);
  }

  function updateModalBookmarkButton(id) {
    const isBookmarked = favoriteIds.has(id);
    if (elements.modalBookmarkActionBtn) {
      elements.modalBookmarkActionBtn.innerHTML = `
        <i class="fa-${isBookmarked ? 'solid' : 'regular'} fa-bookmark"></i> ${isBookmarked ? 'Tersimpan' : 'Simpan Lomba'}
      `;
      elements.modalBookmarkActionBtn.classList.toggle("bookmarked", isBookmarked);
    }
  }

  // ========================================================================
  // 14. Toast Notification Helper
  // ========================================================================
  function showToast(message, type = "info") {
    if (!elements.toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let iconClass = "fa-circle-info";
    if (type === "success") iconClass = "fa-circle-check";
    if (type === "danger") iconClass = "fa-circle-exclamation";

    toast.innerHTML = `
      <i class="fa-solid ${iconClass}"></i>
      <span>${escapeHtml(message)}</span>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(12px) scale(0.95)";
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 250);
    }, 3500);
  }

  // ========================================================================
  // 15. Event Listeners Setup
  // ========================================================================
  function setupEventListeners() {
    if (elements.themeToggleBtn) elements.themeToggleBtn.addEventListener("click", toggleTheme);

    if (elements.heroSearchInput) {
      elements.heroSearchInput.addEventListener("input", (e) => {
        filterState.search = e.target.value;
        renderLombaList();
      });
    }

    if (elements.clearSearchBtn) {
      elements.clearSearchBtn.addEventListener("click", () => {
        if (elements.heroSearchInput) {
          elements.heroSearchInput.value = "";
          filterState.search = "";
          renderLombaList();
          elements.heroSearchInput.focus();
        }
      });
    }

    if (elements.closeLightboxBtn) {
      elements.closeLightboxBtn.addEventListener("click", () => closeDialogSafe(elements.lightboxModal));
    }

    if (elements.filterKategoriSelect) {
      elements.filterKategoriSelect.addEventListener("change", (e) => {
        filterState.category = e.target.value;
        renderLombaList();
      });
    }

    elements.feePills.forEach(button => {
      button.addEventListener("click", () => {
        filterState.biaya = filterState.biaya === button.dataset.fee ? "semua" : button.dataset.fee;
        updateFeePills();
        renderLombaList();
      });
    });

    if (elements.filterStatus) {
      elements.filterStatus.addEventListener("change", (e) => {
        filterState.status = e.target.value;
        renderLombaList();
      });
    }

    if (elements.sortBySelect) {
      elements.sortBySelect.addEventListener("change", (e) => {
        filterState.sortBy = e.target.value;
        renderLombaList();
      });
    }

    if (elements.resetFiltersBtn) elements.resetFiltersBtn.addEventListener("click", resetAllFilters);

    if (elements.tabAllLomba) elements.tabAllLomba.addEventListener("click", () => switchTab("all"));
    if (elements.tabSavedLomba) elements.tabSavedLomba.addEventListener("click", () => switchTab("saved"));

    if (elements.closeDetailModalBtn) {
      elements.closeDetailModalBtn.addEventListener("click", () => closeDialogSafe(elements.detailModal));
    }

    if (elements.modalBookmarkActionBtn) {
      elements.modalBookmarkActionBtn.addEventListener("click", () => {
        if (activeModalLombaId) toggleBookmark(activeModalLombaId);
      });
    }
  }

  function switchTab(tab) {
    currentTab = tab;
    elements.tabAllLomba.setAttribute("aria-pressed", String(tab === "all"));
    elements.tabSavedLomba.setAttribute("aria-pressed", String(tab === "saved"));
    if (tab === "all") {
      elements.tabAllLomba.classList.add("active");
      elements.tabSavedLomba.classList.remove("active");
    } else {
      elements.tabSavedLomba.classList.add("active");
      elements.tabAllLomba.classList.remove("active");
    }
    renderLombaList();
  }

  function resetAllFilters() {
    filterState.search = "";
    filterState.category = "semua";
    filterState.biaya = "semua";
    filterState.status = "semua";
    filterState.sortBy = "deadline-asc";

    if (elements.heroSearchInput) elements.heroSearchInput.value = "";
    if (elements.filterKategoriSelect) elements.filterKategoriSelect.value = "semua";
    updateFeePills();
    if (elements.filterStatus) elements.filterStatus.value = "semua";
    if (elements.sortBySelect) elements.sortBySelect.value = "deadline-asc";

    renderLombaList();
    showToast("Filter berhasil diatur ulang", "info");
  }

  function updateFeePills() {
    elements.feePills.forEach(button => {
      const selected = button.dataset.fee === filterState.biaya;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  // ========================================================================
  // 16. Utility Helpers
  // ========================================================================
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Escape dulu, lalu linkify URL -> <a> aman (cegah XSS).
  function linkifySafe(str) {
    const escaped = escapeHtml(str);
    return escaped.replace(
      /(https?:\/\/[^\s<>"']+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
  }
});
