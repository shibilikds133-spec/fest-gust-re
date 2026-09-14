/**
 * ALVEORA - College Festival Guest Registration Portal & Admin Dashboard
 * Vanilla TypeScript/JavaScript Controller
 */

import {
  submitGuestRegistration,
  subscribeToGuests,
  subscribeToStudents,
  onSyncStatusChange,
  firebaseConfig,
  isPlaceholderConfig,
  updateFirebaseConfig,
  resetLocalDemoData,
  eraseAllRegistrationData,
  defaultFirebaseConfig,
  type GuestSubmission
} from './firebase';

// --------------------------------------------------------------------------
// STATE MANAGEMENT
// --------------------------------------------------------------------------
interface FormState {
  studentName: string;
  guestCount: number;
  foodPreference: 'Lunch' | 'Dinner' | 'Both' | 'Not Required';
}

const formState: FormState = {
  studentName: '',
  guestCount: 2,
  foodPreference: 'Both'
};

let currentStep = 0; // 0: Landing, 1: Student, 2: Guests, 3: Food, 4: Success
let adminPinBuffer = '';
let isAdminAuthenticated = false;
let allGuestsList: GuestSubmission[] = [];
let currentFilter = 'all';
let currentSearchQuery = '';
let officialStudentsList: string[] = [];

// --------------------------------------------------------------------------
// DOM ELEMENTS
// --------------------------------------------------------------------------
const appContainer = document.getElementById('app-container') as HTMLElement;
const portalView = document.getElementById('portal-view') as HTMLElement;
const adminView = document.getElementById('admin-view') as HTMLElement;
const navModeBtn = document.getElementById('nav-mode-btn') as HTMLAnchorElement;
const navModeLabel = document.getElementById('nav-mode-label') as HTMLElement;
const iosClock = document.getElementById('ios-clock') as HTMLElement;

// Portal Slider & Steps
const sliderContainer = document.getElementById('slider-container') as HTMLElement;
const sliderTrack = document.getElementById('slider-track') as HTMLElement;
const stepProgressWrapper = document.getElementById('step-progress-wrapper') as HTMLElement;
const stepIndicatorText = document.getElementById('step-indicator-text') as HTMLElement;
const stepNameText = document.getElementById('step-name-text') as HTMLElement;
const progDots = [
  document.getElementById('prog-dot-1') as HTMLElement,
  document.getElementById('prog-dot-2') as HTMLElement,
  document.getElementById('prog-dot-3') as HTMLElement
];
const screens = [
  document.getElementById('screen-landing') as HTMLElement,
  document.getElementById('screen-student') as HTMLElement,
  document.getElementById('screen-guests') as HTMLElement,
  document.getElementById('screen-food') as HTMLElement,
  document.getElementById('screen-success') as HTMLElement
];

// Screen 1: Landing
const btnStartReg = document.getElementById('btn-start-reg') as HTMLButtonElement;

// Screen 2: Student
const studentSearchInput = document.getElementById('student-search-input') as HTMLInputElement;
const btnClearStudent = document.getElementById('btn-clear-student') as HTMLButtonElement;
const selectedStudentChip = document.getElementById('selected-student-chip') as HTMLElement;
const selectedStudentName = document.getElementById('selected-student-name') as HTMLElement;
const selectedInitials = document.getElementById('selected-initials') as HTMLElement;
const studentDropdownMenu = document.getElementById('student-dropdown-menu') as HTMLElement;
const studentSuggestionsList = document.getElementById('student-suggestions-list') as HTMLUListElement;
const studentRosterCount = document.getElementById('student-roster-count') as HTMLElement;
const btnBackTo1 = document.getElementById('btn-back-to-1') as HTMLButtonElement;
const btnNextTo3 = document.getElementById('btn-next-to-3') as HTMLButtonElement;

// Screen 3: Guests
const btnStepperMinus = document.getElementById('btn-stepper-minus') as HTMLButtonElement;
const btnStepperPlus = document.getElementById('btn-stepper-plus') as HTMLButtonElement;
const guestCountDisplay = document.getElementById('guest-count-display') as HTMLElement;
const guestCountLabel = document.getElementById('guest-count-label') as HTMLElement;
const guestPresetBtns = document.querySelectorAll('.guest-preset-btn');
const btnBackTo2 = document.getElementById('btn-back-to-2') as HTMLButtonElement;
const btnNextTo4 = document.getElementById('btn-next-to-4') as HTMLButtonElement;

// Screen 4: Food
const foodToggleBtns = document.querySelectorAll('.ios-food-toggle');
const summaryBadgePreview = document.getElementById('summary-badge-preview') as HTMLElement;
const btnBackTo3 = document.getElementById('btn-back-to-3') as HTMLButtonElement;
const btnSubmitRegistration = document.getElementById('btn-submit-registration') as HTMLButtonElement;
const submitBtnText = document.getElementById('submit-btn-text') as HTMLElement;
const submitBtnSpinner = document.getElementById('submit-btn-spinner') as HTMLElement;

