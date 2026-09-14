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
// 0. GLOBAL LOADER (Wait for fonts)
// --------------------------------------------------------------------------
window.addEventListener('load', async () => {
  const loader = document.getElementById('global-loader');
  if (loader) {
    if (document.fonts) {
      // Wait for all custom fonts (Barabara, Manjari, etc.) to load to prevent FOUT
      await document.fonts.ready;
    }
    // Add a slight artificial delay for smoother UX
    setTimeout(() => {
      loader.classList.add('opacity-0');
      setTimeout(() => loader.remove(), 500);
    }, 150);
  }
});

// --------------------------------------------------------------------------
// 1. STATE MANAGEMENT
// --------------------------------------------------------------------------
interface FormState {
  studentName: string;
  selectedDate: string;
  guestCount: number;
  foodPreference: 'Lunch' | 'Dinner' | 'Both' | 'Not Required';
}

const formState: FormState = {
  studentName: '',
  selectedDate: 'Both Days',
  guestCount: 2,
  foodPreference: 'Both'
};

let currentStep = 0; // 0: Landing, 1: Lang, 2: Student, 3: Date, 4: Guests, 5: Food, 6: Success
let adminPinBuffer = '';
let isAdminAuthenticated = false;
let allGuestsList: GuestSubmission[] = [];
let currentFilter = 'all'; // Food filter
let currentDateFilter = 'all'; // Date filter
let currentSearchQuery = '';
let officialStudentsList: string[] = [];

