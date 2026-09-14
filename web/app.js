/**
 * Ta-akad (تأكد | TAAKAD) - Web Application Client Logic
 * Complete Multi-Format Engine: Images (JPG/PNG), Documents (PDF), Word (DOCX)
 * Pixel-Accurate Redaction Studio & PDF Exporter
 * Zero Emojis - Pure Vector & Cyber UI
 */

// =============================================
// APPLICATION STATE
// =============================================
const state = {
  currentStep: 1,

  // Active page state
  image: null,
  originalDataUrl: null,
  imageWidth: 0,
  imageHeight: 0,
  detections: [],
  selectedItemId: null,
  summaryArabic: '',
  isSafeOverall: false,
  isDrawingManual: false,

  // Multi-page Document Engine
  documentType: 'image', // 'image', 'pdf', 'docx'
  documentName: 'taakad_document',
  pages: [], // Array of { image, canvas, imageWidth, imageHeight, detections, summaryArabic, isSafeOverall }
  currentPageIndex: 0,

  // Redaction Studio Customization
  redactionMode: 'blackout', // 'blackout', 'blur', 'pixelate'
  showOriginal: false,
  blackoutColor: '#060A12',
  watermarkText: 'محمي بواسطة تأكد | TAAKAD',
  blurIntensity: 22,
  pixelateSize: 18,
  theme: 'dark',
};

// Canvas Interaction State (Drag, Resize, Draw)
const canvasState = {
  dragMode: null,
  dragItemId: null,
  startX: 0,
  startY: 0,
  initialBox: null,
  activeHandle: null,
};

// =============================================
// DOM ELEMENTS
// =============================================
const step1Screen = document.getElementById('step1Screen');
const step2Screen = document.getElementById('step2Screen');
const step3Screen = document.getElementById('step3Screen');

const nodeStep1 = document.getElementById('nodeStep1');
const nodeStep2 = document.getElementById('nodeStep2');
const nodeStep3 = document.getElementById('nodeStep3');
const line1 = document.getElementById('line1');
const line2 = document.getElementById('line2');

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

const analysisCanvas = document.getElementById('analysisCanvas');
const redactionCanvas = document.getElementById('redactionCanvas');

const detectionCardsList = document.getElementById('detectionCardsList');
const activeAdviceText = document.getElementById('activeAdviceText');
const detectionCountBadge = document.getElementById('detectionCountBadge');
const elementsToggleList = document.getElementById('elementsToggleList');
const selectedBoxHint = document.getElementById('selectedBoxHint');

const backToStep1Btn = document.getElementById('backToStep1Btn');
const backToStep2Btn = document.getElementById('backToStep2Btn');
const goToProtectBtn = document.getElementById('goToProtectBtn');

// Download & Share
const downloadProtectedPdfBtn = document.getElementById('downloadProtectedPdfBtn');
const downloadProtectedBtn = document.getElementById('downloadProtectedBtn');
const shareSafeBtn = document.getElementById('shareSafeBtn');
const toggleOriginalBtn = document.getElementById('toggleOriginalBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');

const drawManualBoxBtn = document.getElementById('drawManualBoxBtn');
const deleteSelectedBoxBtn = document.getElementById('deleteSelectedBoxBtn');

// Multi-page Navigation
const pdfPaginationBarStep2 = document.getElementById('pdfPaginationBarStep2');
const prevPageBtnStep2 = document.getElementById('prevPageBtnStep2');
const nextPageBtnStep2 = document.getElementById('nextPageBtnStep2');
const pageIndicatorStep2 = document.getElementById('pageIndicatorStep2');

const pdfPaginationBarStep3 = document.getElementById('pdfPaginationBarStep3');
const prevPageBtnStep3 = document.getElementById('prevPageBtnStep3');
const nextPageBtnStep3 = document.getElementById('nextPageBtnStep3');
const pageIndicatorStep3 = document.getElementById('pageIndicatorStep3');

// Studio subpanels & sliders
const blackoutControls = document.getElementById('blackoutControls');
const blurControls = document.getElementById('blurControls');
const pixelateControls = document.getElementById('pixelateControls');
const blurIntensitySlider = document.getElementById('blurIntensitySlider');
const blurValueDisplay = document.getElementById('blurValueDisplay');
const pixelateSizeSlider = document.getElementById('pixelateSizeSlider');
const pixelateValueDisplay = document.getElementById('pixelateValueDisplay');

// Realtime Timer & Modal
const scanningModal = document.getElementById('scanningModal');
const liveElapsedTimer = document.getElementById('liveElapsedTimer');
const scanStep1El = document.getElementById('scanStep1');
const scanStep2El = document.getElementById('scanStep2');
const scanStep3El = document.getElementById('scanStep3');

// Theme Switcher
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeToggleText = document.getElementById('themeToggleText');

// In-App Toast
const toastNotification = document.getElementById('toastNotification');
const toastMessage = document.getElementById('toastMessage');

let timerInterval = null;
let scanStartTime = 0;
let toastTimeout = null;

// =============================================
// TOAST NOTIFICATION
// =============================================
function showToast(message, durationMs) {
  if (!toastNotification || !toastMessage) return;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastMessage.textContent = message;
  toastNotification.classList.add('active');
  const dur = durationMs || 4000;
  toastTimeout = setTimeout(() => {
    toastNotification.classList.remove('active');
  }, dur);
}

// =============================================
// THEME SWITCHER (Light / Dark Mode)
// =============================================
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('taakad_theme', theme);
  if (themeToggleText) {
    themeToggleText.textContent = theme === 'dark' ? 'الوضع الصباحي' : 'الوضع الليلي';
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem('taakad_theme') || 'dark';
  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      showToast(nextTheme === 'dark' ? 'تم تفعيل الوضع الليلي' : 'تم تفعيل الوضع الصباحي');
    });
  }
}

// =============================================
// INITIALIZE
// =============================================
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupEventListeners();
  setupCustomizationStudio();
});

