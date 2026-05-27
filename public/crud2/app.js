import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    push, 
    onValue, 
    update, 
    remove, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// Firebase Configuration (ตามที่คุณให้มา)
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
const db = getDatabase(app);
const recordsRef = ref(db, "customers"); // ใช้ path "customers" ใน Realtime Database

// State Management
let customers = [];
let filteredCustomers = [];

// DOM Elements
const elements = {
    addBtn: document.getElementById('addBtn'),
    entryModal: document.getElementById('entryModal'),
    modalTitle: document.getElementById('modalTitle'),
    entryForm: document.getElementById('entryForm'),
    recordId: document.getElementById('recordId'),
    name: document.getElementById('name'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    role: document.getElementById('role'),
    status: document.getElementById('status'),
    saveBtnText: document.getElementById('saveBtnText'),
    searchInput: document.getElementById('searchInput'),
    totalCount: document.getElementById('totalCount'),
    desktopTableBody: document.getElementById('desktopTableBody'),
    mobileCardContainer: document.getElementById('mobileCardContainer'),
    emptyState: document.getElementById('emptyState'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    closeModalBtns: document.querySelectorAll('.closeModal'),
    modalOverlay: document.getElementById('modalOverlay')
};

// Toast Notification Helper
const toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
});

// Modal Logic
const openModal = (record = null) => {
    if (record) {
        elements.modalTitle.textContent = 'แก้ไขข้อมูลลูกค้า';
        elements.saveBtnText.textContent = 'อัปเดตข้อมูล';
        elements.recordId.value = record.id;
        elements.name.value = record.name;
        elements.email.value = record.email;
        elements.phone.value = record.phone;
        elements.role.value = record.role;
        elements.status.value = record.status;
    } else {
        elements.modalTitle.textContent = 'เพิ่มข้อมูลลูกค้าใหม่';
        elements.saveBtnText.textContent = 'บันทึกข้อมูล';
        elements.entryForm.reset();
        elements.recordId.value = '';
    }
    elements.entryModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

const closeModal = () => {
    elements.entryModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
};

// Rendering Logic
const getStatusClass = (status) => {
    switch(status?.toLowerCase()) {
        case 'active': return 'status-active';
        case 'pending': return 'status-pending';
        case 'inactive': return 'status-inactive';
        default: return '';
    }
};

const renderRecords = () => {
    const searchTerm = elements.searchInput.value.toLowerCase();
    
    filteredCustomers = customers.filter(customer => 
        customer.name?.toLowerCase().includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchTerm) ||
        customer.role?.toLowerCase().includes(searchTerm)
    );

    elements.totalCount.textContent = filteredCustomers.length;
    
    if (filteredCustomers.length === 0) {
        elements.emptyState.classList.remove('hidden');
        elements.desktopTableBody.innerHTML = '';
        elements.mobileCardContainer.innerHTML = '';
        return;
    }

    elements.emptyState.classList.add('hidden');

    // Desktop View
    elements.desktopTableBody.innerHTML = filteredCustomers.map(customer => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                        ${(customer.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-bold text-gray-900">${customer.name}</div>
                        <div class="text-xs text-gray-400">ID: ${customer.id.slice(0, 8)}...</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900 font-medium">${customer.email}</div>
                <div class="text-sm text-gray-500">${customer.phone}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                ${customer.role}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${getStatusClass(customer.status)}">
                    ${customer.status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end gap-3">
                    <button onclick="editEntry('${customer.id}')" class="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-2 rounded-lg transition-colors">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteEntry('${customer.id}')" class="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-lg transition-colors">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Mobile View
    elements.mobileCardContainer.innerHTML = filteredCustomers.map(customer => `
        <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm customer-card">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-3">
                    <div class="h-12 w-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-lg">
                        ${(customer.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-900">${customer.name}</h4>
                        <span class="px-2 py-0.5 text-[10px] font-bold rounded-full ${getStatusClass(customer.status)} uppercase tracking-wider">
                            ${customer.status}
                        </span>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="editEntry('${customer.id}')" class="p-2 text-indigo-600 bg-indigo-50 rounded-xl">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteEntry('${customer.id}')" class="p-2 text-red-600 bg-red-50 rounded-xl">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="space-y-3">
                <div class="flex items-center gap-3 text-sm">
                    <i class="fas fa-envelope text-gray-400 w-4"></i>
                    <span class="text-gray-600 font-medium">${customer.email}</span>
                </div>
                <div class="flex items-center gap-3 text-sm">
                    <i class="fas fa-phone text-gray-400 w-4"></i>
                    <span class="text-gray-600 font-medium">${customer.phone}</span>
                </div>
                <div class="flex items-center gap-3 text-sm">
                    <i class="fas fa-user-tag text-gray-400 w-4"></i>
                    <span class="text-gray-600 font-medium">${customer.role}</span>
                </div>
            </div>
        </div>
    `).join('');
};

// Realtime Database Operations
const fetchRecords = () => {
    elements.loadingOverlay.classList.remove('hidden');
    
    onValue(recordsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            customers = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            })).reverse(); // เรียงจากใหม่ไปเก่า
        } else {
            customers = [];
        }
        renderRecords();
        elements.loadingOverlay.classList.add('hidden');
    }, (error) => {
        console.error("Error fetching records: ", error);
        toast.fire({ icon: 'error', title: 'การเชื่อมต่อฐานข้อมูลล้มเหลว', text: error.message });
        elements.loadingOverlay.classList.add('hidden');
    });
};