// --------------------------------------------------------------------------
// i18n TRANSLATION LOGIC
// --------------------------------------------------------------------------
const translations = {
  en: {
    badge_fest: "Annual Cultural & Tech Festival 2026",
    landing_title: "Guest Registration Portal",
    landing_subtitle: "Welcome to the official guest entry system. Register companions easily for food catering and venue passes.",
    btn_start: "Start Registration",
    landing_features: "Fast • Verified Passes • Seamless Entry",
    
    student_title: "Student Name",
    student_subtitle: "Enter your full name to proceed with registration.",
    student_search_ph: "Search or enter student name...",
    student_roster: "Students Roster",
    student_host: "Festival Guest Host",
    student_ready: "Ready",
    
    date_title: "Which day will you attend?",
    date_subtitle: "Select the festival date for your pass and entry schedule.",
    date_day1_badge: "Day 1",
    date_saturday: "Saturday",
    date_opening: "Festival Opening",
    date_day2_badge: "Day 2",
    date_sunday: "Sunday",
    date_finale: "Grand Finale",
    date_both: "Both Days",
    date_both_desc: "Saturday & Sunday (Full Event Pass)",
    
    guests_title: "How many guests are coming?",
    guests_subtitle: "Select the number of companions attending with you.",
    guests_total: "Total Companions",
    guests_label: "Guests",
    
    food_title: "Select your food preference",
    food_subtitle: "Choose catering arrangements for your registered party.",
    food_lunch: "Lunch",
    food_dinner: "Dinner",
    food_both: "Both",
    food_both_desc: "Lunch & Dinner",
    food_none: "Not Required",
    food_none_desc: "Entry Pass Only",
    summary_label: "Registration Summary:",
    
    success_title: "Thank You! See you at",
    success_subtitle: "Your guest entry and festival meal preferences have been recorded.",
    pass_student: "Student",
    pass_guests: "Guests",
    pass_food: "Food Preference",
    pass_status: "Status",
    pass_confirmed: "Confirmed",
    
    btn_next: "Next",
    btn_back: "Back",
    btn_submit: "Submit Registration",
    btn_register_another: "Register Another Guest",
    btn_view_admin: "View in Admin Dashboard →"
  },
  ml: {
    badge_fest: "വാർഷിക കലാ സാങ്കേതിക മേള 2026",
    landing_title: "അതിഥി രജിസ്ട്രേഷൻ പോർട്ടൽ",
    landing_subtitle: "അതിഥികൾക്കുള്ള ഔദ്യോഗിക രജിസ്ട്രേഷൻ സിസ്റ്റത്തിലേക്ക് സ്വാഗതം. ഭക്ഷണത്തിനും പാസിനുമായി കൂടെവരുന്നവരെ എളുപ്പത്തിൽ രജിസ്റ്റർ ചെയ്യാം.",
    btn_start: "രജിസ്ട്രേഷൻ ആരംഭിക്കുക",
    landing_features: "വേഗത്തിൽ • വേരിഫൈഡ് പാസ്സ് • തടസ്സങ്ങളില്ലാത്ത പ്രവേശനം",
    
    student_title: "വിദ്യാർത്ഥിയുടെ പേര്",
    student_subtitle: "രജിസ്ട്രേഷൻ തുടരുന്നതിനായി നിങ്ങളുടെ മുഴുവൻ പേര് നൽകുക.",
    student_search_ph: "വിദ്യാർത്ഥിയുടെ പേര് നൽകുക...",
    student_roster: "വിദ്യാർത്ഥികളുടെ ലിസ്റ്റ്",
    student_host: "അതിഥിയുടെ ഹോസ്റ്റ്",
    student_ready: "റെഡി",
    
    date_title: "ഏത് ദിവസമാണ് പങ്കെടുക്കുന്നത്?",
    date_subtitle: "നിങ്ങളുടെ പാസിനും പ്രവേശനത്തിനുമുള്ള ഫെസ്റ്റിവൽ തീയതി തിരഞ്ഞെടുക്കുക.",
    date_day1_badge: "ദിവസം 1",
    date_saturday: "ശനിയാഴ്ച",
    date_opening: "ഉദ്ഘാടന ദിവസം",
    date_day2_badge: "ദിവസം 2",
    date_sunday: "ഞായറാഴ്ച",
    date_finale: "സമാപന ദിവസം",
    date_both: "രണ്ട് ദിവസവും",
    date_both_desc: "ശനി & ഞായർ (ഫുൾ ഇവൻ്റ് പാസ്)",
    
    guests_title: "എത്ര അതിഥികൾ വരുന്നുണ്ട്?",
    guests_subtitle: "നിങ്ങൾക്കൊപ്പം വരുന്ന അതിഥികളുടെ എണ്ണം തിരഞ്ഞെടുക്കുക.",
    guests_total: "ആകെ അതിഥികൾ",
    guests_label: "അതിഥികൾ",
    
    food_title: "ഭക്ഷണക്രമം തിരഞ്ഞെടുക്കുക",
    food_subtitle: "നിങ്ങൾക്കും അതിഥികൾക്കുമുള്ള ഭക്ഷണക്രമം തിരഞ്ഞെടുക്കുക.",
    food_lunch: "ഉച്ചഭക്ഷണം",
    food_dinner: "രാത്രിഭക്ഷണം",
    food_both: "രണ്ടും",
    food_both_desc: "ഉച്ചഭക്ഷണവും രാത്രിഭക്ഷണവും",
    food_none: "ആവശ്യമില്ല",
    food_none_desc: "എൻട്രി പാസ് മാത്രം",
    summary_label: "രജിസ്ട്രേഷൻ ചുരുക്കം:",
    
    success_title: "നന്ദി! കാണാം ഇവിടെ -",
    success_subtitle: "അതിഥികളുടെ വിവരങ്ങളും ഭക്ഷണക്രമവും വിജയകരമായി രേഖപ്പെടുത്തിയിരിക്കുന്നു.",
    pass_student: "വിദ്യാർത്ഥി",
    pass_guests: "അതിഥികൾ",
    pass_food: "ഭക്ഷണക്രമം",
    pass_status: "സ്റ്റാറ്റസ്",
    pass_confirmed: "കൺഫോംഡ്",
    
    btn_next: "തുടരുക",
    btn_back: "തിരികെ",
    btn_submit: "സബ്മിറ്റ് ചെയ്യുക",
    btn_register_another: "മറ്റൊരു അതിഥിയെ ചേർക്കുക",
    btn_view_admin: "അഡ്മിൻ ഡാഷ്ബോർഡിൽ കാണുക →"
  }
};

function applyLanguage(lang: 'en' | 'ml') {
  document.body.classList.remove('lang-ml', 'lang-en');
  document.body.classList.add(`lang-${lang}`);
  
  const dict = translations[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key && dict[key as keyof typeof dict]) {
      el.textContent = dict[key as keyof typeof dict];
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key && dict[key as keyof typeof dict]) {
      (el as HTMLInputElement).placeholder = dict[key as keyof typeof dict];
    }
  });
}

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
  document.getElementById('prog-dot-3') as HTMLElement,
  document.getElementById('prog-dot-4') as HTMLElement,
  document.getElementById('prog-dot-5') as HTMLElement
];
const screens = document.querySelectorAll('.slider-screen');