// =============================================
// EVENT LISTENERS
// =============================================
function setupEventListeners() {
  backToStep1Btn.addEventListener('click', () => switchStep(1));
  backToStep2Btn.addEventListener('click', () => switchStep(2));
  goToProtectBtn.addEventListener('click', () => {
    switchStep(3);
    renderRedactionCanvas();
    renderElementsToggleList();
  });

  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      state.detections.forEach((d) => (d.isSelectedForRedaction = true));
      renderRedactionCanvas();
      renderElementsToggleList();
      drawAnalysisCanvas();
      renderDetectionCards();
      showToast('تم تفعيل الحجب لجميع العناصر.');
    });
  }

  if (deselectAllBtn) {
    deselectAllBtn.addEventListener('click', () => {
      state.detections.forEach((d) => (d.isSelectedForRedaction = false));
      renderRedactionCanvas();
      renderElementsToggleList();
      drawAnalysisCanvas();
      renderDetectionCards();
      showToast('تم إلغاء تفعيل الحجب لجميع العناصر.');
    });
  }

  if (deleteSelectedBoxBtn) {
    deleteSelectedBoxBtn.addEventListener('click', () => {
      if (!state.selectedItemId) {
        showToast('يرجى تحديد صندوق من الصورة أولاً لحذفه.');
        return;
      }
      state.detections = state.detections.filter((d) => d.id !== state.selectedItemId);
      state.selectedItemId = null;
      updateSelectedBoxHint();
      drawAnalysisCanvas();
      renderDetectionCards();
      showToast('تم حذف الصندوق بنجاح.');
    });
  }

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  if (drawManualBoxBtn) {
    drawManualBoxBtn.addEventListener('click', () => {
      state.isDrawingManual = !state.isDrawingManual;
      drawManualBoxBtn.classList.toggle('active', state.isDrawingManual);
      drawManualBoxBtn.querySelector('span').textContent = state.isDrawingManual ? 'إلغاء وضع الرسم' : 'رسم صندوق حجب جديد';
      analysisCanvas.style.cursor = state.isDrawingManual ? 'crosshair' : 'default';
    });
  }

  setupInteractiveCanvas();

  // Mode Selector pills (Blackout, Blur, Pixelate)
  document.querySelectorAll('.mode-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.redactionMode = btn.getAttribute('data-mode');
      updateStudioPanelsVisibility();
      renderRedactionCanvas();
    });
  });

  if (toggleOriginalBtn) {
    toggleOriginalBtn.addEventListener('click', () => {
      state.showOriginal = !state.showOriginal;
      toggleOriginalBtn.textContent = state.showOriginal ? 'استعراض المحمي' : 'استعراض الأصل';
      renderRedactionCanvas();
    });
  }

  // Export Buttons
  if (downloadProtectedPdfBtn) {
    downloadProtectedPdfBtn.addEventListener('click', () => {
      downloadProtectedPdf();
    });
  }

  if (downloadProtectedBtn) {
    downloadProtectedBtn.addEventListener('click', () => {
      downloadProtectedImage();
    });
  }

  if (shareSafeBtn) {
    shareSafeBtn.addEventListener('click', () => {
      shareSafeCopy();
    });
  }

  // Page Navigation Listeners
  if (prevPageBtnStep2) prevPageBtnStep2.addEventListener('click', () => switchPage(state.currentPageIndex - 1));
  if (nextPageBtnStep2) nextPageBtnStep2.addEventListener('click', () => switchPage(state.currentPageIndex + 1));
  if (prevPageBtnStep3) prevPageBtnStep3.addEventListener('click', () => switchPage(state.currentPageIndex - 1));
  if (nextPageBtnStep3) nextPageBtnStep3.addEventListener('click', () => switchPage(state.currentPageIndex + 1));
}

// =============================================
// CUSTOMIZATION STUDIO SETUP
// =============================================
function updateStudioPanelsVisibility() {
  if (blackoutControls) blackoutControls.style.display = state.redactionMode === 'blackout' ? 'flex' : 'none';
  if (blurControls) blurControls.style.display = state.redactionMode === 'blur' ? 'flex' : 'none';
  if (pixelateControls) pixelateControls.style.display = state.redactionMode === 'pixelate' ? 'flex' : 'none';
}

function setupCustomizationStudio() {
  updateStudioPanelsVisibility();

  // Color swatches
  document.querySelectorAll('.color-swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
      swatch.classList.add('active');
      state.blackoutColor = swatch.getAttribute('data-color');
      const customInput = document.getElementById('customColorInput');
      if (customInput) customInput.value = state.blackoutColor;
      renderRedactionCanvas();
    });
  });

  // Custom color picker
  const customColorInput = document.getElementById('customColorInput');
  if (customColorInput) {
    customColorInput.addEventListener('input', (e) => {
      state.blackoutColor = e.target.value;
      document.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'));
      renderRedactionCanvas();
    });
  }

  // Watermark presets
  document.querySelectorAll('.btn-preset-text').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-preset-text').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const txt = btn.getAttribute('data-text');
      state.watermarkText = txt === 'NONE' ? '' : txt;
      const customTextInput = document.getElementById('customWatermarkTextInput');
      if (customTextInput) customTextInput.value = '';
      renderRedactionCanvas();
    });
  });

  // Custom watermark text
  const applyCustomTextBtn = document.getElementById('applyCustomTextBtn');
  if (applyCustomTextBtn) {
    applyCustomTextBtn.addEventListener('click', () => {
      const input = document.getElementById('customWatermarkTextInput');
      if (input && input.value.trim()) {
        state.watermarkText = input.value.trim();
        document.querySelectorAll('.btn-preset-text').forEach((b) => b.classList.remove('active'));
        renderRedactionCanvas();
        showToast('تم تطبيق النص المخصص بنجاح.');
      } else {
        showToast('يرجى كتابة نص أولاً.');
      }
    });
  }

  const customWatermarkTextInput = document.getElementById('customWatermarkTextInput');
  if (customWatermarkTextInput) {
    customWatermarkTextInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (applyCustomTextBtn) applyCustomTextBtn.click();
      }
    });
  }

  // Blur Intensity Slider
  if (blurIntensitySlider) {
    blurIntensitySlider.addEventListener('input', (e) => {
      state.blurIntensity = parseInt(e.target.value, 10);
      if (blurValueDisplay) blurValueDisplay.textContent = state.blurIntensity + 'px';
      renderRedactionCanvas();
    });
  }

  // Pixelate Size Slider
  if (pixelateSizeSlider) {
    pixelateSizeSlider.addEventListener('input', (e) => {
      state.pixelateSize = parseInt(e.target.value, 10);
      if (pixelateValueDisplay) pixelateValueDisplay.textContent = state.pixelateSize + 'px';
      renderRedactionCanvas();
    });
  }
}

// =============================================
// REAL-TIME STOPWATCH TIMER
// =============================================
function startRealtimeTimer() {
  scanningModal.classList.add('active');
  scanStartTime = Date.now();
  liveElapsedTimer.textContent = '00:00.0';

  scanStep1El.className = 'scan-step-line active';
  scanStep2El.className = 'scan-step-line';
  scanStep3El.className = 'scan-step-line';

  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const elapsedMs = Date.now() - scanStartTime;
    const totalSec = elapsedMs / 1000;
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    const tenths = Math.floor((elapsedMs % 1000) / 100);

    liveElapsedTimer.textContent =
      String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0') + '.' + tenths;
  }, 80);
}

function advanceScanStep(step) {
  if (step >= 2) {
    scanStep1El.className = 'scan-step-line completed';
    scanStep2El.className = 'scan-step-line active';
  }
  if (step >= 3) {
    scanStep2El.className = 'scan-step-line completed';
    scanStep3El.className = 'scan-step-line active';
  }
}

function stopRealtimeTimer() {
  if (timerInterval) clearInterval(timerInterval);
  const elapsedMs = Date.now() - scanStartTime;
  const totalSec = elapsedMs / 1000;
  const mins = Math.floor(totalSec / 60);
  const secs = Math.floor(totalSec % 60);
  const tenths = Math.floor((elapsedMs % 1000) / 100);
  liveElapsedTimer.textContent =
    String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0') + '.' + tenths;

  scanStep1El.className = 'scan-step-line completed';
  scanStep2El.className = 'scan-step-line completed';
  scanStep3El.className = 'scan-step-line completed';

  setTimeout(() => {
    scanningModal.classList.remove('active');
  }, 350);
}

