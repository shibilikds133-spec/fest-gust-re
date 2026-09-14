/**
 * Firebase Realtime Database & Modular SDK Integration for ALVIORA
 * Handles student roster seeding, real-time searchable fetching,
 * guest registrations, and test-data purging.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  get, 
  set, 
  push, 
  onValue, 
  remove, 
  serverTimestamp as rtdbServerTimestamp,
  type Database 
} from 'firebase/database';

export interface GuestSubmission {
  id?: string;
  studentName: string;
  selectedDate?: '19' | '20' | 'Both Days' | string;
  guestCount: number;
  foodPreference: 'Lunch' | 'Dinner' | 'Both' | 'Not Required';
  timestamp: any;
  createdDate?: string;
}

// --------------------------------------------------------------------------
// 1. FIREBASE CONFIGURATION (ALVIORA Production)
// --------------------------------------------------------------------------
export const defaultFirebaseConfig = {
  apiKey: "AIzaSyAa7_1NIMI7-ruOfUnDPd5UE-V4om9h_l0",
  authDomain: "alviora-gust-registration.firebaseapp.com",
  databaseURL: "https://alviora-gust-registration-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "alviora-gust-registration",
  storageBucket: "alviora-gust-registration.firebasestorage.app",
  messagingSenderId: "30597998281",
  appId: "1:30597998281:web:f3a5fd9eeba5c7a08f4f18",
  measurementId: "G-SHYX5HDCPM"
};

export const OFFICIAL_STUDENTS_LIST: string[] = [
  'Sayyid misfar jifri',
  'Aflah',
  'Muhammed Nabhan',
  'Muhammed Rashid',
  'Muhammed Minhaj',
  'Muhammed Thameem',
  'Muhammed Rishan',
  'Muhammed Ziyad',
  'Muhammed Sahal',
  'Muhammed Suhail',
  'Ahmed Mueenudheen',
  'Muhammed Rabeeh',
  'Muhammed Hamdhan',
  'Muhammed Sinan',
  'Muhammed Anshif',
  'Muhammed Anshid',
  'Muhammed Raihan',
  'Muhammed Labeeb',
  'Muhammed Vaseem',
  'Muhammed Rabeeh T',
  'Muhammed Faheem',
  'Muhammed Sanah',
  'Muhammed Midlaj',
  'Adil Sinan',
  'Muhammed Bishar',
  'Nizamudheen',
  'Muhammed Shamil',
  'Ahmad Sahal',
  'Muhammed Harshad',
  'Muhammed Thoyyib',
  'Muhammed Muhaimin',
  'Muhammed Safwan',
  'Muhammed Yaseen',
  'Muhammed Rabeeh M',
  'Raihan',
  'Muhammed Damil',
  'Muhammed Vasil',
  'Muhammed Musthafa',
  'Muhammed Nuhman',
  'Farhan'
];

export let firebaseConfig = defaultFirebaseConfig;

let app: FirebaseApp | null = null;
let rtdb: Database | null = null;
let isConnectedToFirebase = false;
let syncStatusListener: ((status: 'connected' | 'local' | 'error', details?: string) => void) | null = null;

export function onSyncStatusChange(cb: (status: 'connected' | 'local' | 'error', details?: string) => void) {
  syncStatusListener = cb;
  syncStatusListener(isConnectedToFirebase ? 'connected' : 'local');
}

export function isPlaceholderConfig(config = firebaseConfig): boolean {
  return !config || 
         !config.apiKey || 
         config.apiKey === "YOUR_API_KEY" || 
         config.projectId === "YOUR_PROJECT_ID";
}

// --------------------------------------------------------------------------
// 2. INITIALIZE FIREBASE REALTIME DATABASE
// --------------------------------------------------------------------------
export function initFirebase() {
  try {
    if (!getApps().length) {
      app = initializeApp(defaultFirebaseConfig);
    } else {
      app = getApps()[0];
    }
    rtdb = getDatabase(app);
    isConnectedToFirebase = true;
    console.info("⚡ Firebase Realtime Database connected:", defaultFirebaseConfig.databaseURL);
    if (syncStatusListener) syncStatusListener('connected');

    // Auto-check and seed students list to Firebase
    ensureStudentsNodeExists();
  } catch (err) {
    console.warn("Firebase Realtime Database init warning, operating in local fallback:", err);
    isConnectedToFirebase = false;
    if (syncStatusListener) syncStatusListener('local');
  }
}

// --------------------------------------------------------------------------
// 3. AUTO-SEED 40 STUDENTS TO FIREBASE RTDB
// --------------------------------------------------------------------------
export async function ensureStudentsNodeExists(): Promise<string[]> {
  // If rtdb is connected, check and set
  if (rtdb) {
    try {
      const studentsRef = ref(rtdb, 'students');
      const snapshot = await get(studentsRef);
      if (!snapshot.exists()) {
        console.info("Students node not found in Firebase. Seeding official student names...");
        await set(studentsRef, OFFICIAL_STUDENTS_LIST);
        console.info("✅ Student names successfully uploaded to Firebase Realtime Database!");
      } else {
        const remoteData = snapshot.val();
        const remoteList = Array.isArray(remoteData) ? remoteData : Object.values(remoteData);
        if (OFFICIAL_STUDENTS_LIST.length > remoteList.length) {
          console.info(`Local list has ${OFFICIAL_STUDENTS_LIST.length} students, but Firebase has ${remoteList.length}. Updating Firebase...`);
          await set(studentsRef, OFFICIAL_STUDENTS_LIST);
          console.info("✅ Firebase students list updated with new additions!");
        } else {
          console.info("Students node exists in Firebase and is up to date.");
        }
      }
    } catch (err) {
      console.warn("Notice checking students node:", err);
    }
  }
  return [...OFFICIAL_STUDENTS_LIST];
}

/**
 * Subscribe to real-time updates for students list from Firebase
 */
