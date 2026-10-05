/**
 * Matek Ambis - Portal Informasi Lomba & Olimpiade
 * Core Application Logic (App.js)
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

  const ADMIN_PIN = "admin123";
  let isAdmin = sessionStorage.getItem("matek_ambis_admin") === "true";

  // Load custom/initial data from LocalStorage
  let customCategories = loadCategories();
  let allLomba = loadLombaData();
  let favoriteIds = new Set(loadFavoritesData());
  let currentTab = "all"; // 'all' | 'saved'
  let activeModalLombaId = null;
  let currentPosterDataUrl = "";

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

    // Admin Controls
    adminTopBar: document.getElementById("adminTopBar"),
    adminAddLombaBtn: document.getElementById("adminAddLombaBtn"),
    adminLogoutBtn: document.getElementById("adminLogoutBtn"),
    adminPinModal: document.getElementById("adminPinModal"),
    adminPinForm: document.getElementById("adminPinForm"),
    adminPinInput: document.getElementById("adminPinInput"),
    pinErrorMsg: document.getElementById("pinErrorMsg"),
    closePinModalBtn: document.getElementById("closePinModalBtn"),
    cancelPinBtn: document.getElementById("cancelPinBtn"),

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

    // Submit / Edit Modal
    submitModal: document.getElementById("submitModal"),
    modalSubmitTitle: document.getElementById("modalSubmitTitle"),
    closeSubmitModalBtn: document.getElementById("closeSubmitModalBtn"),
    cancelSubmitBtn: document.getElementById("cancelSubmitBtn"),
    submitLombaForm: document.getElementById("submitLombaForm"),
    submitFormBtn: document.getElementById("submitFormBtn"),
    formLombaId: document.getElementById("formLombaId"),
    formJudul: document.getElementById("formJudul"),
    formPenyelenggara: document.getElementById("formPenyelenggara"),
    formKategori: document.getElementById("formKategori"),
    formKategoriCustomWrap: document.getElementById("formKategoriCustomWrap"),
    formKategoriCustom: document.getElementById("formKategoriCustom"),
    formPosterFile: document.getElementById("formPosterFile"),
    formPosterUrl: document.getElementById("formPosterUrl"),
    formPosterPreviewBox: document.getElementById("formPosterPreviewBox"),
    formPosterPreviewImg: document.getElementById("formPosterPreviewImg"),
    removePosterBtn: document.getElementById("removePosterBtn"),
    formLinkDaftar: document.getElementById("formLinkDaftar"),
    formTanggalMulai: document.getElementById("formTanggalMulai"),
    formTanggalSelesai: document.getElementById("formTanggalSelesai"),
    formBiayaNominal: document.getElementById("formBiayaNominal"),
    formDeskripsi: document.getElementById("formDeskripsi"),

    // Toast Container
    toastContainer: document.getElementById("toastContainer")
  };

  // ========================================================================
  // 3. Initialization
  // ========================================================================
  initTheme();
  setupDialogLightDismissFallbacks([
    elements.detailModal,
    elements.submitModal,
    elements.adminPinModal,
    elements.lightboxModal
  ]);
  syncCategoriesWithLomba();
  renderFilterCategoryOptions();
  renderFormCategoryOptions();
  checkAdminHashRoute();
  renderLombaList();
  setupEventListeners();

  // ========================================================================
  // 4. Data Loading & Persistence
  // ========================================================================
  function loadCategories() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
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
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(cats));
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
    if (changed) {
      saveCategories(customCategories);
    }
  }

  function loadLombaData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LOMBA_DATA);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If stored data has tanggalSelesai, use it
          if (parsed[0].tanggalSelesai) return parsed;
        }
      }
    } catch (e) {
      console.warn("Gagal memuat data dari localStorage:", e);
    }
    return [...DEFAULT_LOMBA];
  }

  function saveLombaData() {
    try {
      localStorage.setItem(STORAGE_KEYS.LOMBA_DATA, JSON.stringify(allLomba));
    } catch (e) {
      console.error("Gagal menyimpan data lomba ke localStorage:", e);
    }
  }

  function loadFavoritesData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FAVORITES);
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
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(Array.from(favoriteIds)));
    } catch (e) {
      console.error("Gagal menyimpan data favorit:", e);
    }
  }

  // ========================================================================
  // 5. Theme Toggling (Tanpa Notifikasi Toast)
  // ========================================================================
  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 
      (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(savedTheme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
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
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    // Notifikasi toast telah dimatikan sesuai permintaan user
  }

  // ========================================================================
  // 6. Admin Authentication & Hash Routing (#admin)
  // ========================================================================
  function checkAdminHashRoute() {
    const hash = window.location.hash.toLowerCase();
    if (hash === "#admin") {
      if (isAdmin) {
        if (elements.adminTopBar) elements.adminTopBar.style.display = "block";
      } else {
        if (elements.adminPinInput) elements.adminPinInput.value = "";
        if (elements.pinErrorMsg) elements.pinErrorMsg.style.display = "none";
        if (elements.adminPinModal) {
          elements.adminPinModal.showModal();
          setTimeout(() => elements.adminPinInput && elements.adminPinInput.focus(), 100);
        }
      }
    } else {
      if (elements.adminTopBar) {
        elements.adminTopBar.style.display = isAdmin ? "block" : "none";
      }
    }
  }

  function handleAdminPinSubmit(e) {
    e.preventDefault();
    const enteredPin = elements.adminPinInput.value.trim();

    if (enteredPin === ADMIN_PIN) {
      isAdmin = true;
      sessionStorage.setItem("matek_ambis_admin", "true");
      if (elements.pinErrorMsg) elements.pinErrorMsg.style.display = "none";
      elements.adminPinModal.close();
      if (elements.adminTopBar) elements.adminTopBar.style.display = "block";
      renderLombaList();
      showToast("Selamat datang, Administrator!", "success");
    } else {
      if (elements.pinErrorMsg) {
        elements.pinErrorMsg.style.display = "block";
        elements.pinErrorMsg.textContent = "PIN salah. Coba lagi (default: admin123)";
      }
      elements.adminPinInput.select();
    }
  }

  function logoutAdmin() {
    isAdmin = false;
    sessionStorage.removeItem("matek_ambis_admin");
    if (window.location.hash.toLowerCase() === "#admin") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    if (elements.adminTopBar) elements.adminTopBar.style.display = "none";
    renderLombaList();
    showToast("Berhasil keluar dari Mode Administrator", "info");
  }

  // ========================================================================
  // 7. Lightbox Poster Preview
  // ========================================================================
  function openLightbox(imageUrl, title = "Poster Lomba") {
    if (!elements.lightboxModal || !imageUrl) return;
    elements.lightboxImg.src = imageUrl;
    elements.lightboxTitle.textContent = title;
    elements.lightboxDownloadBtn.href = imageUrl;
    elements.lightboxModal.showModal();
  }

  // ========================================================================
  // 8. Category dropdowns
  // ========================================================================
  function getCategoryIcon(catName) {
    const lower = catName.toLowerCase();
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

  function renderFormCategoryOptions() {
    if (!elements.formKategori) return;
    elements.formKategori.innerHTML = "";
    customCategories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      elements.formKategori.appendChild(opt);
    });
    const customOpt = document.createElement("option");
    customOpt.value = "__custom__";
    customOpt.textContent = "+ Tambah Kategori Sendiri...";
    elements.formKategori.appendChild(customOpt);
  }

  // ========================================================================
  // 9. Time, Date, & Fee Helpers
  // ========================================================================
  function formatDateIndo(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function formatDateRange(startStr, endStr) {
    if (!startStr && !endStr) return "-";
    if (!startStr) return formatDateIndo(endStr);
    if (!endStr) return formatDateIndo(startStr);

    const s = new Date(startStr);
    const e = new Date(endStr);

    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
      return `${startStr} - ${endStr}`;
    }

    const sDay = s.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    const eDay = e.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    return `${sDay} - ${eDay}`;
  }

  function calculateRegistrationStatus(startStr, endStr) {
    const now = new Date();
    const end = new Date(`${endStr}T23:59:59`);
    const start = startStr ? new Date(`${startStr}T00:00:00`) : null;

    if (start && now < start) {
      return {
        status: "upcoming",
        label: `Buka ${formatDateIndo(startStr)}`,
        pillClass: "safe",
        icon: "fa-calendar"
      };
    }

    const diffMs = end - now;
    if (diffMs <= 0) {
      return {
        status: "closed",
        label: "Pendaftaran Ditutup",
        pillClass: "closed",
        icon: "fa-ban"
      };
    }

    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) {
      return {
        status: "urgent",
        label: "Berakhir Hari Ini!",
        pillClass: "urgent",
        icon: "fa-fire"
      };
    } else if (diffDays <= 7) {
      return {
        status: "urgent",
        label: `Tersisa ${diffDays} Hari`,
        pillClass: "urgent",
        icon: "fa-triangle-exclamation"
      };
    } else {
      return {
        status: "safe",
        label: `Tersisa ${diffDays} Hari`,
        pillClass: "safe",
        icon: "fa-clock"
      };
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
      // Tab filter (Semua vs Tersimpan)
      if (currentTab === "saved" && !favoriteIds.has(lomba.id)) {
        return false;
      }

      // Category filter
      if (filterState.category !== "semua" && lomba.kategori !== filterState.category) {
        return false;
      }

      // Search keyword filter (judul, penyelenggara, kategori)
      if (filterState.search.trim() !== "") {
        const query = filterState.search.toLowerCase().trim();
        const matchTitle = (lomba.judul || "").toLowerCase().includes(query);
        const matchOrg = (lomba.penyelenggara || "").toLowerCase().includes(query);
        const matchCat = (lomba.kategori || "").toLowerCase().includes(query);
        const matchDesc = (lomba.deskripsi || "").toLowerCase().includes(query);
        if (!matchTitle && !matchOrg && !matchCat && !matchDesc) return false;
      }

      // Biaya filter
      const feeNum = Number(lomba.biaya) || 0;
      if (filterState.biaya === "gratis" && feeNum > 0) return false;
      if (filterState.biaya === "berbayar" && feeNum === 0) return false;

      // Status filter
      if (filterState.status !== "semua") {
        const regStatus = calculateRegistrationStatus(lomba.tanggalMulai, lomba.tanggalSelesai);
        if (filterState.status === "aktif" && !["safe", "urgent"].includes(regStatus.status)) return false;
        if (filterState.status === "upcoming" && regStatus.status !== "upcoming") return false;
        if (filterState.status === "urgent" && regStatus.status !== "urgent") return false;
        if (filterState.status === "selesai" && regStatus.status !== "closed") return false;
      }

      return true;
    });

    // Sorting
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

    // Update Result Counters
    elements.resultsBadge.textContent = `${list.length} kompetisi${currentTab === "saved" ? " tersimpan" : " ditemukan"}`;
    elements.savedCountBadge.textContent = favoriteIds.size;
    elements.resetFiltersBtn.disabled = !filterState.search && filterState.category === "semua" && filterState.biaya === "semua" && filterState.status === "semua" && filterState.sortBy === "deadline-asc";

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
      const posterSrc = lomba.posterUrl || "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80";

      const card = document.createElement("article");
      card.className = "lomba-card";
      card.innerHTML = `
        <div>
          <div class="card-visual">
            <button type="button" class="card-poster" data-action="preview-poster" data-id="${escapeHtml(lomba.id)}" aria-label="Perbesar poster ${escapeHtml(lomba.judul)}">
              <img src="${escapeHtml(posterSrc)}" alt="Poster ${escapeHtml(lomba.judul)}" loading="lazy">
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
            ${lomba.deskripsi ? `<p class="card-summary">${escapeHtml(lomba.deskripsi)}</p>` : ''}
          </div>
        </div>
        <div class="card-bottom">
          <div class="card-info-box">
            <div class="info-box-row"><span class="label"><i class="fa-regular fa-calendar" aria-hidden="true"></i> Batas pendaftaran</span><span class="deadline-value">${formatDateIndo(lomba.tanggalSelesai)}</span></div>
            <div class="info-box-row"><span class="label">Status pendaftaran</span><span class="countdown-badge ${regStatus.pillClass}"><i class="fa-solid ${regStatus.icon}" aria-hidden="true"></i> ${regStatus.label}</span></div>
          </div>
          <div class="card-actions">
            <button type="button" class="btn-card-detail" data-action="detail" data-id="${escapeHtml(lomba.id)}">Lihat detail <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>
            <button type="button" class="btn-copy" data-action="share" data-id="${escapeHtml(lomba.id)}" title="Bagikan info lomba" aria-label="Bagikan ${escapeHtml(lomba.judul)}"><i class="fa-solid fa-arrow-up-from-bracket" aria-hidden="true"></i></button>
          </div>

          ${isAdmin ? `
            <!-- Admin Controls on Card -->
            <div class="admin-card-actions">
              <button type="button" class="btn-admin-edit" data-action="edit" data-id="${lomba.id}" title="Edit Data Lomba">
                <i class="fa-solid fa-pen-to-square"></i> Edit
              </button>
              <button type="button" class="btn-admin-delete" data-action="delete" data-id="${lomba.id}" title="Hapus Lomba">
                <i class="fa-solid fa-trash-can"></i> Hapus
              </button>
            </div>
          ` : ''}
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
    // Check if clicked on poster thumbnail
    const posterEl = e.target.closest(".card-poster");
    if (posterEl) {
      const id = posterEl.dataset.id;
      const lomba = allLomba.find(item => item.id === id);
      if (lomba && lomba.posterUrl) {
        openLightbox(lomba.posterUrl, lomba.judul);
      }
      return;
    }

    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

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
    } else if (action === "edit") {
      openEditModal(lomba);
    } else if (action === "delete") {
      handleDeleteLomba(lomba);
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

    if (activeModalLombaId === id) {
      updateModalBookmarkButton(id);
    }
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
        .then(() => {
          showToast("Tautan info lomba berhasil disalin ke clipboard!", "success");
        })
        .catch(() => {
          showToast("Gagal menyalin tautan", "danger");
        });
    }
  }

  // ========================================================================
  // 13. Modal Dialog Logic (Detail Lomba)
  // ========================================================================
  function setupDialogLightDismissFallbacks(dialogs) {
    dialogs.forEach(dialog => {
      if (!dialog) return;

      if (!("closedBy" in HTMLDialogElement.prototype)) {
        dialog.addEventListener("click", (event) => {
          if (event.target !== dialog) return;

          const rect = dialog.getBoundingClientRect();
          const isDialogContent = (
            rect.top <= event.clientY &&
            event.clientY <= rect.top + rect.height &&
            rect.left <= event.clientX &&
            event.clientX <= rect.width + rect.left
          );

          if (!isDialogContent) {
            dialog.close();
          }
        });
      }
    });
  }

  function openDetailModal(lomba) {
    activeModalLombaId = lomba.id;
    const regStatus = calculateRegistrationStatus(lomba.tanggalMulai, lomba.tanggalSelesai);
    const feeNum = Number(lomba.biaya) || 0;

    // Header Info
    elements.modalDetailTitle.textContent = lomba.judul;
    elements.modalDetailOrganizer.innerHTML = `<i class="fa-solid fa-building-columns"></i> ${escapeHtml(lomba.penyelenggara)}`;
    elements.modalDetailBiaya.innerHTML = formatFeeText(feeNum);

    // Badges
    elements.modalDetailBadges.innerHTML = `
      <span class="class-badge ${feeNum === 0 ? 'free' : 'paid'}">
        <i class="fa-solid ${feeNum === 0 ? 'fa-gift' : 'fa-ticket'}"></i> ${feeNum === 0 ? 'Gratis' : 'Rp ' + feeNum.toLocaleString('id-ID')}
      </span>
      <span class="class-badge">
        <i class="fa-solid ${getCategoryIcon(lomba.kategori)}"></i> ${escapeHtml(lomba.kategori)}
      </span>
    `;

    // Poster Preview in Modal
    if (lomba.posterUrl) {
      elements.modalDetailPosterWrap.style.display = "flex";
      elements.modalDetailPosterImg.src = lomba.posterUrl;
      elements.btnZoomModalPoster.onclick = () => openLightbox(lomba.posterUrl, lomba.judul);
    } else {
      elements.modalDetailPosterWrap.style.display = "none";
    }

    // Countdown Badge
    elements.modalDetailCountdown.innerHTML = `
      <span class="countdown-badge ${regStatus.pillClass}" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">
        <i class="fa-solid ${regStatus.icon}"></i> ${regStatus.label}
      </span>
    `;

    // Dates
    elements.modalDetailTglMulai.textContent = formatDateIndo(lomba.tanggalMulai);
    elements.modalDetailTglSelesai.textContent = formatDateIndo(lomba.tanggalSelesai);

    // Description
    elements.modalDetailDesc.textContent = lomba.deskripsi || "Informasi lebih lengkap dapat dilihat langsung pada tautan pendaftaran resmi.";

    // Action Links
    elements.modalRegisterBtn.href = lomba.linkPendaftaran || "#";
    elements.modalRegisterBtn.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i> ${["upcoming", "closed"].includes(regStatus.status) ? "Lihat situs resmi" : "Daftar sekarang"}`;

    updateModalBookmarkButton(lomba.id);
    elements.detailModal.showModal();
  }

  function updateModalBookmarkButton(id) {
    const isBookmarked = favoriteIds.has(id);
    if (elements.modalBookmarkActionBtn) {
      elements.modalBookmarkActionBtn.innerHTML = `
        <i class="fa-${isBookmarked ? 'solid' : 'regular'} fa-bookmark"></i> ${isBookmarked ? 'Tersimpan' : 'Simpan Lomba'}
      `;
      if (isBookmarked) {
        elements.modalBookmarkActionBtn.classList.add("bookmarked");
      } else {
        elements.modalBookmarkActionBtn.classList.remove("bookmarked");
      }
    }
  }

  // ========================================================================
  // 14. Admin CRUD Operations (Tambah, Edit, Hapus)
  // ========================================================================
  function showFormPosterPreview(src) {
    if (src) {
      elements.formPosterPreviewImg.src = src;
      elements.formPosterPreviewBox.style.display = "block";
    } else {
      elements.formPosterPreviewBox.style.display = "none";
    }
  }

  function openCreateModal() {
    renderFormCategoryOptions();
    elements.submitLombaForm.reset();
    elements.formLombaId.value = "";
    elements.modalSubmitTitle.textContent = "Tambah Informasi Lomba";
    elements.submitFormBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Lomba';
    currentPosterDataUrl = "";
    showFormPosterPreview("");

    elements.formKategoriCustomWrap.style.display = "none";
    elements.formKategoriCustom.value = "";
    elements.formBiayaNominal.value = "0";

    const todayStr = new Date().toISOString().split("T")[0];
    if (elements.formTanggalMulai) elements.formTanggalMulai.value = todayStr;
    if (elements.formTanggalSelesai) elements.formTanggalSelesai.min = todayStr;

    elements.submitModal.showModal();
  }

  function openEditModal(lomba) {
    renderFormCategoryOptions();
    elements.submitLombaForm.reset();
    elements.formLombaId.value = lomba.id;
    elements.modalSubmitTitle.textContent = "Edit Informasi Lomba";
    elements.submitFormBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan';

    elements.formJudul.value = lomba.judul || "";
    elements.formPenyelenggara.value = lomba.penyelenggara || "";
    
    // Category select check
    if (customCategories.includes(lomba.kategori)) {
      elements.formKategori.value = lomba.kategori;
      elements.formKategoriCustomWrap.style.display = "none";
      elements.formKategoriCustom.value = "";
    } else {
      elements.formKategori.value = "__custom__";
      elements.formKategoriCustomWrap.style.display = "block";
      elements.formKategoriCustom.value = lomba.kategori || "";
    }

    elements.formLinkDaftar.value = lomba.linkPendaftaran || "";
    elements.formTanggalMulai.value = lomba.tanggalMulai || "";
    elements.formTanggalSelesai.value = lomba.tanggalSelesai || "";
    elements.formBiayaNominal.value = lomba.biaya !== undefined ? lomba.biaya : 0;
    elements.formDeskripsi.value = lomba.deskripsi || "";

    currentPosterDataUrl = lomba.posterUrl || "";
    if (currentPosterDataUrl.startsWith("http")) {
      elements.formPosterUrl.value = currentPosterDataUrl;
    }
    showFormPosterPreview(currentPosterDataUrl);

    elements.submitModal.showModal();
  }

  function handleDeleteLomba(lomba) {
    const isConfirmed = confirm(`Apakah Anda yakin ingin menghapus lomba "${lomba.judul}"? Tindakan ini tidak dapat dibatalkan.`);
    if (!isConfirmed) return;

    allLomba = allLomba.filter(item => item.id !== lomba.id);
    favoriteIds.delete(lomba.id);
    saveLombaData();
    saveFavoritesData();
    renderLombaList();
    showToast(`Lomba "${lomba.judul.substring(0, 25)}..." berhasil dihapus`, "info");
  }

  function handleFormSubmit(e) {
    e.preventDefault();

    const editId = elements.formLombaId.value.trim();
    const judul = elements.formJudul.value.trim();
    const penyelenggara = elements.formPenyelenggara.value.trim();
    let kategori = elements.formKategori.value;

    // Handle custom category
    if (kategori === "__custom__") {
      const customVal = elements.formKategoriCustom.value.trim();
      if (!customVal) {
        showToast("Harap masukkan nama kategori baru!", "danger");
        elements.formKategoriCustom.focus();
        return;
      }
      kategori = customVal;
      if (!customCategories.includes(kategori)) {
        customCategories.push(kategori);
        saveCategories(customCategories);
        renderFilterCategoryOptions();
      }
    }

    const linkPendaftaran = elements.formLinkDaftar.value.trim();
    const tanggalMulai = elements.formTanggalMulai.value;
    const tanggalSelesai = elements.formTanggalSelesai.value;
    const biaya = parseInt(elements.formBiayaNominal.value, 10) || 0;
    const deskripsi = elements.formDeskripsi.value.trim();

    if (!judul || !penyelenggara || !tanggalMulai || !tanggalSelesai || !linkPendaftaran) {
      showToast("Harap isi semua kolom wajib bertanda bintang (*)", "danger");
      return;
    }

    const posterUrlToSave = currentPosterDataUrl || "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80";

    if (editId) {
      // Edit existing
      const existingIdx = allLomba.findIndex(item => item.id === editId);
      if (existingIdx !== -1) {
        allLomba[existingIdx] = {
          ...allLomba[existingIdx],
          judul,
          penyelenggara,
          kategori,
          posterUrl: posterUrlToSave,
          linkPendaftaran,
          tanggalMulai,
          tanggalSelesai,
          biaya,
          deskripsi
        };
        showToast("Perubahan informasi lomba berhasil disimpan!", "success");
      }
    } else {
      // Create new
      const newLomba = {
        id: `lomba-custom-${Date.now()}`,
        judul,
        penyelenggara,
        kategori,
        posterUrl: posterUrlToSave,
        linkPendaftaran,
        tanggalMulai,
        tanggalSelesai,
        biaya,
        deskripsi
      };
      allLomba.unshift(newLomba);
      showToast("Lomba baru berhasil dipublikasikan!", "success");
    }

    saveLombaData();
    renderLombaList();

    elements.submitLombaForm.reset();
    elements.submitModal.close();
  }

  // ========================================================================
  // 15. Toast Notification Helper
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
  // 16. Event Listeners Setup
  // ========================================================================
  function setupEventListeners() {
    // Theme toggle (NO TOAST)
    if (elements.themeToggleBtn) {
      elements.themeToggleBtn.addEventListener("click", toggleTheme);
    }

    // Search Input & Clear
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

    // Keyboard shortcut '/' to focus search input
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !document.querySelector("dialog[open]") && !document.activeElement?.isContentEditable && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        if (elements.heroSearchInput) {
          elements.heroSearchInput.focus();
        }
      }
    });

    // Hash change listener for #admin
    window.addEventListener("hashchange", checkAdminHashRoute);

    // Admin PIN Form
    if (elements.adminPinForm) {
      elements.adminPinForm.addEventListener("submit", handleAdminPinSubmit);
    }

    if (elements.closePinModalBtn) {
      elements.closePinModalBtn.addEventListener("click", () => elements.adminPinModal.close());
    }

    if (elements.cancelPinBtn) {
      elements.cancelPinBtn.addEventListener("click", () => elements.adminPinModal.close());
    }

    // Admin Bar buttons
    if (elements.adminAddLombaBtn) {
      elements.adminAddLombaBtn.addEventListener("click", openCreateModal);
    }

    if (elements.adminLogoutBtn) {
      elements.adminLogoutBtn.addEventListener("click", logoutAdmin);
    }

    // Lightbox Modal
    if (elements.closeLightboxBtn) {
      elements.closeLightboxBtn.addEventListener("click", () => elements.lightboxModal.close());
    }

    // Form Category custom toggle
    if (elements.formKategori) {
      elements.formKategori.addEventListener("change", (e) => {
        if (e.target.value === "__custom__") {
          elements.formKategoriCustomWrap.style.display = "block";
          elements.formKategoriCustom.focus();
        } else {
          elements.formKategoriCustomWrap.style.display = "none";
          elements.formKategoriCustom.value = "";
        }
      });
    }

    // Poster file input
    if (elements.formPosterFile) {
      elements.formPosterFile.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          if (file.size > 3 * 1024 * 1024) {
            showToast("Ukuran file terlalu besar (maksimal 3MB)", "danger");
            elements.formPosterFile.value = "";
            return;
          }
          const reader = new FileReader();
          reader.onload = (event) => {
            currentPosterDataUrl = event.target.result;
            showFormPosterPreview(currentPosterDataUrl);
            if (elements.formPosterUrl) elements.formPosterUrl.value = "";
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Poster URL input
    if (elements.formPosterUrl) {
      elements.formPosterUrl.addEventListener("input", (e) => {
        const val = e.target.value.trim();
        if (val) {
          currentPosterDataUrl = val;
          showFormPosterPreview(currentPosterDataUrl);
          if (elements.formPosterFile) elements.formPosterFile.value = "";
        }
      });
    }

    // Remove Poster button in form
    if (elements.removePosterBtn) {
      elements.removePosterBtn.addEventListener("click", () => {
        currentPosterDataUrl = "";
        if (elements.formPosterFile) elements.formPosterFile.value = "";
        if (elements.formPosterUrl) elements.formPosterUrl.value = "";
        showFormPosterPreview("");
      });
    }

    // Filter Kategori Dropdown
    if (elements.filterKategoriSelect) {
      elements.filterKategoriSelect.addEventListener("change", (e) => {
        filterState.category = e.target.value;
        renderLombaList();
      });
    }

    // Pilihan biaya: tombol yang aktif dapat ditekan lagi untuk menampilkan semuanya.
    elements.feePills.forEach(button => {
      button.addEventListener("click", () => {
        filterState.biaya = filterState.biaya === button.dataset.fee ? "semua" : button.dataset.fee;
        updateFeePills();
        renderLombaList();
      });
    });

    // Status Filter
    if (elements.filterStatus) {
      elements.filterStatus.addEventListener("change", (e) => {
        filterState.status = e.target.value;
        renderLombaList();
      });
    }

    // Sort Dropdown
    if (elements.sortBySelect) {
      elements.sortBySelect.addEventListener("change", (e) => {
        filterState.sortBy = e.target.value;
        renderLombaList();
      });
    }

    // Reset filters
    if (elements.resetFiltersBtn) {
      elements.resetFiltersBtn.addEventListener("click", resetAllFilters);
    }

    // Tabs: All vs Saved
    if (elements.tabAllLomba) {
      elements.tabAllLomba.addEventListener("click", () => switchTab("all"));
    }

    if (elements.tabSavedLomba) {
      elements.tabSavedLomba.addEventListener("click", () => switchTab("saved"));
    }

    // Detail Modal Actions
    if (elements.closeDetailModalBtn) {
      elements.closeDetailModalBtn.addEventListener("click", () => elements.detailModal.close());
    }

    if (elements.modalBookmarkActionBtn) {
      elements.modalBookmarkActionBtn.addEventListener("click", () => {
        if (activeModalLombaId) {
          toggleBookmark(activeModalLombaId);
        }
      });
    }

    // Submit Modal Actions
    if (elements.closeSubmitModalBtn) {
      elements.closeSubmitModalBtn.addEventListener("click", () => elements.submitModal.close());
    }

    if (elements.cancelSubmitBtn) {
      elements.cancelSubmitBtn.addEventListener("click", () => elements.submitModal.close());
    }

    if (elements.submitLombaForm) {
      elements.submitLombaForm.addEventListener("submit", handleFormSubmit);
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
  // 17. Utility Helpers
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
});