// Screen 5: Success
const successPassId = document.getElementById('success-pass-id') as HTMLElement;
const successStudent = document.getElementById('success-student') as HTMLElement;
const successGuests = document.getElementById('success-guests') as HTMLElement;
const successFood = document.getElementById('success-food') as HTMLElement;
const btnRegisterAnother = document.getElementById('btn-register-another') as HTMLButtonElement;

// Admin Screen Elements
const adminLoginScreen = document.getElementById('admin-login-screen') as HTMLElement;
const adminDashboardScreen = document.getElementById('admin-dashboard-screen') as HTMLElement;
const pinDots = document.querySelectorAll('.pin-dot');
const adminPinHiddenInput = document.getElementById('admin-pin-hidden-input') as HTMLInputElement;
const pinErrorMsg = document.getElementById('pin-error-msg') as HTMLElement;
const keypadBtns = document.querySelectorAll('.keypad-btn');
const keypadClear = document.getElementById('keypad-clear') as HTMLButtonElement;
const keypadDel = document.getElementById('keypad-del') as HTMLButtonElement;

// Admin Dashboard Widgets
const statTotalGuests = document.getElementById('stat-total-guests') as HTMLElement;
const statLunchOnly = document.getElementById('stat-lunch-only') as HTMLElement;
const statDinnerOnly = document.getElementById('stat-dinner-only') as HTMLElement;
const statBothPlan = document.getElementById('stat-both-plan') as HTMLElement;
const statLunchSub = document.getElementById('stat-lunch-sub') as HTMLElement;
const statDinnerSub = document.getElementById('stat-dinner-sub') as HTMLElement;
const statBothSub = document.getElementById('stat-both-sub') as HTMLElement;
const statTotalLunchMeals = document.getElementById('stat-total-lunch-meals') as HTMLElement;
const statTotalDinnerMeals = document.getElementById('stat-total-dinner-meals') as HTMLElement;
const statCalcLunch = document.getElementById('stat-calc-lunch') as HTMLElement;
const statCalcDinner = document.getElementById('stat-calc-dinner') as HTMLElement;
const statNotRequired = document.getElementById('stat-not-required') as HTMLElement;
const adminSearchInput = document.getElementById('admin-search-input') as HTMLInputElement;
const tableFilterBtns = document.querySelectorAll('.table-filter-btn');
const adminTableBody = document.getElementById('admin-table-body') as HTMLElement;
const tableCountLabel = document.getElementById('table-count-label') as HTMLElement;
const btnExportCsv = document.getElementById('btn-export-csv') as HTMLButtonElement;
const btnEraseAllData = document.getElementById('btn-erase-all-data') as HTMLButtonElement;
const btnQuickDemoAdd = document.getElementById('btn-quick-demo-add') as HTMLButtonElement;

// Config Modal Elements
const btnAdminConfig = document.getElementById('btn-admin-config') as HTMLButtonElement;
const firebaseConfigModal = document.getElementById('firebase-config-modal') as HTMLElement;
const btnCloseConfigModal = document.getElementById('btn-close-config-modal') as HTMLButtonElement;
const cfgApiKey = document.getElementById('cfg-api-key') as HTMLInputElement;
const cfgProjectId = document.getElementById('cfg-project-id') as HTMLInputElement;
const cfgAuthDomain = document.getElementById('cfg-auth-domain') as HTMLInputElement;
const btnSaveFirebaseCfg = document.getElementById('btn-save-firebase-cfg') as HTMLButtonElement;
const btnResetDemoData = document.getElementById('btn-reset-demo-data') as HTMLButtonElement;

