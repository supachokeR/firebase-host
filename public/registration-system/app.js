import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const loginSection = document.getElementById('login-section');
const mainSection = document.getElementById('main-section');
const loginForm = document.getElementById('login-form');
const recordForm = document.getElementById('record-form');
const recordsList = document.getElementById('records-list');
const emptyState = document.getElementById('empty-state');
const logoutBtn = document.getElementById('logout-btn');
const userDisplay = document.getElementById('user-display');
const setupDbBtn = document.getElementById('setup-db-btn');
const signupBtn = document.getElementById('signup-btn');
const adminTools = document.getElementById('admin-tools');
const cancelBtn = document.getElementById('cancel-btn');
const formTitle = document.getElementById('form-title');

let currentUser = null;
let userRole = 'user';

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        userDisplay.textContent = user.email;
        
        // Fetch User Role
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                userRole = userDoc.data().role || 'user';
            } else {
                userRole = 'user';
            }
            
            if (userRole === 'admin') {
                adminTools.classList.remove('hidden');
            } else {
                adminTools.classList.add('hidden');
            }
        } catch (error) {
            console.error("Error fetching role:", error);
        }

        showSection('main');
        loadRecords();
    } else {
        currentUser = null;
        showSection('login');
    }
    hideLoading();
});

// Helper: Show/Hide Sections
function showSection(section) {
    loginSection.classList.add('hidden');
    mainSection.classList.add('hidden');
    
    if (section === 'login') {
        loginSection.classList.remove('hidden');
    } else if (section === 'main') {
        mainSection.classList.remove('hidden');
    }
}

function hideLoading() {
    loadingScreen.classList.add('opacity-0');
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 500);
}

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        Swal.fire({
            icon: 'success',
            title: 'เข้าสู่ระบบสำเร็จ',
            timer: 1500,
            showConfirmButton: false
        });
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'เข้าสู่ระบบไม่สำเร็จ',
            text: error.message
        });
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// CRUD: Load Records
function loadRecords() {
    const q = query(collection(db, 'records'), orderBy('createdAt', 'desc'));
    
    onSnapshot(q, (snapshot) => {
        recordsList.innerHTML = '';
        if (snapshot.empty) {
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        snapshot.forEach((doc) => {
            const data = doc.data();
            const row = document.createElement('tr');
            row.className = 'border-b hover:bg-gray-50 transition';
            row.innerHTML = `
                <td class="py-3 px-4">${data.fullname}</td>
                <td class="py-3 px-4">${data.phone}</td>
                <td class="py-3 px-4">${data.email}</td>
                <td class="py-3 px-4">
                    <div class="flex space-x-2">
                        <button onclick="editRecord('${doc.id}')" class="text-blue-500 hover:text-blue-700">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${userRole === 'admin' ? `
                        <button onclick="deleteRecord('${doc.id}')" class="text-red-500 hover:text-red-700">
                            <i class="fas fa-trash"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            `;
            recordsList.appendChild(row);
        });
    });
}

// CRUD: Save/Update Record
recordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('record-id').value;
    const data = {
        fullname: document.getElementById('fullname').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        updatedAt: new Date(),
        createdBy: currentUser.uid
    };

    try {
        if (id) {
            await updateDoc(doc(db, 'records', id), data);
            Swal.fire('สำเร็จ', 'อัปเดตข้อมูลเรียบร้อยแล้ว', 'success');
        } else {
            data.createdAt = new Date();
            await addDoc(collection(db, 'records'), data);
            Swal.fire('สำเร็จ', 'บันทึกข้อมูลเรียบร้อยแล้ว', 'success');
        }
        resetForm();
    } catch (error) {
        Swal.fire('ผิดพลาด', error.message, 'error');
    }
});

// CRUD: Edit
window.editRecord = async (id) => {
    const docSnap = await getDoc(doc(db, 'records', id));
    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('record-id').value = id;
        document.getElementById('fullname').value = data.fullname;
        document.getElementById('phone').value = data.phone;
        document.getElementById('email').value = data.email;
        
        formTitle.textContent = 'แก้ไขข้อมูล';
        cancelBtn.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// CRUD: Delete
window.deleteRecord = async (id) => {
    const result = await Swal.fire({
        title: 'ยืนยันการลบ?',
        text: "คุณต้องการลบข้อมูลนี้ใช่หรือไม่?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'ใช่, ลบเลย!',
        cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, 'records', id));
            Swal.fire('ลบสำเร็จ!', 'ข้อมูลถูกลบออกจากระบบแล้ว', 'success');
        } catch (error) {
            Swal.fire('ผิดพลาด', error.message, 'error');
        }
    }
};

// Reset Form
function resetForm() {
    recordForm.reset();
    document.getElementById('record-id').value = '';
    formTitle.textContent = 'บันทึกข้อมูลใหม่';
    cancelBtn.classList.add('hidden');
}

cancelBtn.addEventListener('click', resetForm);

// Signup Logic
signupBtn.addEventListener('click', async () => {
    const { value: formValues } = await Swal.fire({
        title: 'สมัครสมาชิก',
        html:
            '<input id="reg-email" class="swal2-input" placeholder="อีเมล">' +
            '<input id="reg-password" type="password" class="swal2-input" placeholder="รหัสผ่าน">',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'สมัครสมาชิก',
        cancelButtonText: 'ยกเลิก',
        preConfirm: () => {
            return [
                document.getElementById('reg-email').value,
                document.getElementById('reg-password').value
            ]
        }
    });

    if (formValues) {
        const [email, password] = formValues;
        if (!email || !password) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุอีเมลและรหัสผ่าน', 'warning');

        Swal.fire({
            title: 'กำลังสมัครสมาชิก...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                role: 'user',
                email: email,
                createdAt: new Date()
            });
            Swal.fire('สำเร็จ', 'สมัครสมาชิกเรียบร้อยแล้ว', 'success');
        } catch (error) {
            Swal.fire('ผิดพลาด', error.message, 'error');
        }
    }
});

// Setup Database Function
setupDbBtn.addEventListener('click', async () => {
    const { value: formValues } = await Swal.fire({
        title: 'ตั้งค่าผู้ดูแลระบบ (Admin Setup)',
        html:
            '<p class="text-xs text-red-500 mb-2 font-sarabun">*ใช้เพื่อสร้างบัญชี Admin บัญชีแรกของระบบ</p>' +
            '<input id="swal-email" class="swal2-input" placeholder="อีเมล Admin">' +
            '<input id="swal-password" type="password" class="swal2-input" placeholder="รหัสผ่าน Admin">',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'สร้างบัญชี Admin',
        cancelButtonText: 'ยกเลิก',
        preConfirm: () => {
            return [
                document.getElementById('swal-email').value,
                document.getElementById('swal-password').value
            ]
        }
    });

    if (formValues) {
        const [email, password] = formValues;
        if (!email || !password) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุอีเมลและรหัสผ่าน', 'warning');

        Swal.fire({
            title: 'กำลังดำเนินการ...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            // Create user account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // Set role to admin in Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                role: 'admin',
                email: email,
                createdAt: new Date()
            });

            Swal.fire({
                icon: 'success',
                title: 'ตั้งค่าสำเร็จ',
                text: 'สร้างบัญชี Admin เรียบร้อยแล้ว ระบบกำลังพาคุณเข้าสู่หน้าหลัก',
                timer: 2000
            });
        } catch (error) {
            Swal.fire('ผิดพลาด', error.message, 'error');
        }
    }
});