// =============================================
// STEP SWITCHING
// =============================================
function switchStep(step) {
  state.currentStep = step;

  step1Screen.classList.toggle('active', step === 1);
  step2Screen.classList.toggle('active', step === 2);
  step3Screen.classList.toggle('active', step === 3);

  nodeStep1.classList.toggle('active', step === 1);
  nodeStep1.classList.toggle('completed', step > 1);

  nodeStep2.classList.toggle('active', step === 2);
  nodeStep2.classList.toggle('completed', step > 2);

  nodeStep3.classList.toggle('active', step === 3);

  line1.classList.toggle('active', step >= 2);
  line2.classList.toggle('active', step >= 3);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =============================================
// MULTI-PAGE NAVIGATION CONTROLLER
// =============================================
function updatePageNavigators() {
  const isMulti = state.pages.length > 1;
  if (pdfPaginationBarStep2) pdfPaginationBarStep2.style.display = isMulti ? 'flex' : 'none';
  if (pdfPaginationBarStep3) pdfPaginationBarStep3.style.display = isMulti ? 'flex' : 'none';

  const text = `صفحة ${state.currentPageIndex + 1} من ${state.pages.length}`;
  if (pageIndicatorStep2) pageIndicatorStep2.textContent = text;
  if (pageIndicatorStep3) pageIndicatorStep3.textContent = text;

  const isFirst = state.currentPageIndex === 0;
  const isLast = state.currentPageIndex === state.pages.length - 1;

  if (prevPageBtnStep2) prevPageBtnStep2.disabled = isFirst;
  if (nextPageBtnStep2) nextPageBtnStep2.disabled = isLast;
  if (prevPageBtnStep3) prevPageBtnStep3.disabled = isFirst;
  if (nextPageBtnStep3) nextPageBtnStep3.disabled = isLast;
}

function switchPage(index) {
  if (index < 0 || index >= state.pages.length) return;

  // Persist current page detections before switching
  if (state.pages[state.currentPageIndex]) {
    state.pages[state.currentPageIndex].detections = state.detections;
    state.pages[state.currentPageIndex].summaryArabic = state.summaryArabic;
  }

  state.currentPageIndex = index;
  const page = state.pages[index];
  state.image = page.image;
  state.imageWidth = page.imageWidth;
  state.imageHeight = page.imageHeight;
  state.detections = page.detections || [];
  state.summaryArabic = page.summaryArabic || '';
  state.selectedItemId = null;

  updatePageNavigators();

  if (state.currentStep === 2) {
    renderAnalysisScreen();
  } else if (state.currentStep === 3) {
    renderRedactionCanvas();
    renderElementsToggleList();
  }
}

// =============================================
// CLIENT-SIDE IMAGE COMPRESSION (Max 1280px)
// =============================================
function compressImage(img, maxDimension = 1280, quality = 0.85) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  if (w <= maxDimension && h <= maxDimension) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0);
    return {
      dataUrl: c.toDataURL('image/jpeg', quality),
      width: w,
      height: h,
    };
  }

  const scale = maxDimension / Math.max(w, h);
  const newW = Math.round(w * scale);
  const newH = Math.round(h * scale);

  const c = document.createElement('canvas');
  c.width = newW;
  c.height = newH;
  const cx = c.getContext('2d');
  cx.drawImage(img, 0, 0, newW, newH);

  return {
    dataUrl: c.toDataURL('image/jpeg', quality),
    width: newW,
    height: newH,
  };
}

// =============================================
// DETECTION MAPPING HELPER
// =============================================
function mapDetections(rawDetections = []) {
  return rawDetections.map((item, idx) => {
    const dt = (item.data_type || '').toLowerCase();
    const dtArabic = (item.data_type_arabic || '').toLowerCase();
    const isFace = dt.includes('face') || dtArabic.includes('وجه');
    const isMeta = dt.includes('meta') || dtArabic.includes('وثيقة') || dtArabic.includes('إصدار');

    const isRecommendedOnly = item.is_recommended_only === true || isFace || isMeta;
    const isDefaultSelected = item.default_selected !== undefined ? item.default_selected : !isRecommendedOnly;

    let cleanTitle = (item.data_type_arabic || 'بيانات حساسة')
      .replace(/[^\u0600-\u06FF\s\(\)\-\/a-zA-Z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanTitle) cleanTitle = 'بيانات حساسة';

    return {
      id: item.id || 'det_' + idx,
      dataType: item.data_type || 'sensitive_data',
      dataTypeArabic: cleanTitle,
      riskLevel: (item.risk_level || (isRecommendedOnly ? 'MODERATE' : 'CRITICAL')).toUpperCase(),
      box2d: item.box_2d || [0, 0, 0, 0],
      adviceArabic:
        item.advice_arabic ||
        (isRecommendedOnly
          ? 'نوصي بحجب هذا العنصر لحماية الخصوصية، ومشاركته خيار متاح حسب رغبتك.'
          : 'هذه المعلومة حساسة ويجب حجبها لمنع سرقة الهوية.'),
      text: item.text || '',
      isRecommendedOnly: isRecommendedOnly,
      isSelectedForRedaction: isDefaultSelected,
    };
  });
}

// =============================================
// UNIFIED FILE HANDLER (Images, PDF, Word DOCX)
// =============================================
async function handleFile(file) {
  const fileName = file.name || '';
  const ext = fileName.split('.').pop().toLowerCase();

  // 1. PDF File
  if (file.type === 'application/pdf' || ext === 'pdf') {
    await handlePdfFile(file);
    return;
  }

  // 2. Word Document (.docx / .doc)
  if (
    ext === 'docx' ||
    ext === 'doc' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === 'application/msword'
  ) {
    await handleDocxFile(file);
    return;
  }

  // 3. Image File (PNG, JPG, WEBP)
  if (file.type.startsWith('image/')) {
    handleImageFile(file);
    return;
  }

  showToast('يرجى اختيار ملف مدعوم (صورة، مستند PDF، أو ملف Word DOCX).');
}

// =============================================
// IMAGE HANDLER
// =============================================
function handleImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      state.documentType = 'image';
      state.documentName = file.name.replace(/\.[^/.]+$/, '');
      state.image = img;
      state.imageWidth = img.naturalWidth || img.width;
      state.imageHeight = img.naturalHeight || img.height;
      state.originalDataUrl = e.target.result;

      state.pages = [
        {
          image: img,
          imageWidth: state.imageWidth,
          imageHeight: state.imageHeight,
          detections: [],
          summaryArabic: '',
          isSafeOverall: false,
        },
      ];
      state.currentPageIndex = 0;

      startScanProcess();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// =============================================
// PDF FILE HANDLER (Mozilla PDF.js)
// =============================================
async function handlePdfFile(file) {
  state.documentType = 'pdf';
  state.documentName = file.name.replace(/\.[^/.]+$/, '');
  state.pages = [];
  state.currentPageIndex = 0;

  startRealtimeTimer();
  advanceScanStep(1);

  try {
    const arrayBuffer = await file.arrayBuffer();
    if (!window.pdfjsLib) {
      throw new Error('محرك قراءة ملفات PDF غير متاح.');
    }

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      // High-resolution rendering at 2.0x scale
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      // White background for pages
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport: viewport }).promise;

      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = canvas.toDataURL('image/jpeg', 0.95);
      });

      state.pages.push({
        image: img,
        canvas: canvas,
        imageWidth: img.naturalWidth || img.width,
        imageHeight: img.naturalHeight || img.height,
        detections: [],
        summaryArabic: '',
        isSafeOverall: false,
      });
    }

    if (state.pages.length === 0) {
      throw new Error('لم يتم العثور على صفحات داخل ملف الـ PDF.');
    }

    // Set first page as active
    state.image = state.pages[0].image;
    state.imageWidth = state.pages[0].imageWidth;
    state.imageHeight = state.pages[0].imageHeight;

    // Scan all pages with Gemini Vision AI
    advanceScanStep(2);
    for (let i = 0; i < state.pages.length; i++) {
      const p = state.pages[i];
      const compressed = compressImage(p.image, 1280, 0.85);
      const report = await requestAnalysis(compressed.dataUrl.split(',')[1], 'image/jpeg');

      p.detections = mapDetections(report.detections);
      p.summaryArabic = report.summary_arabic || 'تم الفحص الأمني للصفحة بنجاح.';
      p.isSafeOverall = report.is_safe_overall || false;
    }

    state.detections = state.pages[0].detections;
    state.summaryArabic = state.pages[0].summaryArabic;
    state.isSafeOverall = state.pages[0].isSafeOverall;

    advanceScanStep(3);
    stopRealtimeTimer();
    updatePageNavigators();
    renderAnalysisScreen();
    switchStep(2);

    showToast(`تم فحص مستند PDF بنجاح (${state.pages.length} صفحات). جاهز للحجب الآمن.`);
  } catch (err) {
    console.error('PDF processing error:', err);
    stopRealtimeTimer();
    showToast('حدث خطأ أثناء معالجة ملف PDF: ' + err.message, 6000);
  }
}