// --------------------------------------------------------------------------
// 1. SILKY SMOOTH SWIPING PAGE NAVIGATION (Screen 1 to 5)
// --------------------------------------------------------------------------
function goToStep(stepIndex: number) {
  currentStep = Math.max(0, Math.min(4, stepIndex));

  // Translate slider track horizontally with responsive percentage
  if (sliderTrack) {
    sliderTrack.classList.remove('no-transition');
    sliderTrack.style.transform = `translateX(-${currentStep * 100}%)`;
  }

  // Update active state on screen items for depth scale & opacity
  screens.forEach((scr, idx) => {
    if (scr) {
      if (idx === currentStep) {
        scr.classList.add('active');
      } else {
        scr.classList.remove('active');
      }
    }
  });

  // Always reset scroll to zero
  if (sliderContainer) {
    sliderContainer.scrollLeft = 0;
  }

  // Update progress bar
  if (currentStep === 0 || currentStep === 4) {
    stepProgressWrapper.classList.add('hidden');
  } else {
    stepProgressWrapper.classList.remove('hidden');
    const stepLabels = ['Student Name', 'Guest Count', 'Food Preference'];
    stepIndicatorText.textContent = `Step ${currentStep} of 3`;
    stepNameText.textContent = stepLabels[currentStep - 1] || '';

    progDots.forEach((dot, idx) => {
      if (idx < currentStep) {
        dot.className = 'h-full flex-1 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-all duration-300';
      } else {
        dot.className = 'h-full flex-1 rounded-full bg-white/10 transition-all duration-300';
      }
    });
  }

  // Auto focus input if navigating to step 1
  if (currentStep === 1) {
    setTimeout(() => {
      if (sliderContainer) sliderContainer.scrollLeft = 0;
      studentSearchInput.focus({ preventScroll: true });
    }, 200);
  }

  // Update step 4 summary preview
  if (currentStep === 3) {
    updateSummaryPreview();
  }

  // Trigger text & pass card entrance animation ONLY after arriving at Screen 5 (Success)
  const screenSuccess = screens[4];
  if (currentStep === 4) {
    if (screenSuccess) {
      screenSuccess.classList.remove('screen-success-animate');
      // Reflow to restart animation sequence cleanly
      void screenSuccess.offsetWidth;
      requestAnimationFrame(() => {
        screenSuccess.classList.add('screen-success-animate');
      });
    }
  } else {
    if (screenSuccess) {
      screenSuccess.classList.remove('screen-success-animate');
    }
  }
}

function updateSummaryPreview() {
  const name = formState.studentName || 'Student';
  const countStr = `${formState.guestCount} ${formState.guestCount === 1 ? 'Guest' : 'Guests'}`;
  summaryBadgePreview.textContent = `${name} • ${countStr}`;
}

// --------------------------------------------------------------------------
// 2. STUDENT NAME INPUT & SEARCHABLE DROPDOWN (Screen 2)
// --------------------------------------------------------------------------
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name.slice(0, 2) || 'ST').toUpperCase();
}

function renderStudentDropdown(filteredNames: string[]) {
  if (!studentSuggestionsList || !studentDropdownMenu) return;
  
  if (studentRosterCount) {
    studentRosterCount.textContent = `${filteredNames.length} of ${officialStudentsList.length} students`;
  }

  if (filteredNames.length === 0) {
    studentSuggestionsList.innerHTML = `
      <li class="px-4 py-3 text-xs text-slate-400 text-center italic">
        No students matching search
      </li>
    `;
    studentDropdownMenu.classList.remove('hidden');
    return;
  }

  studentSuggestionsList.innerHTML = filteredNames.map(name => {
    const initials = getInitials(name);
    return `
      <li 
        data-student-name="${name.replace(/"/g, '&quot;')}"
        class="student-dropdown-item px-3.5 py-2.5 flex items-center justify-between hover:bg-purple-500/20 active:bg-purple-500/35 cursor-pointer transition-all duration-150"
      >
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-[11px] font-bold text-purple-200">
            ${initials}
          </div>
          <span class="text-sm text-white font-medium">${name}</span>
        </div>
        <svg class="w-4 h-4 text-purple-400 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </li>
    `;
  }).join('');

  // Attach click events
  const items = studentSuggestionsList.querySelectorAll('.student-dropdown-item');
  items.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const pickedName = item.getAttribute('data-student-name') || '';
      selectStudent(pickedName);
    });
  });

  studentDropdownMenu.classList.remove('hidden');
}

function filterStudentDropdown(queryStr: string) {
  const q = queryStr.trim().toLowerCase();
  if (!q) {
    renderStudentDropdown(officialStudentsList);
    return;
  }
  const filtered = officialStudentsList.filter(name => 
    name.toLowerCase().includes(q)
  );
  renderStudentDropdown(filtered);
}

function selectStudent(name: string) {
  studentSearchInput.value = name;
  updateStudentName(name);
  if (studentDropdownMenu) {
    studentDropdownMenu.classList.add('hidden');
  }
}

function updateStudentName(name: string) {
  const trimmed = name.trim();
  formState.studentName = trimmed;

  if (trimmed.length > 0) {
    btnClearStudent.classList.remove('hidden');
  } else {
    btnClearStudent.classList.add('hidden');
  }

  if (trimmed.length >= 2) {
    // Show preview card
    selectedInitials.textContent = getInitials(trimmed);
    selectedStudentName.textContent = trimmed;
    selectedStudentChip.classList.remove('hidden');
    selectedStudentChip.classList.add('flex');

    // Enable Next button
    btnNextTo3.disabled = false;
    btnNextTo3.classList.remove('opacity-45', 'cursor-not-allowed');
  } else {
    selectedStudentChip.classList.add('hidden');
    selectedStudentChip.classList.remove('flex');

    // Disable Next button until at least 2 characters are entered
    btnNextTo3.disabled = true;
    btnNextTo3.classList.add('opacity-45', 'cursor-not-allowed');
  }
}