export function subscribeToStudents(callback: (students: string[]) => void): () => void {
  if (rtdb) {
    try {
      const studentsRef = ref(rtdb, 'students');
      const unsub = onValue(studentsRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const list = Array.isArray(val) ? val : Object.values(val);
          callback(list as string[]);
        } else {
          // Fallback to default list
          callback([...OFFICIAL_STUDENTS_LIST]);
        }
      }, () => {
        callback([...OFFICIAL_STUDENTS_LIST]);
      });
      return unsub;
    } catch {
      callback([...OFFICIAL_STUDENTS_LIST]);
    }
  }

  callback([...OFFICIAL_STUDENTS_LIST]);
  return () => {};
}

// --------------------------------------------------------------------------
// 4. ERASE OLD TEST DATA & RESET
// --------------------------------------------------------------------------
const LOCAL_STORAGE_KEY = 'alveora_guests_records';
const LISTENERS: Array<(guests: GuestSubmission[]) => void> = [];

// Clear old mock/test records so user starts 100% fresh for original data
const HAS_ERASED_TEST_DATA_KEY = 'alveora_erased_initial_test_data_v2';
if (!localStorage.getItem(HAS_ERASED_TEST_DATA_KEY)) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
  localStorage.setItem(HAS_ERASED_TEST_DATA_KEY, 'true');
}

export function getLocalGuests(): GuestSubmission[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalGuests(guests: GuestSubmission[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(guests));
  LISTENERS.forEach(cb => cb(guests));
}

/**
 * Erase all registrations (test data purge)
 */
export async function eraseAllRegistrationData() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
  LISTENERS.forEach(cb => cb([]));

  if (rtdb) {
    try {
      const registrationsRef = ref(rtdb, 'registrations');
      await remove(registrationsRef);
      console.info("Cleared all registrations from Firebase Realtime Database.");
    } catch (err) {
      console.warn("Purged local data. Remote purge note:", err);
    }
  }
}