// =============================================
// WORD DOCX FILE HANDLER (Mammoth.js)
// =============================================
async function handleDocxFile(file) {
  state.documentType = 'docx';
  state.documentName = file.name.replace(/\.[^/.]+$/, '');
  state.pages = [];
  state.currentPageIndex = 0;

  startRealtimeTimer();
  advanceScanStep(1);

  try {
    const arrayBuffer = await file.arrayBuffer();
    if (!window.mammoth) {
      throw new Error('محرك قراءة ملفات Word غير متاح.');
    }

    const result = await mammoth.convertToHtml({ arrayBuffer });
    const rawHtml = result.value;

    // Render Word HTML to pristine A4 Document Canvas with native Arabic RTL Cairo font
    const docCanvas = renderHtmlToDocumentCanvas(rawHtml);

    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = docCanvas.toDataURL('image/jpeg', 0.95);
    });

    state.pages = [
      {
        image: img,
        canvas: docCanvas,
        imageWidth: img.naturalWidth || img.width,
        imageHeight: img.naturalHeight || img.height,
        detections: [],
        summaryArabic: '',
        isSafeOverall: false,
      },
    ];

    state.image = img;
    state.imageWidth = img.naturalWidth || img.width;
    state.imageHeight = img.naturalHeight || img.height;

    advanceScanStep(2);
    const compressed = compressImage(img, 1280, 0.85);
    const report = await requestAnalysis(compressed.dataUrl.split(',')[1], 'image/jpeg');

    state.pages[0].detections = mapDetections(report.detections);
    state.pages[0].summaryArabic = report.summary_arabic || 'تم فحص مستند Word بنجاح.';
    state.pages[0].isSafeOverall = report.is_safe_overall || false;

    state.detections = state.pages[0].detections;
    state.summaryArabic = state.pages[0].summaryArabic;
    state.isSafeOverall = state.pages[0].isSafeOverall;

    advanceScanStep(3);
    stopRealtimeTimer();
    updatePageNavigators();
    renderAnalysisScreen();
    switchStep(2);

    showToast('تم فحص مستند Word بنجاح وتحويله لمستند محمي.');
  } catch (err) {
    console.error('Word processing error:', err);
    stopRealtimeTimer();
    showToast('حدث خطأ أثناء معالجة ملف Word: ' + err.message, 6000);
  }
}

// =============================================
// WORD HTML TO A4 DOCUMENT CANVAS RENDERER
// =============================================
function renderHtmlToDocumentCanvas(rawHtml) {
  // Standard A4 dimensions at 150 DPI
  const width = 1240;
  const height = 1754;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Solid white page
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  const marginX = 80;
  let cursorY = 90;

  // Document Official Top Header
  ctx.font = 'bold 22px Cairo, sans-serif';
  ctx.fillStyle = '#1E293B';
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillText('منصة تأكد (TAAKAD) — مستند محمي', width - marginX, cursorY);

  ctx.font = '14px Cairo, sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.fillText(new Date().toLocaleDateString('ar-SA'), marginX, cursorY);

  cursorY += 24;
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(marginX, cursorY);
  ctx.lineTo(width - marginX, cursorY);
  ctx.stroke();

  cursorY += 50;

  // Parse HTML elements
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = rawHtml;

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  const maxLineWidth = width - marginX * 2;
  const lineHeight = 34;

  const elements = tempDiv.querySelectorAll('h1, h2, h3, h4, p, li');
  if (elements.length === 0) {
    wrapText(ctx, tempDiv.innerText || tempDiv.textContent, width - marginX, cursorY, maxLineWidth, lineHeight);
  } else {
    elements.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const text = (el.innerText || el.textContent || '').trim();
      if (!text) return;

      if (tag.startsWith('h')) {
        ctx.font = 'bold 24px Cairo, sans-serif';
        ctx.fillStyle = '#0F172A';
        cursorY += 16;
      } else {
        ctx.font = '19px Cairo, sans-serif';
        ctx.fillStyle = '#334155';
      }

      cursorY = wrapText(ctx, text, width - marginX, cursorY, maxLineWidth, lineHeight);
      cursorY += 16;
    });
  }

  return canvas;
}

function wrapText(ctx, text, startX, startY, maxWidth, lineHeight) {
  const words = text.split(/\s+/);
  let line = '';
  let y = startY;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + (line ? ' ' : '') + words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, startX, y);
      line = words[n];
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, startX, y);
    y += lineHeight;
  }
  return y;
}

// =============================================
// IMAGE SCAN PROCESS
// =============================================
async function startScanProcess() {
  startRealtimeTimer();

  try {
    advanceScanStep(1);
    const compressed = compressImage(state.image, 1280, 0.85);
    const compressedBase64 = compressed.dataUrl.split(',')[1];

    advanceScanStep(2);
    const report = await requestAnalysis(compressedBase64, 'image/jpeg');

    advanceScanStep(3);
    state.detections = mapDetections(report.detections);
    state.pages[0].detections = state.detections;
    state.pages[0].summaryArabic = report.summary_arabic || 'تم الفحص الأمني للوثيقة بنجاح.';
    state.pages[0].isSafeOverall = report.is_safe_overall || false;

    state.summaryArabic = state.pages[0].summaryArabic;
    state.isSafeOverall = state.pages[0].isSafeOverall;

    stopRealtimeTimer();
    updatePageNavigators();
    renderAnalysisScreen();
    switchStep(2);

    const activeCount = state.detections.filter((d) => d.isSelectedForRedaction).length;
    showToast(`اكتمل الفحص بنجاح. تم تفعيل الحجب على ${activeCount} بيانات حساسة.`);
  } catch (err) {
    console.error('Scan error:', err);
    stopRealtimeTimer();
    showToast('حدث خطأ أثناء فحص الصورة: ' + err.message, 6000);
  }
}

// =============================================
// API REQUEST TO SERVER PROXY
// =============================================
async function requestAnalysis(base64Data, mimeType) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Data, mimeType: mimeType }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error('خطأ بالخادم ' + response.status + ': ' + errBody.slice(0, 200));
  }

  return await response.json();
}

// =============================================
// CATEGORY TAGS (Zero Emojis)
// =============================================
function getCategoryTag(dataType) {
  const dt = (dataType || '').toLowerCase();
  if (dt.includes('face') || dt.includes('وجه') || dt.includes('صورة')) return 'صورة الوجه';
  if (dt.includes('id') || dt.includes('هوية') || dt.includes('إقامة')) return 'رقم الهوية';
  if (dt.includes('name') || dt.includes('اسم')) return 'الاسم';
  if (dt.includes('date') || dt.includes('تاريخ') || dt.includes('ميلاد')) return 'تاريخ';
  if (dt.includes('qr') || dt.includes('barcode') || dt.includes('باركود')) return 'رمز باركود';
  if (dt.includes('phone') || dt.includes('جوال') || dt.includes('هاتف')) return 'هاتف';
  if (dt.includes('iban') || dt.includes('bank') || dt.includes('بنك')) return 'حساب بنكي';
  if (dt.includes('mrz')) return 'MRZ آلي';
  if (dt.includes('manual') || dt.includes('يدوي') || dt.includes('مخصص')) return 'حجب يدوي';
  return 'بيانات';
}