// --------------------------------------------------------------------------
// 3. GUEST COUNT STEPPER (Screen 3)
// --------------------------------------------------------------------------
function updateGuestCount(newCount: number) {
  // No upper limit on guest count
  formState.guestCount = Math.max(1, newCount);
  
  guestCountDisplay.textContent = formState.guestCount < 10 ? `0${formState.guestCount}` : `${formState.guestCount}`;
  guestCountLabel.textContent = formState.guestCount === 1 ? 'Guest' : 'Guests';

  btnStepperMinus.disabled = formState.guestCount <= 1;
  btnStepperPlus.disabled = false;

  // Highlight active preset button if matched
  guestPresetBtns.forEach(btn => {
    const count = parseInt(btn.getAttribute('data-count') || '0', 10);
    if (count === formState.guestCount || (count === 5 && formState.guestCount >= 5)) {
      btn.classList.add('bg-purple-600/40', 'border-purple-400/50', 'text-white');
    } else {
      btn.classList.remove('bg-purple-600/40', 'border-purple-400/50', 'text-white');
    }
  });
}

// --------------------------------------------------------------------------
// 4. FOOD PREFERENCE TOGGLES (Screen 4)
// --------------------------------------------------------------------------
function selectFoodPreference(food: 'Lunch' | 'Dinner' | 'Both' | 'Not Required') {
  formState.foodPreference = food;
  foodToggleBtns.forEach(btn => {
    if (btn.getAttribute('data-food') === food) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  updateSummaryPreview();
}

// --------------------------------------------------------------------------
// 5. REGISTRATION SUBMISSION (Screen 4 to 5)
// --------------------------------------------------------------------------
async function handleFormSubmit() {
  if (!formState.studentName) {
    goToStep(1);
    return;
  }

  // Loading state
  btnSubmitRegistration.disabled = true;
  submitBtnText.textContent = 'Registering...';
  submitBtnSpinner.classList.remove('hidden');

  try {
    const result = await submitGuestRegistration({
      studentName: formState.studentName,
      guestCount: formState.guestCount,
      foodPreference: formState.foodPreference
    });

    // Populate Success Screen details
    const passCode = result.id ? `#${result.id.toUpperCase().slice(-8)}` : `#ALV-${Math.floor(1000 + Math.random() * 9000)}`;
    successPassId.textContent = passCode;
    successStudent.textContent = formState.studentName;
    successGuests.textContent = `${formState.guestCount} ${formState.guestCount === 1 ? 'Guest' : 'Guests'}`;
    
    const foodMap: Record<string, string> = {
      'Lunch': 'Lunch (12:30 PM)',
      'Dinner': 'Dinner (7:30 PM)',
      'Both': 'Both (Lunch & Dinner)',
      'Not Required': 'Pass Only (No Food)'
    };
    successFood.textContent = foodMap[formState.foodPreference] || formState.foodPreference;

    // Slide to Screen 5
    goToStep(4);
  } catch (error) {
    console.error("Submission failed:", error);
    alert("Registration could not be completed. Please try again.");
  } finally {
    btnSubmitRegistration.disabled = false;
    submitBtnText.textContent = 'Submit Registration';
    submitBtnSpinner.classList.add('hidden');
  }
}

function resetRegistrationForm() {
  formState.studentName = '';
  formState.guestCount = 2;
  formState.foodPreference = 'Both';

  studentSearchInput.value = '';
  btnClearStudent.classList.add('hidden');
  selectedStudentChip.classList.add('hidden');
  selectedStudentChip.classList.remove('flex');
  btnNextTo3.disabled = true;

  updateGuestCount(2);
  selectFoodPreference('Both');
  goToStep(0);
}

// --------------------------------------------------------------------------
// 6. ADMIN DASHBOARD & PIN AUTHENTICATION
// --------------------------------------------------------------------------
function updatePinDots() {
  pinDots.forEach((dot, index) => {
    if (index < adminPinBuffer.length) {
      dot.className = 'pin-dot w-4 h-4 rounded-full border-2 border-purple-400 bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.9)] transition-all scale-110';
    } else {
      dot.className = 'pin-dot w-4 h-4 rounded-full border-2 border-white/30 bg-transparent transition-all';
    }
  });
}

function handlePinInput(digit: string) {
  if (adminPinBuffer.length < 4) {
    adminPinBuffer += digit;
    updatePinDots();

    if (adminPinBuffer.length === 4) {
      verifyPin();
    }
  }
}

function deletePinDigit() {
  if (adminPinBuffer.length > 0) {
    adminPinBuffer = adminPinBuffer.slice(0, -1);
    updatePinDots();
    pinErrorMsg.textContent = '';
  }
}

function clearPin() {
  adminPinBuffer = '';
  updatePinDots();
  pinErrorMsg.textContent = '';
}

function verifyPin() {
  // Hardcoded JS validation to accept the PIN "1234"
  if (adminPinBuffer === '1234') {
    isAdminAuthenticated = true;
    adminLoginScreen.classList.add('hidden');
    adminDashboardScreen.classList.remove('hidden');
    pinErrorMsg.textContent = '';
    renderDashboard();
  } else {
    // Shake animation and reset
    adminLoginScreen.classList.add('shake');
    pinErrorMsg.textContent = 'Incorrect PIN. Please try again (PIN: 1234)';
    setTimeout(() => {
      adminLoginScreen.classList.remove('shake');
      clearPin();
    }, 500);
  }
}

// --------------------------------------------------------------------------
// 7. REAL-TIME ADMIN DASHBOARD (Metrics, Table & Search)
// --------------------------------------------------------------------------
function renderDashboard() {
  if (!isAdminAuthenticated) return;

  // 1. Calculate Real-time Summary Cards
  // Sum of all guest counts
  const totalGuests = allGuestsList.reduce((acc, g) => acc + (Number(g.guestCount) || 1), 0);
  
  // SEPARATE PLAN COUNTS:
  // Lunch Only: Guests who strictly chose 'Lunch'
  const lunchOnlyCount = allGuestsList.reduce((acc, g) => {
    return g.foodPreference === 'Lunch' ? acc + (Number(g.guestCount) || 1) : acc;
  }, 0);

  // Dinner Only: Guests who strictly chose 'Dinner'
  const dinnerOnlyCount = allGuestsList.reduce((acc, g) => {
    return g.foodPreference === 'Dinner' ? acc + (Number(g.guestCount) || 1) : acc;
  }, 0);

  // Both Plans: Guests who chose 'Both' (Lunch & Dinner)
  const bothCount = allGuestsList.reduce((acc, g) => {
    return g.foodPreference === 'Both' ? acc + (Number(g.guestCount) || 1) : acc;
  }, 0);

  // Not Required: Guests who chose 'Not Required'
  const notRequiredCount = allGuestsList.reduce((acc, g) => {
    return g.foodPreference === 'Not Required' ? acc + (Number(g.guestCount) || 1) : acc;
  }, 0);

  // Total Meal Portions Required for Catering/Kitchen:
  const totalLunchMeals = lunchOnlyCount + bothCount;
  const totalDinnerMeals = dinnerOnlyCount + bothCount;

  if (statTotalGuests) statTotalGuests.textContent = totalGuests.toLocaleString();
  if (statLunchOnly) statLunchOnly.textContent = lunchOnlyCount.toLocaleString();
  if (statDinnerOnly) statDinnerOnly.textContent = dinnerOnlyCount.toLocaleString();
  if (statBothPlan) statBothPlan.textContent = bothCount.toLocaleString();

  if (statLunchSub) statLunchSub.textContent = `Only Lunch (${lunchOnlyCount} guests)`;
  if (statDinnerSub) statDinnerSub.textContent = `Only Dinner (${dinnerOnlyCount} guests)`;
  if (statBothSub) statBothSub.textContent = `Lunch + Dinner (${bothCount} guests)`;

  if (statTotalLunchMeals) statTotalLunchMeals.textContent = totalLunchMeals.toLocaleString();
  if (statTotalDinnerMeals) statTotalDinnerMeals.textContent = totalDinnerMeals.toLocaleString();
  if (statCalcLunch) statCalcLunch.textContent = `${lunchOnlyCount} Lunch + ${bothCount} Both`;
  if (statCalcDinner) statCalcDinner.textContent = `${dinnerOnlyCount} Dinner + ${bothCount} Both`;
  if (statNotRequired) statNotRequired.textContent = notRequiredCount.toLocaleString();

  // 2. Filter Table Records
  const query = currentSearchQuery.trim().toLowerCase();
  const filtered = allGuestsList.filter(item => {
    const matchesSearch = !query || 
      item.studentName.toLowerCase().includes(query) || 
      item.foodPreference.toLowerCase().includes(query);
    
    const matchesFilter = currentFilter === 'all' || item.foodPreference === currentFilter;
    return matchesSearch && matchesFilter;
  });

  tableCountLabel.textContent = `Showing ${filtered.length} of ${allGuestsList.length} submissions`;

  // 3. Render Table Rows
  adminTableBody.innerHTML = '';
  if (filtered.length === 0) {
    const emptyTr = document.createElement('tr');
    emptyTr.innerHTML = `
      <td colspan="4" class="py-8 text-center text-white/40 italic">
        No guest registrations found matching the criteria.
      </td>
    `;
    adminTableBody.appendChild(emptyTr);
    return;
  }

  const badgeMap: Record<string, { bg: string; text: string; label: string }> = {
    'Lunch': { bg: 'bg-amber-500/20 border-amber-500/30', text: 'text-amber-300', label: '☀️ Lunch' },
    'Dinner': { bg: 'bg-indigo-500/20 border-indigo-500/30', text: 'text-indigo-300', label: '🌙 Dinner' },
    'Both': { bg: 'bg-purple-500/20 border-purple-500/30', text: 'text-purple-300', label: '✨ Both' },
    'Not Required': { bg: 'bg-slate-500/20 border-slate-500/30', text: 'text-slate-300', label: '✕ None' }
  };

  filtered.forEach(guest => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-white/[0.03] transition-colors';
    
    const badge = badgeMap[guest.foodPreference] || badgeMap['Not Required'];

    tr.innerHTML = `
      <td class="py-3 px-4 font-semibold text-white">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-md bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-bold">
            ${getInitials(guest.studentName)}
          </span>
          <span class="truncate max-w-[140px] sm:max-w-[200px]">${escapeHtml(guest.studentName)}</span>
        </div>
      </td>
      <td class="py-3 px-4 text-center">
        <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/10 text-white font-bold text-xs">
          ${guest.guestCount}
        </span>
      </td>
      <td class="py-3 px-4">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${badge.bg} ${badge.text}">
          ${badge.label}
        </span>
      </td>
      <td class="py-3 px-4 text-right text-white/50 font-mono text-[11px]">
        ${guest.createdDate || 'Recent'}
      </td>
    `;
    adminTableBody.appendChild(tr);
  });
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// --------------------------------------------------------------------------
// 8. CSV EXPORT FEATURE
// --------------------------------------------------------------------------
function downloadCSV() {
  if (allGuestsList.length === 0) {
    alert("No records to export.");
    return;
  }

  const headers = ["Student Name", "Guest Count", "Food Preference", "Timestamp"];
  const rows = allGuestsList.map(g => [
    `"${g.studentName.replace(/"/g, '""')}"`,
    g.guestCount,
    `"${g.foodPreference}"`,
    `"${g.createdDate || new Date().toISOString()}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [
    headers.join(","),
    ...rows.map(e => e.join(","))
  ].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `ALVEORA_Guests_Export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --------------------------------------------------------------------------
// 9. URL HASH ROUTING (#admin vs #portal)
// --------------------------------------------------------------------------
function handleHashRoute() {
  const hash = window.location.hash;
  if (hash === '#admin') {
    portalView.classList.add('hidden');
    adminView.classList.remove('hidden');

    appContainer.classList.remove('max-w-md');
    appContainer.classList.add('max-w-4xl');

    navModeBtn.href = '#';
    navModeLabel.textContent = 'Portal';

    if (isAdminAuthenticated) {
      adminLoginScreen.classList.add('hidden');
      adminDashboardScreen.classList.remove('hidden');
      renderDashboard();
    } else {
      adminLoginScreen.classList.remove('hidden');
      adminDashboardScreen.classList.add('hidden');
      clearPin();
    }
  } else {
    portalView.classList.remove('hidden');
    adminView.classList.add('hidden');

    appContainer.classList.add('max-w-md');
    appContainer.classList.remove('max-w-4xl');

    navModeBtn.href = '#admin';
    navModeLabel.textContent = 'Admin';
  }
}

// --------------------------------------------------------------------------
// 10. SETUP EVENT LISTENERS & INITIALIZATION
// --------------------------------------------------------------------------
function initEventListeners() {
  // Live Clock
  function updateClock() {
    const now = new Date();
    iosClock.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  updateClock();
  setInterval(updateClock, 1000);

  // Screen 1
  btnStartReg.addEventListener('click', () => goToStep(1));

  // Enforce zero horizontal scroll offset on slider container
  if (sliderContainer) {
    sliderContainer.addEventListener('scroll', () => {
      if (sliderContainer.scrollLeft !== 0) {
        sliderContainer.scrollLeft = 0;
      }
    });

    // Touch & Swipe Gesture Controller for Fluid iOS Swiping
    let touchStartX = 0;
    let touchStartY = 0;
    let touchCurrentX = 0;
    let isSwiping = false;

    sliderContainer.addEventListener('touchstart', (e: TouchEvent) => {
      // Don't swipe if interacting with input or stepper buttons
      const target = e.target as HTMLElement;
      if (target.closest('input, button, select, textarea, .ios-food-toggle')) {
        return;
      }
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchCurrentX = touchStartX;
      isSwiping = true;
    }, { passive: true });

    sliderContainer.addEventListener('touchmove', (e: TouchEvent) => {
      if (!isSwiping) return;
      touchCurrentX = e.touches[0].clientX;
      const diffX = touchCurrentX - touchStartX;
      const diffY = e.touches[0].clientY - touchStartY;

      // Ignore if vertical scroll is dominant
      if (Math.abs(diffY) > Math.abs(diffX)) {
        return;
      }
    }, { passive: true });

    sliderContainer.addEventListener('touchend', (e: TouchEvent) => {
      if (!isSwiping) return;
      isSwiping = false;
      const diffX = touchCurrentX - touchStartX;
      const threshold = 45; // Min px swipe threshold

      // Swipe Left (Go Next)
      if (diffX < -threshold) {
        if (currentStep === 0) {
          goToStep(1);
        } else if (currentStep === 1) {
          if (formState.studentName && formState.studentName.length >= 2) {
            goToStep(2);
          }
        } else if (currentStep === 2) {
          goToStep(3);
        }
      } 
      // Swipe Right (Go Back)
      else if (diffX > threshold) {
        if (currentStep === 1) {
          goToStep(0);
        } else if (currentStep === 2) {
          goToStep(1);
        } else if (currentStep === 3) {
          goToStep(2);
        }
      }
    }, { passive: true });
  }

  // Screen 2: Student Input & Searchable Dropdown
  studentSearchInput.addEventListener('input', (e) => {
    const val = (e.target as HTMLInputElement).value;
    updateStudentName(val);
    filterStudentDropdown(val);
  });

  studentSearchInput.addEventListener('focus', () => {
    filterStudentDropdown(studentSearchInput.value);
  });

  studentSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If dropdown has items, pick the first one if not yet selected
      if (studentDropdownMenu && !studentDropdownMenu.classList.contains('hidden')) {
        const firstItem = studentSuggestionsList.querySelector('.student-dropdown-item');
        if (firstItem) {
          const picked = firstItem.getAttribute('data-student-name');
          if (picked) selectStudent(picked);
        }
      }
      if (formState.studentName && formState.studentName.length >= 2) {
        goToStep(2);
      }
    } else if (e.key === 'Escape') {
      if (studentDropdownMenu) studentDropdownMenu.classList.add('hidden');
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!studentDropdownMenu || !studentSearchInput) return;
    const target = e.target as HTMLElement;
    if (!studentSearchInput.contains(target) && !studentDropdownMenu.contains(target)) {
      studentDropdownMenu.classList.add('hidden');
    }
  });

  btnClearStudent.addEventListener('click', () => {
    studentSearchInput.value = '';
    updateStudentName('');
    filterStudentDropdown('');
    studentSearchInput.focus();
  });

  btnBackTo1.addEventListener('click', () => goToStep(0));
  btnNextTo3.addEventListener('click', () => {
    if (formState.studentName && formState.studentName.length >= 2) {
      goToStep(2);
    }
  });

  // Screen 3: Guest Stepper
  btnStepperMinus.addEventListener('click', () => updateGuestCount(formState.guestCount - 1));
  btnStepperPlus.addEventListener('click', () => updateGuestCount(formState.guestCount + 1));

  guestPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const c = parseInt(btn.getAttribute('data-count') || '2', 10);
      updateGuestCount(c);
    });
  });

  btnBackTo2.addEventListener('click', () => goToStep(1));
  btnNextTo4.addEventListener('click', () => goToStep(3));

  // Screen 4: Food Preference
  foodToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const food = btn.getAttribute('data-food') as any;
      selectFoodPreference(food);
    });
  });

  btnBackTo3.addEventListener('click', () => goToStep(2));
  btnSubmitRegistration.addEventListener('click', handleFormSubmit);

  // Screen 5: Success
  btnRegisterAnother.addEventListener('click', resetRegistrationForm);

  // Admin Keypad Events
  keypadBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const digit = btn.getAttribute('data-num');
      if (digit) handlePinInput(digit);
    });
  });

  keypadDel.addEventListener('click', deletePinDigit);
  keypadClear.addEventListener('click', clearPin);

  const pinDotsContainer = document.getElementById('pin-dots-container');
  if (pinDotsContainer) {
    pinDotsContainer.addEventListener('click', () => {
      adminPinHiddenInput.focus();
    });
  }

  adminPinHiddenInput.addEventListener('input', (e) => {
    const val = (e.target as HTMLInputElement).value;
    if (val) {
      const lastChar = val[val.length - 1];
      if (/^[0-9]$/.test(lastChar)) {
        handlePinInput(lastChar);
      }
      adminPinHiddenInput.value = '';
    }
  });

  // Allow physical keyboard for PIN
  window.addEventListener('keydown', (e) => {
    if (window.location.hash === '#admin' && !isAdminAuthenticated) {
      if (/^[0-9]$/.test(e.key)) {
        handlePinInput(e.key);
      } else if (e.key === 'Backspace') {
        deletePinDigit();
      } else if (e.key === 'Escape') {
        clearPin();
      }
    }
  });

  // Admin Search & Filter
  adminSearchInput.addEventListener('input', (e) => {
    currentSearchQuery = (e.target as HTMLInputElement).value;
    renderDashboard();
  });

  tableFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tableFilterBtns.forEach(b => {
        b.className = 'table-filter-btn px-2.5 py-1.5 rounded-lg bg-white/5 text-white/70 hover:text-white border border-white/10 transition-all';
      });
      btn.className = 'table-filter-btn px-2.5 py-1.5 rounded-lg bg-white/15 text-white font-medium border border-white/20 transition-all';
      currentFilter = btn.getAttribute('data-filter') || 'all';
      renderDashboard();
    });
  });

  // CSV Export
  btnExportCsv.addEventListener('click', downloadCSV);

  // Erase All Registration Data Button
  if (btnEraseAllData) {
    btnEraseAllData.addEventListener('click', async () => {
      const confirmed = window.confirm("നിലവിലുള്ള മുഴുവൻ രജിസ്ട്രേഷൻ ഡാറ്റയും എറൈസ് ചെയ്യണോ? (Do you want to erase all registration data? This cannot be undone.)");
      if (confirmed) {
        await eraseAllRegistrationData();
        renderDashboard();
      }
    });
  }

  // Quick Demo Add Button
  btnQuickDemoAdd.addEventListener('click', async () => {
    const randomStudents = ["Zaid Khan", "Sneha Roy", "Vikram Das", "Meera Sen", "Pooja Reddy"];
    const name = randomStudents[Math.floor(Math.random() * randomStudents.length)];
    const count = Math.floor(1 + Math.random() * 4);
    const foods: Array<'Lunch' | 'Dinner' | 'Both' | 'Not Required'> = ['Lunch', 'Dinner', 'Both', 'Not Required'];
    const food = foods[Math.floor(Math.random() * foods.length)];
    
    await submitGuestRegistration({
      studentName: `${name} (Guest)`,
      guestCount: count,
      foodPreference: food
    });
  });

  // Firebase Config Modal Events
  btnAdminConfig.addEventListener('click', () => {
    cfgApiKey.value = firebaseConfig.apiKey || '';
    cfgProjectId.value = firebaseConfig.projectId || '';
    cfgAuthDomain.value = firebaseConfig.authDomain || '';
    firebaseConfigModal.classList.remove('hidden');
  });

  btnCloseConfigModal.addEventListener('click', () => {
    firebaseConfigModal.classList.add('hidden');
  });

  btnResetDemoData.addEventListener('click', () => {
    resetLocalDemoData();
    firebaseConfigModal.classList.add('hidden');
  });

  btnSaveFirebaseCfg.addEventListener('click', () => {
    const newCfg = {
      ...defaultFirebaseConfig,
      apiKey: cfgApiKey.value.trim() || defaultFirebaseConfig.apiKey,
      projectId: cfgProjectId.value.trim() || defaultFirebaseConfig.projectId,
      authDomain: cfgAuthDomain.value.trim() || defaultFirebaseConfig.authDomain
    };
    updateFirebaseConfig(newCfg);
    firebaseConfigModal.classList.add('hidden');
    alert(isPlaceholderConfig(newCfg) ? "Config saved (operating in local fallback mode)." : "Firebase custom config saved and initialized!");
  });

  // Hash route changes
  window.addEventListener('hashchange', handleHashRoute);
}

