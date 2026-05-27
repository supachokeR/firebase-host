const { initializeApp } = require("firebase/app");
const {
  getDatabase,
  ref,
  push,
  get,
  serverTimestamp,
} = require("firebase/database");

const firebaseConfig = {
  apiKey: "AIzaSyDUcwd_8TYrJzYK6ole3FmGOy68HiYS0SY",
  authDomain: "fir-host-409cc.firebaseapp.com",
  databaseURL: "https://fir-host-409cc-default-rtdb.firebaseio.com",
  projectId: "fir-host-409cc",
  storageBucket: "fir-host-409cc.firebasestorage.app",
  messagingSenderId: "722995410827",
  appId: "1:722995410827:web:6c665c22b6d9694ff5a18e",
  measurementId: "G-F94TL1QJ9P",
};

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

async function runTest() {
  console.log("--- Firebase Realtime Database write test ---");

  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);
  const registrationsRef = ref(db, "registrations");

  const inputFormData = {
    name: "Form Test User",
    phone: "0800000000",
    email: "form-test@example.com",
    source: "test_registration.js",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  console.log("Saving input form fields:", {
    name: inputFormData.name,
    phone: inputFormData.phone,
    email: inputFormData.email,
  });

  const recordRef = await withTimeout(
    push(registrationsRef, inputFormData),
    30000,
    "Realtime Database write"
  );

  const snapshot = await withTimeout(
    get(recordRef),
    30000,
    "Realtime Database readback"
  );

  console.log("Saved record key:", recordRef.key);
  console.log("Readback data:", JSON.stringify(snapshot.val(), null, 2));
}

runTest()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test failed:", error.message);
    process.exit(1);
  });