function updateSelectedBoxHint() {
  if (!selectedBoxHint) return;
  if (!state.selectedItemId) {
    selectedBoxHint.textContent = 'انقر على أي صندوق لتحديده أو سحبه لتعديل موضعه';
  } else {
    const item = state.detections.find((d) => d.id === state.selectedItemId);
    if (!item) {
      selectedBoxHint.textContent = 'انقر على أي صندوق لتحديده';
      return;
    }
    const statusNote = item.isSelectedForRedaction ? 'مفعل للحجب' : 'غير مفعل (اختياري)';
    selectedBoxHint.textContent = `محدد: [${item.dataTypeArabic}] (${statusNote}) — اسحبه لتحريكه أو اسحب المقابض لتغيير أبعاده`;
  }
}

// =============================================
// INTERACTIVE CANVAS (Drag, Resize, Draw)
// =============================================
function setupInteractiveCanvas() {
  const HANDLE_SIZE = 14;

  function getCanvasCoords(e) {
    const rect = analysisCanvas.getBoundingClientRect();
    const scaleX = state.imageWidth / rect.width;
    const scaleY = state.imageHeight / rect.height;
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function getBoxPixels(box2d) {
    const [ymin, xmin, ymax, xmax] = box2d;
    return {
      x: (xmin / 1000) * state.imageWidth,
      y: (ymin / 1000) * state.imageHeight,
      w: ((xmax - xmin) / 1000) * state.imageWidth,
      h: ((ymax - ymin) / 1000) * state.imageHeight,
    };
  }

  function onPointerDown(e) {
    if (e.type === 'touchstart') e.preventDefault();
    const { x, y } = getCanvasCoords(e);

    if (state.isDrawingManual) {
      canvasState.dragMode = 'draw';
      canvasState.startX = x;
      canvasState.startY = y;
      return;
    }

    // Check resize handles on selected item first
    if (state.selectedItemId) {
      const selItem = state.detections.find((d) => d.id === state.selectedItemId);
      if (selItem) {
        const bp = getBoxPixels(selItem.box2d);
        const handles = {
          'resize-tl': { x: bp.x, y: bp.y },
          'resize-tr': { x: bp.x + bp.w, y: bp.y },
          'resize-bl': { x: bp.x, y: bp.y + bp.h },
          'resize-br': { x: bp.x + bp.w, y: bp.y + bp.h },
        };

        for (const [handleKey, pos] of Object.entries(handles)) {
          if (Math.hypot(x - pos.x, y - pos.y) <= HANDLE_SIZE * 1.5) {
            canvasState.dragMode = handleKey;
            canvasState.dragItemId = selItem.id;
            canvasState.startX = x;
            canvasState.startY = y;
            canvasState.initialBox = [...selItem.box2d];
            return;
          }
        }
      }
    }

    // Check if clicking on any existing box
    let clickedItem = null;
    for (let i = state.detections.length - 1; i >= 0; i--) {
      const item = state.detections[i];
      if (item.riskLevel === 'SAFE') continue;
      const bpCheck = getBoxPixels(item.box2d);
      if (x >= bpCheck.x && x <= bpCheck.x + bpCheck.w && y >= bpCheck.y && y <= bpCheck.y + bpCheck.h) {
        clickedItem = item;
        break;
      }
    }

    if (clickedItem) {
      state.selectedItemId = clickedItem.id;
      canvasState.dragMode = 'move';
      canvasState.dragItemId = clickedItem.id;
      canvasState.startX = x;
      canvasState.startY = y;
      canvasState.initialBox = [...clickedItem.box2d];

      if (clickedItem.adviceArabic) {
        activeAdviceText.textContent = clickedItem.adviceArabic;
      }
      updateSelectedBoxHint();
      drawAnalysisCanvas();
      renderDetectionCards();
    } else {
      state.selectedItemId = null;
      updateSelectedBoxHint();
      drawAnalysisCanvas();
      renderDetectionCards();
    }
  }

  function onPointerMove(e) {
    if (e.type === 'touchmove') e.preventDefault();
    const { x, y } = getCanvasCoords(e);

    // Hover cursor styling for desktop
    if (!canvasState.dragMode && !state.isDrawingManual && e.type === 'mousemove') {
      let hoveringHandle = false;
      if (state.selectedItemId) {
        const selItem = state.detections.find((d) => d.id === state.selectedItemId);
        if (selItem) {
          const bp = getBoxPixels(selItem.box2d);
          const cursorHandles = {
            'nwse-resize': [{ x: bp.x, y: bp.y }, { x: bp.x + bp.w, y: bp.y + bp.h }],
            'nesw-resize': [{ x: bp.x + bp.w, y: bp.y }, { x: bp.x, y: bp.y + bp.h }],
          };

          for (const [cursorStyle, pts] of Object.entries(cursorHandles)) {
            for (const pt of pts) {
              if (Math.hypot(x - pt.x, y - pt.y) <= HANDLE_SIZE * 1.5) {
                analysisCanvas.style.cursor = cursorStyle;
                hoveringHandle = true;
                break;
              }
            }
            if (hoveringHandle) break;
          }
        }
      }

      if (!hoveringHandle) {
        const hoveringInside = state.detections.some((item) => {
          if (item.riskLevel === 'SAFE') return false;
          const bpH = getBoxPixels(item.box2d);
          return x >= bpH.x && x <= bpH.x + bpH.w && y >= bpH.y && y <= bpH.y + bpH.h;
        });
        analysisCanvas.style.cursor = hoveringInside ? 'move' : 'default';
      }
    }

    if (!canvasState.dragMode) return;

    if (canvasState.dragMode === 'draw') {
      drawAnalysisCanvas();
      const ctx = analysisCanvas.getContext('2d');
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(
        Math.min(canvasState.startX, x),
        Math.min(canvasState.startY, y),
        Math.abs(x - canvasState.startX),
        Math.abs(y - canvasState.startY)
      );
      ctx.setLineDash([]);
      return;
    }

    const dragItem = state.detections.find((d) => d.id === canvasState.dragItemId);
    if (!dragItem) return;

    const dxNorm = Math.round(((x - canvasState.startX) / state.imageWidth) * 1000);
    const dyNorm = Math.round(((y - canvasState.startY) / state.imageHeight) * 1000);
    const [origYmin, origXmin, origYmax, origXmax] = canvasState.initialBox;

    if (canvasState.dragMode === 'move') {
      const boxW = origXmax - origXmin;
      const boxH = origYmax - origYmin;
      const newXmin = Math.max(0, Math.min(1000 - boxW, origXmin + dxNorm));
      const newYmin = Math.max(0, Math.min(1000 - boxH, origYmin + dyNorm));
      dragItem.box2d = [newYmin, newXmin, newYmin + boxH, newXmin + boxW];
    } else if (canvasState.dragMode === 'resize-br') {
      dragItem.box2d[2] = Math.max(origYmin + 15, Math.min(1000, origYmax + dyNorm));
      dragItem.box2d[3] = Math.max(origXmin + 15, Math.min(1000, origXmax + dxNorm));
    } else if (canvasState.dragMode === 'resize-tl') {
      dragItem.box2d[0] = Math.min(origYmax - 15, Math.max(0, origYmin + dyNorm));
      dragItem.box2d[1] = Math.min(origXmax - 15, Math.max(0, origXmin + dxNorm));
    } else if (canvasState.dragMode === 'resize-tr') {
      dragItem.box2d[0] = Math.min(origYmax - 15, Math.max(0, origYmin + dyNorm));
      dragItem.box2d[3] = Math.max(origXmin + 15, Math.min(1000, origXmax + dxNorm));
    } else if (canvasState.dragMode === 'resize-bl') {
      dragItem.box2d[2] = Math.max(origYmin + 15, Math.min(1000, origYmax + dyNorm));
      dragItem.box2d[1] = Math.min(origXmax - 15, Math.max(0, origXmin + dxNorm));
    }

    drawAnalysisCanvas();
  }

  function onPointerUp(e) {
    if (!canvasState.dragMode) return;

    if (canvasState.dragMode === 'draw') {
      const { x, y } = getCanvasCoords(e);
      const x1 = Math.min(canvasState.startX, x);
      const y1 = Math.min(canvasState.startY, y);
      const x2 = Math.max(canvasState.startX, x);
      const y2 = Math.max(canvasState.startY, y);

      if (Math.abs(x2 - x1) > 20 && Math.abs(y2 - y1) > 20) {
        const yminN = Math.round((y1 / state.imageHeight) * 1000);
        const xminN = Math.round((x1 / state.imageWidth) * 1000);
        const ymaxN = Math.round((y2 / state.imageHeight) * 1000);
        const xmaxN = Math.round((x2 / state.imageWidth) * 1000);

        const newItem = {
          id: 'manual_' + Date.now(),
          dataType: 'manual_redaction',
          dataTypeArabic: 'منطقة حجب إضافية',
          riskLevel: 'CRITICAL',
          box2d: [yminN, xminN, ymaxN, xmaxN],
          adviceArabic: 'منطقة حجب تم تحديدها ورسمها يدوياً بواسطتك.',
          text: 'تحديد يدوي',
          isRecommendedOnly: false,
          isSelectedForRedaction: true,
        };

        state.detections.unshift(newItem);
        state.selectedItemId = newItem.id;

        state.isDrawingManual = false;
        drawManualBoxBtn.classList.remove('active');
        drawManualBoxBtn.querySelector('span').textContent = 'رسم صندوق حجب جديد';
        analysisCanvas.style.cursor = 'default';

        updateSelectedBoxHint();
        drawAnalysisCanvas();
        renderDetectionCards();
        showToast('تمت إضافة صندوق حجب جديد.');
      }
    }

    canvasState.dragMode = null;
    canvasState.dragItemId = null;
    canvasState.initialBox = null;
    drawAnalysisCanvas();
  }

  // Desktop events
  analysisCanvas.addEventListener('mousedown', onPointerDown);
  analysisCanvas.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);

  // Mobile touch events
  analysisCanvas.addEventListener('touchstart', onPointerDown, { passive: false });
  analysisCanvas.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('touchend', onPointerUp);
}