// --------------------------------------------------------------------------
// BOOTSTRAP APPLICATION
// --------------------------------------------------------------------------
function init() {
  updateGuestCount(2);
  initEventListeners();
  handleHashRoute();

  // Status indicator listener
  const syncBadge = document.getElementById('admin-sync-badge');
  const syncDot = document.getElementById('admin-sync-dot');
  const syncText = document.getElementById('admin-sync-text');

  onSyncStatusChange((status) => {
    if (!syncBadge || !syncDot || !syncText) return;
    if (status === 'connected') {
      syncBadge.className = "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
      syncDot.className = "w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping";
      syncText.textContent = "Live Cloud Sync";
    } else {
      syncBadge.className = "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30";
      syncDot.className = "w-1.5 h-1.5 rounded-full bg-purple-400";
      syncText.textContent = "Instant Local Sync";
    }
  });

  // Subscribe to students list from Firebase Realtime Database
  subscribeToStudents((students) => {
    officialStudentsList = students;
    if (studentRosterCount) {
      studentRosterCount.textContent = `${students.length} available`;
    }
  });

  // Subscribe to real-time updates for guest registrations
  subscribeToGuests((guests) => {
    allGuestsList = guests;
    renderDashboard();
  });

  console.log("ALVEORA Festival App initialized with Firebase modular SDK support.");
}

init();