// --------------------------------------------------------------------------
// 5. GUEST REGISTRATION OPERATIONS (REALTIME DATABASE + OFFLINE-FIRST)
// --------------------------------------------------------------------------
export async function submitGuestRegistration(data: {
  studentName: string;
  selectedDate?: string;
  guestCount: number;
  foodPreference: 'Lunch' | 'Dinner' | 'Both' | 'Not Required';
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const current = getLocalGuests();
  const passId = `ALV-${Math.floor(10000 + Math.random() * 90000)}`;

  const newGuest: GuestSubmission = {
    id: passId,
    studentName: data.studentName.trim(),
    selectedDate: data.selectedDate || 'Both Days',
    guestCount: Number(data.guestCount),
    foodPreference: data.foodPreference,
    timestamp: new Date().toISOString(),
    createdDate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  // 1. If Firebase RTDB is ready, push to 'registrations'
  if (rtdb) {
    try {
      const registrationsRef = ref(rtdb, 'registrations');
      const newEntryRef = push(registrationsRef);
      await set(newEntryRef, {
        passId: passId,
        studentName: data.studentName.trim(),
        selectedDate: data.selectedDate || 'Both Days',
        guestCount: Number(data.guestCount),
        foodPreference: data.foodPreference,
        timestamp: rtdbServerTimestamp(),
        createdAtString: new Date().toISOString()
      });
      console.info("Registration pushed to Firebase Realtime Database with key:", newEntryRef.key);
    } catch (err) {
      console.warn("Saved to local storage, sync error with RTDB:", err);
    }
  }

  // 2. Always persist locally as well for instant UI response
  const updated = [newGuest, ...current];
  saveLocalGuests(updated);

  return { success: true, id: passId };
}

/**
 * Subscribe to real-time updates for guest registrations
 */
export function subscribeToGuests(callback: (guests: GuestSubmission[]) => void): () => void {
  if (rtdb) {
    try {
      const registrationsRef = ref(rtdb, 'registrations');
      const unsub = onValue(registrationsRef, (snapshot) => {
        if (snapshot.exists()) {
          const remoteList: GuestSubmission[] = [];
          snapshot.forEach((childSnap) => {
            const val = childSnap.val();
            let formattedTime = 'Just now';
            if (val.createdAtString) {
              formattedTime = new Date(val.createdAtString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            remoteList.unshift({
              id: val.passId || childSnap.key || `alv-${Math.floor(1000 + Math.random() * 9000)}`,
              studentName: val.studentName || 'Student',
              selectedDate: val.selectedDate || 'Both Days',
              guestCount: Number(val.guestCount) || 1,
              foodPreference: val.foodPreference || 'Not Required',
              timestamp: val.createdAtString || new Date().toISOString(),
              createdDate: formattedTime
            });
          });
          
          // Merge with local guests
          const localGuests = getLocalGuests();
          const remoteIds = new Set(remoteList.map(g => g.id));
          const localOnly = localGuests.filter(g => !remoteIds.has(g.id));
          const mergedList = [...remoteList, ...localOnly].sort((a, b) => {
            return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
          });
          
          callback(mergedList);
          return;
        } else {
          // If no remote records yet, deliver local storage
          callback(getLocalGuests());
        }
      }, () => {
        callback(getLocalGuests());
      });

      return unsub;
    } catch {
      console.info("Falling back to local observer.");
    }
  }

  LISTENERS.push(callback);
  callback(getLocalGuests());

  return () => {
    const idx = LISTENERS.indexOf(callback);
    if (idx !== -1) LISTENERS.splice(idx, 1);
  };
}

export function updateFirebaseConfig(newConfig: typeof defaultFirebaseConfig) {
  firebaseConfig = newConfig;
  initFirebase();
}

export function resetLocalDemoData() {
  eraseAllRegistrationData();
}

// Initial bootstrap
initFirebase();