// =============================================
// RENDER ANALYSIS SCREEN (Step 2)
// =============================================
function renderAnalysisScreen() {
  const alertTitle = document.getElementById('alertTitle');
  const alertDesc = document.getElementById('alertDesc');
  const riskAlertBanner = document.getElementById('riskAlertBanner');

  const activeCount = state.detections.filter((d) => d.isSelectedForRedaction).length;
  const totalCount = state.detections.length;

  if (state.isSafeOverall || totalCount === 0) {
    riskAlertBanner.style.background = 'rgba(16, 185, 129, 0.12)';
    riskAlertBanner.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    alertTitle.textContent = 'المستند آمن تماماً للمشاركة';
    alertTitle.style.color = 'var(--color-emerald)';
    alertDesc.textContent = 'لم يتم العثور على أرقام هوية أو صور وجه أو بيانات حساسة مكشوفة.';
  } else {
    riskAlertBanner.style.background = 'rgba(239, 68, 68, 0.12)';
    riskAlertBanner.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    alertTitle.textContent = 'تحذير: تم اكتشاف بيانات حساسة تتطلب الحجب';
    alertTitle.style.color = 'var(--color-alert-red)';
    alertDesc.textContent = state.summaryArabic;
  }

  detectionCountBadge.textContent = `${activeCount} مفعل للحجب من أصل ${totalCount}`;

  updateSelectedBoxHint();
  drawAnalysisCanvas();
  renderDetectionCards();
}

// =============================================
// DRAW ANALYSIS CANVAS (Step 2 Overlay)
// =============================================
function drawAnalysisCanvas() {
  if (!state.image) return;

  analysisCanvas.width = state.imageWidth;
  analysisCanvas.height = state.imageHeight;
  const ctx = analysisCanvas.getContext('2d');

  ctx.drawImage(state.image, 0, 0);

  state.detections.forEach((item) => {
    if (item.riskLevel === 'SAFE') return;

    const [ymin, xmin, ymax, xmax] = item.box2d;
    const x = (xmin / 1000) * state.imageWidth;
    const y = (ymin / 1000) * state.imageHeight;
    const w = ((xmax - xmin) / 1000) * state.imageWidth;
    const h = ((ymax - ymin) / 1000) * state.imageHeight;

    const isSelected = state.selectedItemId === item.id;
    const isRedacted = item.isSelectedForRedaction;

    let baseColor = '#EF4444'; // Red for critical
    if (item.isRecommendedOnly) {
      baseColor = '#F59E0B'; // Amber for recommended
    }

    ctx.save();

    if (isRedacted) {
      // Solid active overlay
      ctx.fillStyle = isSelected
        ? 'rgba(56, 189, 248, 0.28)'
        : item.isRecommendedOnly
        ? 'rgba(245, 158, 11, 0.22)'
        : 'rgba(239, 68, 68, 0.22)';
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = isSelected ? '#38BDF8' : baseColor;
      ctx.lineWidth = isSelected ? 4 : 2.5;
      ctx.strokeRect(x, y, w, h);
    } else {
      // Inactive (e.g. Face photo ready but not yet activated): Dashed outline indicating recommendation
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = isSelected ? '#38BDF8' : '#F59E0B';
      ctx.lineWidth = isSelected ? 3.5 : 2;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
      ctx.fillRect(x, y, w, h);
      ctx.setLineDash([]);
    }

    // Corner brackets
    const cLen = Math.min(16, w / 3, h / 3);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + cLen); ctx.lineTo(x, y); ctx.lineTo(x + cLen, y);
    ctx.moveTo(x + w - cLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cLen);
    ctx.moveTo(x, y + h - cLen); ctx.lineTo(x, y + h); ctx.lineTo(x + cLen, y + h);
    ctx.moveTo(x + w - cLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cLen);
    ctx.stroke();

    // Corner resize handles if selected
    if (isSelected) {
      const handleRadius = Math.max(6, Math.min(10, w / 15, h / 15));
      ctx.fillStyle = '#38BDF8';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;

      const corners = [
        { cx: x, cy: y },
        { cx: x + w, cy: y },
        { cx: x, cy: y + h },
        { cx: x + w, cy: y + h },
      ];

      corners.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.cx, pt.cy, handleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    // Badge label
    const categoryTag = getCategoryTag(item.dataType);
    const labelFontSize = Math.max(12, Math.min(16, Math.floor(h * 0.25)));
    ctx.font = 'bold ' + labelFontSize + 'px Cairo, sans-serif';

    let tagText = `[${categoryTag}] ${item.dataTypeArabic}`;
    if (item.isRecommendedOnly && !isRedacted) {
      tagText = `[نوصي بحجبه] ${item.dataTypeArabic}`;
    }

    const textWidth = ctx.measureText(tagText).width;
    const tagY = y - (labelFontSize + 10) < 0 ? y + h + 2 : y - (labelFontSize + 10);
    const tagH = labelFontSize + 8;

    ctx.fillStyle = isSelected ? '#2563EB' : isRedacted ? baseColor : '#D97706';
    ctx.beginPath();
    ctx.roundRect(x, tagY, textWidth + 16, tagH, 4);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    ctx.fillText(tagText, x + textWidth + 8, tagY + tagH / 2);

    ctx.restore();
  });
}