// Screen 1 Elements
const btnStartReg = document.getElementById('btn-start-reg') as HTMLButtonElement;

// Screen 2 (Lang) Elements
const btnLangEn = document.getElementById('btn-lang-en') as HTMLButtonElement;
const btnLangMl = document.getElementById('btn-lang-ml') as HTMLButtonElement;
const btnBackToLanding = document.getElementById('btn-back-to-landing') as HTMLButtonElement;

// Screen 3 (Student) Elements
const studentSearchInput = document.getElementById('student-search-input') as HTMLInputElement;
const btnClearStudent = document.getElementById('btn-clear-student') as HTMLButtonElement;
const studentDropdownMenu = document.getElementById('student-dropdown-menu') as HTMLElement;
const studentSuggestionsList = document.getElementById('student-suggestions-list') as HTMLElement;
const studentRosterCount = document.getElementById('student-roster-count') as HTMLElement;
const selectedStudentChip = document.getElementById('selected-student-chip') as HTMLElement;
const selectedStudentName = document.getElementById('selected-student-name') as HTMLElement;
const selectedInitials = document.getElementById('selected-initials') as HTMLElement;
const btnBackTo1 = document.getElementById('btn-back-to-1') as HTMLButtonElement;
const btnNextToDate = document.getElementById('btn-next-to-date') as HTMLButtonElement;

// Screen 4 (Date) Elements
const dateToggleBtns = document.querySelectorAll('.date-toggle-btn');
const btnBackToStudent = document.getElementById('btn-back-to-student') as HTMLButtonElement;
const btnNextToGuests = document.getElementById('btn-next-to-guests') as HTMLButtonElement;

// Screen 5 (Guests) Elements
const guestCountDisplay = document.getElementById('guest-count-display') as HTMLElement;
const guestCountLabel = document.getElementById('guest-count-label') as HTMLElement;
const btnStepperMinus = document.getElementById('btn-stepper-minus') as HTMLButtonElement;
const btnStepperPlus = document.getElementById('btn-stepper-plus') as HTMLButtonElement;
const guestPresetBtns = document.querySelectorAll('.guest-preset-btn');
const btnBackToDate = document.getElementById('btn-back-to-date') as HTMLButtonElement;
const btnNextToFood = document.getElementById('btn-next-to-food') as HTMLButtonElement;

// Screen 6 (Food) Elements
const foodToggleBtns = document.querySelectorAll('.ios-food-toggle');
const summaryBadgePreview = document.getElementById('summary-badge-preview') as HTMLElement;
const btnBackTo3 = document.getElementById('btn-back-to-3') as HTMLButtonElement;
const btnSubmitRegistration = document.getElementById('btn-submit-registration') as HTMLButtonElement;
const submitBtnText = document.getElementById('submit-btn-text') as HTMLElement;
const submitBtnSpinner = document.getElementById('submit-btn-spinner') as HTMLElement;

// Screen 7 (Success) Elements
const btnRegisterAnother = document.getElementById('btn-register-another') as HTMLButtonElement;
const successPassId = document.getElementById('success-pass-id') as HTMLElement;
const successStudent = document.getElementById('success-student') as HTMLElement;
const successGuests = document.getElementById('success-guests') as HTMLElement;
const successFood = document.getElementById('success-food') as HTMLElement;