const saveEntry = async (e) => {
    e.preventDefault();
    const id = elements.recordId.value;
    const data = {
        name: elements.name.value,
        email: elements.email.value,
        phone: elements.phone.value,
        role: elements.role.value,
        status: elements.status.value,
        updatedAt: serverTimestamp()
    };

    try {
        if (id) {
            await update(ref(db, `customers/${id}`), data);
            toast.fire({ icon: 'success', title: 'อัปเดตข้อมูลสำเร็จ' });
        } else {
            data.createdAt = serverTimestamp();
            await push(recordsRef, data);
            toast.fire({ icon: 'success', title: 'เพิ่มข้อมูลใหม่เรียบร้อย' });
        }
        closeModal();
    } catch (error) {
        console.error("Error saving entry: ", error);
        toast.fire({ 
            icon: 'error', 
            title: 'บันทึกข้อมูลไม่สำเร็จ',
            text: error.message 
        });
    }
};

window.editEntry = (id) => {
    const record = customers.find(c => c.id === id);
    if (record) openModal(record);
};

window.deleteEntry = async (id) => {
    const result = await Swal.fire({
        title: 'ยืนยันการลบ?',
        text: "ข้อมูลนี้จะถูกลบออกจากฐานข้อมูลถาวร",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'ลบข้อมูล',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true,
    });

    if (result.isConfirmed) {
        try {
            await remove(ref(db, `customers/${id}`));
            toast.fire({ icon: 'success', title: 'ลบข้อมูลเรียบร้อยแล้ว' });
        } catch (error) {
            console.error("Error deleting entry: ", error);
            toast.fire({ icon: 'error', title: 'ลบข้อมูลไม่สำเร็จ', text: error.message });
        }
    }
};

// Event Listeners
elements.addBtn.addEventListener('click', () => openModal());
elements.closeModalBtns.forEach(btn => btn.addEventListener('click', closeModal));
elements.modalOverlay.addEventListener('click', closeModal);
elements.entryForm.addEventListener('submit', saveEntry);
elements.searchInput.addEventListener('input', renderRecords);

// Online/Offline detection
window.addEventListener('online', () => {
    const statusEl = document.getElementById('connectionStatus');
    statusEl.classList.replace('text-gray-400', 'text-green-500');
    statusEl.innerHTML = '<span class="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>Online';
    toast.fire({ icon: 'success', title: 'กลับมาออนไลน์แล้ว' });
});

window.addEventListener('offline', () => {
    const statusEl = document.getElementById('connectionStatus');
    statusEl.classList.replace('text-green-500', 'text-gray-400');
    statusEl.innerHTML = '<span class="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>Offline';
    toast.fire({ icon: 'info', title: 'คุณกำลังออฟไลน์' });
});

// Initial Fetch
fetchRecords();