// =============================================
// DETECTION CARDS LIST (RECOMMENDED ITEMS FIRST!)
// =============================================
function renderDetectionCards() {
  detectionCardsList.innerHTML = '';

  const recommendedItems = state.detections.filter((d) => d.isRecommendedOnly && d.riskLevel !== 'SAFE');
  const mandatoryItems = state.detections.filter((d) => !d.isRecommendedOnly && d.riskLevel !== 'SAFE');

  function createCardElement(item) {
    const card = document.createElement('div');
    const riskClass = item.isRecommendedOnly ? 'moderate recommended-card' : item.riskLevel.toLowerCase();
    card.className = 'detection-item-card ' + riskClass + (state.selectedItemId === item.id ? ' selected' : '');

    const categoryTag = getCategoryTag(item.dataType);
    let riskBadgeText = item.isRecommendedOnly ? 'نوصي بحجب هذا' : 'خطر عالي — محجوب تلقائياً';

    const textHtml = item.text
      ? `<div style="font-size:0.75rem;color:var(--text-muted);font-family:monospace;direction:ltr;text-align:right;">${escapeHtml(item.text)}</div>`
      : '';

    card.innerHTML = `
      <div class="type-category-badge">${escapeHtml(categoryTag)}</div>
      <div class="item-details">
        <div class="item-title">${escapeHtml(item.dataTypeArabic)}</div>
        <div class="item-risk-tag">${escapeHtml(riskBadgeText)}</div>
        ${item.isRecommendedOnly ? '<span class="recommend-pill">نوصي بحجب هذا لمنع استغلال الهوية</span>' : ''}
        ${textHtml}
      </div>
      <div class="item-check">
        <input type="checkbox" ${item.isSelectedForRedaction ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--color-emerald);cursor:pointer;" title="تفعيل / إيقاف الحجب">
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      state.selectedItemId = state.selectedItemId === item.id ? null : item.id;
      if (item.adviceArabic) {
        activeAdviceText.textContent = item.adviceArabic;
      }
      updateSelectedBoxHint();
      drawAnalysisCanvas();
      renderDetectionCards();
    });

    const checkbox = card.querySelector('input');
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        item.isSelectedForRedaction = e.target.checked;
        drawAnalysisCanvas();
        updateSelectedBoxHint();
      });
    }

    return card;
  }

  // 1. Recommended Items Section (FIRST AT THE TOP!)
  if (recommendedItems.length > 0) {
    const title = document.createElement('div');
    title.className = 'detection-section-title';
    title.style.color = 'var(--color-warm-amber)';
    title.innerHTML = `<span>عناصر اختيارية — نوصي بحجبها لحماية الخصوصية:</span>`;
    detectionCardsList.appendChild(title);

    recommendedItems.forEach((item) => {
      detectionCardsList.appendChild(createCardElement(item));
    });
  }

  // 2. Mandatory Critical Items Section (Below recommended)
  if (mandatoryItems.length > 0) {
    const title = document.createElement('div');
    title.className = 'detection-section-title';
    title.innerHTML = `<span>بيانات حساسة وحرجة (محجوبة تلقائياً لحمايتك):</span>`;
    detectionCardsList.appendChild(title);

    mandatoryItems.forEach((item) => {
      detectionCardsList.appendChild(createCardElement(item));
    });
  }
}

// =============================================
// REDACTION CANVAS (Step 3 Output)
// =============================================
function renderRedactionCanvas() {
  if (!state.image) return;

  redactionCanvas.width = state.imageWidth;
  redactionCanvas.height = state.imageHeight;
  const ctx = redactionCanvas.getContext('2d');

  ctx.drawImage(state.image, 0, 0);

  if (state.showOriginal) return;

  state.detections.forEach((item) => {
    if (!item.isSelectedForRedaction || item.riskLevel === 'SAFE') return;

    const [ymin, xmin, ymax, xmax] = item.box2d;
    const x = Math.floor((xmin / 1000) * state.imageWidth);
    const y = Math.floor((ymin / 1000) * state.imageHeight);
    const w = Math.ceil(((xmax - xmin) / 1000) * state.imageWidth);
    const h = Math.ceil(((ymax - ymin) / 1000) * state.imageHeight);

    switch (state.redactionMode) {
      case 'blackout':
        applyHighContrastBrandedBlackout(ctx, x, y, w, h);
        break;
      case 'blur':
        applyBlurMask(ctx, x, y, w, h);
        break;
      case 'pixelate':
        applyPixelateMask(ctx, x, y, w, h);
        break;
    }
  });
}

// =============================================
// BLACKOUT WITH GUARANTEED NON-OVERLAPPING LOCK
// =============================================
function applyHighContrastBrandedBlackout(ctx, x, y, w, h) {
  const barColor = state.blackoutColor || '#060A12';

  ctx.save();

  // 1. Solid blackout bar
  ctx.fillStyle = barColor;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();

  // 2. Subtle cyber border
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = Math.max(1.5, Math.min(3, h * 0.04));
  ctx.stroke();

  // 3. Inner highlight
  ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

  const watermark = (state.watermarkText || '').trim();
  const centerY = y + h / 2;

  // Vector Padlock helper
  function drawVectorPadlock(px, py, size, pColor) {
    ctx.save();
    ctx.strokeStyle = pColor;
    ctx.fillStyle = pColor;
    ctx.lineWidth = Math.max(1.5, size * 0.14);

    const bw = size * 1.05;
    const bh = size * 0.85;
    ctx.beginPath();
    ctx.roundRect(px - bw / 2, py - bh / 4, bw, bh, 2);
    ctx.fill();

    const sw = bw * 0.6;
    ctx.beginPath();
    ctx.arc(px, py - bh / 4, sw / 2, Math.PI, 0, false);
    ctx.stroke();

    ctx.restore();
  }

  // If no watermark text, draw lock in center if space permits
  if (!watermark) {
    if (w >= 18 && h >= 16) {
      drawVectorPadlock(x + w / 2, centerY, Math.min(14, h * 0.4, w * 0.4), '#10B981');
    }
    ctx.restore();
    return;
  }

  // Dynamic font size proportional to box height & width
  let fontSize = Math.max(12, Math.floor(h * 0.45));
  ctx.font = 'bold ' + fontSize + 'px Cairo, sans-serif';
  let textWidth = ctx.measureText(watermark).width;

  const lockSize = Math.max(10, Math.floor(h * 0.32));
  const gap = Math.max(8, Math.floor(fontSize * 0.35));
  const horizontalPadding = 14;

  let combinedWidth = lockSize + gap + textWidth;
  const availableWidth = w - horizontalPadding * 2;

  // If text is wider than available area, shrink font proportionally
  if (combinedWidth > availableWidth) {
    const availableForText = availableWidth - (lockSize + gap);
    if (availableForText > 35) {
      fontSize = Math.max(11, Math.floor(fontSize * (availableForText / textWidth)));
      ctx.font = 'bold ' + fontSize + 'px Cairo, sans-serif';
      textWidth = ctx.measureText(watermark).width;
      combinedWidth = lockSize + gap + textWidth;
    }
  }

  // Strictly avoid overlap: If both fit side-by-side, draw both; otherwise draw text only
  if (combinedWidth <= w - 10 && h >= 20) {
    const startX = x + (w - combinedWidth) / 2;

    const lockCenterX = startX + lockSize / 2;
    drawVectorPadlock(lockCenterX, centerY, lockSize, '#10B981');

    const textStartX = startX + lockSize + gap;

    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(watermark, textStartX, centerY);
    ctx.shadowBlur = 0;
  } else if (textWidth <= w - 10 && h >= 18) {
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(watermark, x + w / 2, centerY);
    ctx.shadowBlur = 0;
  } else if (w >= 36 && h >= 16) {
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.max(11, Math.floor(h * 0.42)) + 'px Cairo, sans-serif';
    ctx.fillStyle = '#10B981';
    ctx.fillText('تأكد', x + w / 2, centerY);
  } else if (w >= 16 && h >= 14) {
    drawVectorPadlock(x + w / 2, centerY, Math.min(10, h * 0.5, w * 0.5), '#10B981');
  }

  ctx.restore();
}

// =============================================
// BLUR MASK
// =============================================
function applyBlurMask(ctx, x, y, w, h) {
  applyBlurMaskToCanvas(ctx, state.image, x, y, w, h);
}

function applyBlurMaskToCanvas(ctx, sourceImg, x, y, w, h) {
  const intensity = state.blurIntensity || 22;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.filter = `blur(${intensity}px)`;
  ctx.drawImage(sourceImg, 0, 0);

  ctx.restore();

  ctx.fillStyle = 'rgba(10, 15, 29, 0.35)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

// =============================================
// PIXELATE MASK
// =============================================
function applyPixelateMask(ctx, x, y, w, h) {
  applyPixelateMaskToCanvas(ctx, x, y, w, h, state.imageWidth, state.imageHeight);
}

function applyPixelateMaskToCanvas(ctx, x, y, w, h, totalW, totalH) {
  const pixelSize = state.pixelateSize || 18;

  try {
    const safeX = Math.max(0, x);
    const safeY = Math.max(0, y);
    const safeW = Math.min(w, totalW - safeX);
    const safeH = Math.min(h, totalH - safeY);
    if (safeW <= 0 || safeH <= 0) return;

    const imgData = ctx.getImageData(safeX, safeY, safeW, safeH);
    const data = imgData.data;

    for (let py = 0; py < safeH; py += pixelSize) {
      for (let px = 0; px < safeW; px += pixelSize) {
        const sampleX = Math.min(px + Math.floor(pixelSize / 2), safeW - 1);
        const sampleY = Math.min(py + Math.floor(pixelSize / 2), safeH - 1);
        const pixelIndex = (sampleY * safeW + sampleX) * 4;

        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(safeX + px, safeY + py, pixelSize, pixelSize);
      }
    }

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x, y, w, h);
  } catch (e) {
    ctx.fillStyle = '#151F32';
    ctx.fillRect(x, y, w, h);
  }
}

// =============================================
// ELEMENTS TOGGLE LIST (Step 3 - RECOMMENDED FIRST)
// =============================================
function renderElementsToggleList() {
  elementsToggleList.innerHTML = '';

  const items = state.detections.filter((d) => d.riskLevel !== 'SAFE');
  const sorted = [...items].sort((a, b) => {
    if (a.isRecommendedOnly && !b.isRecommendedOnly) return -1;
    if (!a.isRecommendedOnly && b.isRecommendedOnly) return 1;
    return 0;
  });

  sorted.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'element-toggle-row';
    const categoryTag = getCategoryTag(item.dataType);

    const textHtml = item.text
      ? `<div style="font-size:0.75rem;color:var(--text-muted);font-family:monospace;">${escapeHtml(item.text)}</div>`
      : '';

    const statusColor = item.isSelectedForRedaction ? 'var(--color-emerald)' : 'var(--color-alert-red)';
    const statusText = item.isSelectedForRedaction ? 'مشمول بالحجب والتعمية' : 'مكشوف وغير محمي';

    row.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="type-category-badge">${escapeHtml(categoryTag)}</span>
        <div>
          <strong>${escapeHtml(item.dataTypeArabic)}</strong>
          <div style="font-size:0.75rem;color:${statusColor};font-weight:700;">${statusText}</div>
          ${item.isRecommendedOnly ? '<span class="recommend-pill" style="margin-top:2px;">نوصي بحجبه</span>' : ''}
          ${textHtml}
        </div>
      </div>
      <label class="switch-wrap">
        <input type="checkbox" ${item.isSelectedForRedaction ? 'checked' : ''}>
        <span class="slider"></span>
      </label>
    `;

    const switchInput = row.querySelector('input');
    switchInput.addEventListener('change', (e) => {
      item.isSelectedForRedaction = e.target.checked;
      renderRedactionCanvas();
      renderElementsToggleList();
    });

    elementsToggleList.appendChild(row);
  });
}