// Sync & Status Elements
const syncStatusBadge = document.getElementById('sync-status-badge') as HTMLElement;
const syncStatusText = document.getElementById('sync-status-text') as HTMLElement;
const activeUserCount = document.getElementById('active-user-count') as HTMLElement;

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
const dateFilterBtns = document.querySelectorAll('.date-filter-btn');
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
// 1. SILKY SMOOTH SWIPING PAGE NAVIGATION (Screen 1 to 7)
// --------------------------------------------------------------------------
function goToStep(stepIndex: number) {
  currentStep = Math.max(0, Math.min(6, stepIndex));

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

  // Update progress bar (hide on Landing and Success)
  if (currentStep === 0 || currentStep === 6) {
    stepProgressWrapper.classList.add('hidden');
  } else {
    stepProgressWrapper.classList.remove('hidden');
    // We have 5 steps: Lang, Student, Date, Guests, Food
    const stepLabels = ['Language', 'Student Name', 'Attending Day', 'Guest Count', 'Food Preference'];
    stepIndicatorText.textContent = `Step ${currentStep} of 5`;
    
    // Attempt i18n for step name if possible, or fallback to default
    let stepLabelText = stepLabels[currentStep - 1] || '';
    if (document.body.classList.contains('lang-ml')) {
      const mlLabels = ['ഭാഷ', 'വിദ്യാർത്ഥിയുടെ പേര്', 'ദിവസം', 'അതിഥികൾ', 'ഭക്ഷണക്രമം'];
      stepLabelText = mlLabels[currentStep - 1] || stepLabelText;
    }
    stepNameText.textContent = stepLabelText;

    progDots.forEach((dot, idx) => {
      if (!dot) return;
      if (idx < currentStep) {
        dot.className = 'h-full flex-1 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.7)] transition-all duration-300';
      } else {
        dot.className = 'h-full flex-1 rounded-full bg-white/10 transition-all duration-300';
      }
    });
  }

  // Auto focus input if navigating to step 2 (Student)
  if (currentStep === 2) {
    setTimeout(() => {
      if (sliderContainer) sliderContainer.scrollLeft = 0;
      studentSearchInput.focus({ preventScroll: true });
    }, 200);
  }

  // Update step 6 summary preview
  if (currentStep === 5) {
    updateSummaryPreview();
  }

  // Trigger text & pass card entrance animation ONLY after arriving at Screen 7 (Success)
  const screenSuccess = screens[6];
  if (currentStep === 6) {
    if (screenSuccess) {
      screenSuccess.classList.remove('screen-success-animate');
      // Reflow to restart animation sequence cleanly
      void (screenSuccess as HTMLElement).offsetWidth;
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
    btnNextToDate.disabled = false;
    btnNextToDate.classList.remove('opacity-45', 'cursor-not-allowed');
  } else {
    selectedStudentChip.classList.add('hidden');
    selectedStudentChip.classList.remove('flex');

    // Disable Next button until at least 2 characters are entered
    btnNextToDate.disabled = true;
    btnNextToDate.classList.add('opacity-45', 'cursor-not-allowed');
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
      selectedDate: formState.selectedDate,
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

    // Slide to Screen 7 (Success)
    goToStep(6);
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
  formState.selectedDate = 'Both Days';
  formState.guestCount = 2;
  formState.foodPreference = 'Both';

  studentSearchInput.value = '';
  btnClearStudent.classList.add('hidden');
  selectedStudentChip.classList.add('hidden');
  selectedStudentChip.classList.remove('flex');
  btnNextToDate.disabled = true;

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
  // 1. Filter by Date First
  // "Both Days" guests show up for '19' and '20' date filters.
  const dateFilteredList = allGuestsList.filter(item => {
    if (currentDateFilter === 'all') return true;
    if (item.selectedDate === 'Both Days') return true;
    return item.selectedDate === currentDateFilter;
  });

  // 2. Calculate Real-time Summary Cards (based on date-filtered data)
  const totalGuests = dateFilteredList.reduce((acc, g) => acc + (Number(g.guestCount) || 1), 0);
  
  const lunchOnlyCount = dateFilteredList.reduce((acc, g) => {
    return g.foodPreference === 'Lunch' ? acc + (Number(g.guestCount) || 1) : acc;
  }, 0);

  const dinnerOnlyCount = dateFilteredList.reduce((acc, g) => {
    return g.foodPreference === 'Dinner' ? acc + (Number(g.guestCount) || 1) : acc;
  }, 0);

  const bothCount = dateFilteredList.reduce((acc, g) => {
    return g.foodPreference === 'Both' ? acc + (Number(g.guestCount) || 1) : acc;
  }, 0);

  const notRequiredCount = dateFilteredList.reduce((acc, g) => {
    return g.foodPreference === 'Not Required' ? acc + (Number(g.guestCount) || 1) : acc;
  }, 0);

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

  // 3. Filter Table Records by Food and Search
  const query = currentSearchQuery.trim().toLowerCase();
  const tableFilteredList = dateFilteredList.filter(item => {
    const matchesSearch = !query || 
      item.studentName.toLowerCase().includes(query) || 
      item.foodPreference.toLowerCase().includes(query);
    
    const matchesFilter = currentFilter === 'all' || item.foodPreference === currentFilter;
    return matchesSearch && matchesFilter;
  });

  tableCountLabel.textContent = `Showing ${tableFilteredList.length} of ${allGuestsList.length} total submissions`;

  // 4. Render Table Rows
  adminTableBody.innerHTML = '';
  if (tableFilteredList.length === 0) {
    const emptyTr = document.createElement('tr');
    emptyTr.innerHTML = `
      <td colspan="5" class="py-8 text-center text-white/40 italic">
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

  tableFilteredList.forEach(guest => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-white/[0.03] transition-colors';
    
    const badge = badgeMap[guest.foodPreference] || badgeMap['Not Required'];

    // Map the date for visual display
    let displayDate = guest.selectedDate;
    if (displayDate === '19') displayDate = 'Feb 19';
    if (displayDate === '20') displayDate = 'Feb 20';

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
      <td class="py-3 px-4 text-center">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-white/10 text-white/80">
          📅 ${displayDate}
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

  const headers = ["Student Name", "Guest Count", "Date", "Food Preference", "Timestamp"];
  const rows = allGuestsList.map(g => {
    let displayDate = g.selectedDate;
    if (displayDate === '19') displayDate = 'Feb 19';
    if (displayDate === '20') displayDate = 'Feb 20';
    
    return [
      `"${g.studentName.replace(/"/g, '""')}"`,
      g.guestCount,
      `"${displayDate}"`,
      `"${g.foodPreference}"`,
      `"${g.createdDate || new Date().toISOString()}"`
    ];
  });

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

  // Screen 1 (Will handle further down)

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
        } else if (currentStep === 3) {
          goToStep(4);
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
        } else if (currentStep === 4) {
          goToStep(3);
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

  // Screen 1: Landing
  btnStartReg.addEventListener('click', () => goToStep(1));

  // Screen 2: Language Selection
  btnLangEn.addEventListener('click', () => {
    applyLanguage('en');
    goToStep(2);
  });
  
  btnLangMl.addEventListener('click', () => {
    applyLanguage('ml');
    goToStep(2);
  });
  
  btnBackToLanding.addEventListener('click', () => goToStep(0));

  // Screen 3: Student
  btnClearStudent.addEventListener('click', () => {
    studentSearchInput.value = '';
    updateStudentName('');
    filterStudentDropdown('');
    studentSearchInput.focus();
  });

  btnBackTo1.addEventListener('click', () => goToStep(1));
  btnNextToDate.addEventListener('click', () => {
    if (formState.studentName && formState.studentName.length >= 2) {
      goToStep(3);
    }
  });

  // Screen 4: Date
  dateToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const selected = btn.getAttribute('data-date');
      if (selected) {
        formState.selectedDate = selected;
        // Update active class
        dateToggleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Auto-advance
        setTimeout(() => goToStep(4), 300);
      }
    });
  });
  
  btnBackToStudent.addEventListener('click', () => goToStep(2));
  btnNextToGuests.addEventListener('click', () => goToStep(4));

  // Screen 5: Guest Stepper
  btnStepperMinus.addEventListener('click', () => updateGuestCount(formState.guestCount - 1));
  btnStepperPlus.addEventListener('click', () => updateGuestCount(formState.guestCount + 1));

  guestPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const c = parseInt(btn.getAttribute('data-count') || '2', 10);
      updateGuestCount(c);
    });
  });

  btnBackToDate.addEventListener('click', () => goToStep(3));
  btnNextToFood.addEventListener('click', () => goToStep(5));

  // Screen 6: Food Preference
  foodToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const food = btn.getAttribute('data-food') as any;
      selectFoodPreference(food);
    });
  });

  btnBackTo3.addEventListener('click', () => goToStep(4));
  btnSubmitRegistration.addEventListener('click', handleFormSubmit);

  // Screen 7: Success
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

  dateFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dateFilterBtns.forEach(b => {
        b.className = 'date-filter-btn px-2.5 py-1.5 rounded-lg bg-white/5 text-white/70 hover:text-white border border-white/10 transition-all';
      });
      btn.className = 'date-filter-btn px-2.5 py-1.5 rounded-lg bg-white/15 text-white font-medium border border-white/20 transition-all';
      currentDateFilter = btn.getAttribute('data-filter') || 'all';
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