// =============================================
// PDF EXPORT (All pages, High Resolution, Clean)
// =============================================
async function downloadProtectedPdf() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast('محرك توليد PDF غير متوفر.');
    return;
  }

  showToast('جاري تصدير مستند PDF المحمي وسليم...');

  try {
    const { jsPDF } = window.jspdf;
    let pdfDoc = null;

    // Save current active page state
    if (state.pages[state.currentPageIndex]) {
      state.pages[state.currentPageIndex].detections = state.detections;
    }

    const pagesToExport = state.pages.length > 0 ? state.pages : [{
      image: state.image,
      imageWidth: state.imageWidth,
      imageHeight: state.imageHeight,
      detections: state.detections,
    }];

    for (let i = 0; i < pagesToExport.length; i++) {
      const p = pagesToExport[i];
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = p.imageWidth;
      pageCanvas.height = p.imageHeight;
      const ctx = pageCanvas.getContext('2d');

      ctx.drawImage(p.image, 0, 0);

      const detections = p.detections || [];
      detections.forEach((item) => {
        if (!item.isSelectedForRedaction || item.riskLevel === 'SAFE') return;
        const [ymin, xmin, ymax, xmax] = item.box2d;
        const x = Math.floor((xmin / 1000) * p.imageWidth);
        const y = Math.floor((ymin / 1000) * p.imageHeight);
        const w = Math.ceil(((xmax - xmin) / 1000) * p.imageWidth);
        const h = Math.ceil(((ymax - ymin) / 1000) * p.imageHeight);

        switch (state.redactionMode) {
          case 'blackout':
            applyHighContrastBrandedBlackout(ctx, x, y, w, h);
            break;
          case 'blur':
            applyBlurMaskToCanvas(ctx, p.image, x, y, w, h);
            break;
          case 'pixelate':
            applyPixelateMaskToCanvas(ctx, x, y, w, h, p.imageWidth, p.imageHeight);
            break;
        }
      });

      const w = pageCanvas.width;
      const h = pageCanvas.height;
      const orientation = w > h ? 'l' : 'p';

      if (i === 0) {
        pdfDoc = new jsPDF({
          orientation: orientation,
          unit: 'pt',
          format: [w * 0.75, h * 0.75],
        });
      } else {
        pdfDoc.addPage([w * 0.75, h * 0.75], orientation);
      }

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
      pdfDoc.addImage(imgData, 'JPEG', 0, 0, w * 0.75, h * 0.75);
    }

    const fileName = (state.documentName || 'taakad_document') + '_protected.pdf';
    pdfDoc.save(fileName);
    showToast('تم تحميل مستند PDF المحمي بنجاح!');
  } catch (err) {
    console.error('PDF export error:', err);
    showToast('فشل إنشاء ملف PDF: ' + err.message, 5000);
  }
}

// =============================================
// IMAGE DOWNLOAD & SHARE
// =============================================
function downloadProtectedImage() {
  const link = document.createElement('a');
  const ext = state.documentType === 'image' ? 'png' : 'png';
  link.download = (state.documentName || 'taakad_document') + '_page' + (state.currentPageIndex + 1) + '.' + ext;
  link.href = redactionCanvas.toDataURL('image/png');
  link.click();
  showToast('تم تحميل الصورة المحمية بنجاح.');
}

async function shareSafeCopy() {
  if (navigator.share && redactionCanvas.toBlob) {
    redactionCanvas.toBlob(async (blob) => {
      const file = new File([blob], 'taakad_protected_document.png', { type: 'image/png' });
      try {
        await navigator.share({
          title: 'نسخة آمنة ومحمية عبر منصة تأكد (TAAKAD)',
          text: 'تم فحص هذه الوثيقة وتشفير البيانات الحساسة بوسام حماية تأكد',
          files: [file],
        });
      } catch (e) {
        downloadProtectedImage();
      }
    });
  } else {
    downloadProtectedImage();
  }
}

// =============================================
// UTILITY
// =============================================
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
