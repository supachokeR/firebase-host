import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  get,
  getDatabase,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  update,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const recordsRef = ref(db, "crud_records");

const elements = {
  form: document.querySelector("#recordForm"),
  formTitle: document.querySelector("#formTitle"),
  recordId: document.querySelector("#recordId"),
  name: document.querySelector("#name"),
  email: document.querySelector("#email"),
  phone: document.querySelector("#phone"),
  role: document.querySelector("#role"),
  status: document.querySelector("#status"),
  submitBtn: document.querySelector("#submitBtn"),
  submitText: document.querySelector("#submitText"),
  cancelEditBtn: document.querySelector("#cancelEditBtn"),
  searchInput: document.querySelector("#searchInput"),
  refreshBtn: document.querySelector("#refreshBtn"),
  totalRecords: document.querySelector("#totalRecords"),
  visibleRecords: document.querySelector("#visibleRecords"),
  loadingState: document.querySelector("#loadingState"),
  emptyState: document.querySelector("#emptyState"),
  emptyMessage: document.querySelector("#emptyMessage"),
  tableWrap: document.querySelector("#tableWrap"),
  recordsTable: document.querySelector("#recordsTable"),
  mobileList: document.querySelector("#mobileList"),
};

let records = [];
let unsubscribe = null;

const roleLabels = {
  Customer: "ลูกค้า",
  Lead: "ผู้สนใจ",
  Partner: "พาร์ทเนอร์",
  Supplier: "ซัพพลายเออร์",
};

const statusLabels = {
  Active: "ใช้งานอยู่",
  Pending: "รอดำเนินการ",
  Inactive: "ไม่ใช้งาน",
};

const toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
});

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const normalize = (value = "") => String(value).trim().toLowerCase();

const setSubmitting = (isSubmitting) => {
  elements.submitBtn.disabled = isSubmitting;
  elements.submitText.textContent = isSubmitting ? "กำลังบันทึก..." : elements.recordId.value ? "อัปเดตข้อมูล" : "บันทึกข้อมูล";
};

const getStatusClass = (status) => {
  const key = normalize(status);

  if (key === "active") return "status-active";
  if (key === "pending") return "status-pending";
  return "status-inactive";
};

const setFormMode = (record = null) => {
  const isEditing = Boolean(record);

  elements.recordId.value = record?.id ?? "";
  elements.name.value = record?.name ?? "";
  elements.email.value = record?.email ?? "";
  elements.phone.value = record?.phone ?? "";
  elements.role.value = record?.role ?? "";
  elements.status.value = record?.status ?? "Active";
  elements.formTitle.textContent = isEditing ? "แก้ไขข้อมูล" : "เพิ่มข้อมูล";
  elements.submitText.textContent = isEditing ? "อัปเดตข้อมูล" : "บันทึกข้อมูล";
  elements.cancelEditBtn.classList.toggle("hidden", !isEditing);

  if (isEditing) {
    elements.name.focus();
    elements.form.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

const getFormData = () => ({
  name: elements.name.value.trim(),
  email: elements.email.value.trim(),
  phone: elements.phone.value.trim(),
  role: elements.role.value,
  status: elements.status.value,
});

const validateForm = ({ name, email, phone, role, status }) => {
  if (!name || !email || !phone || !role || !status) {
    toast.fire({ icon: "warning", title: "กรุณากรอกข้อมูลให้ครบ" });
    return false;
  }

  return true;
};

const getFilteredRecords = () => {
  const keyword = normalize(elements.searchInput.value);

  if (!keyword) return records;

  return records.filter((record) => {
    const searchable = [
      record.name,
      record.email,
      record.phone,
      record.role,
      getRoleLabel(record.role),
      record.status,
      getStatusLabel(record.status),
    ]
      .map(normalize)
      .join(" ");
    return searchable.includes(keyword);
  });
};

const getRoleLabel = (role) => roleLabels[role] ?? role;

const getStatusLabel = (status) => statusLabels[status] ?? status;

const renderStatus = (status) => `
  <span class="status-pill ${getStatusClass(status)}">${escapeHtml(getStatusLabel(status))}</span>
`;

const renderTableRow = (record) => `
  <tr class="transition hover:bg-slate-50">
    <td class="whitespace-nowrap px-5 py-4">
      <div class="font-bold text-slate-950">${escapeHtml(record.name)}</div>
      <div class="mt-1 text-xs text-slate-500">รหัส: ${escapeHtml(record.id.slice(0, 8))}</div>
    </td>
    <td class="px-5 py-4">
      <div class="text-sm font-semibold text-slate-800">${escapeHtml(record.email)}</div>
      <div class="mt-1 text-sm text-slate-500">${escapeHtml(record.phone)}</div>
    </td>
    <td class="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-700">${escapeHtml(getRoleLabel(record.role))}</td>
    <td class="whitespace-nowrap px-5 py-4">${renderStatus(record.status)}</td>
    <td class="whitespace-nowrap px-5 py-4 text-right">
      <div class="flex justify-end gap-2">
        <button class="action-btn edit-btn" type="button" data-action="edit" data-id="${escapeHtml(record.id)}">แก้ไข</button>
        <button class="action-btn delete-btn" type="button" data-action="delete" data-id="${escapeHtml(record.id)}">ลบ</button>
      </div>
    </td>
  </tr>
`;

const renderMobileCard = (record) => `
  <article class="p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="truncate text-base font-bold text-slate-950">${escapeHtml(record.name)}</h3>
        <p class="mt-1 truncate text-sm text-slate-500">${escapeHtml(record.email)}</p>
      </div>
      ${renderStatus(record.status)}
    </div>

    <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
      <div>
        <dt class="font-semibold text-slate-500">เบอร์โทร</dt>
        <dd class="mt-1 font-bold text-slate-800">${escapeHtml(record.phone)}</dd>
      </div>
      <div>
        <dt class="font-semibold text-slate-500">ประเภท</dt>
        <dd class="mt-1 font-bold text-slate-800">${escapeHtml(getRoleLabel(record.role))}</dd>
      </div>
    </dl>

    <div class="mt-4 grid grid-cols-2 gap-2">
      <button class="action-btn edit-btn" type="button" data-action="edit" data-id="${escapeHtml(record.id)}">แก้ไข</button>
      <button class="action-btn delete-btn" type="button" data-action="delete" data-id="${escapeHtml(record.id)}">ลบ</button>
    </div>
  </article>
`;

const updateStateVisibility = (filteredRecords) => {
  const isLoading = elements.loadingState.dataset.active === "true";
  const hasRecords = filteredRecords.length > 0;
  const hasSearch = elements.searchInput.value.trim().length > 0;

  elements.loadingState.classList.toggle("hidden", !isLoading);
  elements.emptyState.classList.toggle("hidden", isLoading || hasRecords);
  elements.emptyState.classList.toggle("flex", !isLoading && !hasRecords);
  elements.tableWrap.classList.toggle("hidden", isLoading || !hasRecords);
  elements.mobileList.classList.toggle("hidden", isLoading || !hasRecords);
  elements.emptyMessage.textContent = hasSearch
    ? "ไม่พบข้อมูลที่ตรงกับคำค้นหา ลองใช้คำอื่นอีกครั้ง"
    : "เพิ่มข้อมูลแรกเพื่อเริ่มจัดการรายการ";
};

const renderRecords = () => {
  const filteredRecords = getFilteredRecords();

  elements.totalRecords.textContent = records.length;
  elements.visibleRecords.textContent = filteredRecords.length;
  elements.recordsTable.innerHTML = filteredRecords.map(renderTableRow).join("");
  elements.mobileList.innerHTML = filteredRecords.map(renderMobileCard).join("");
  updateStateVisibility(filteredRecords);
};

const handleSnapshotError = (error) => {
  console.error(error);
  elements.loadingState.dataset.active = "false";
  renderRecords();
  Swal.fire({
    icon: "error",
    title: "เชื่อมต่อฐานข้อมูลไม่สำเร็จ",
    text: "ตรวจสอบว่า Realtime Database rules อนุญาตให้แอปอ่านและเขียนข้อมูลได้",
  });
};

const subscribeToRecords = () => {
  elements.loadingState.dataset.active = "true";
  updateStateVisibility([]);

  if (unsubscribe) unsubscribe();

  unsubscribe = onValue(
    recordsRef,
    (snapshot) => {
      const data = snapshot.val() ?? {};
      records = Object.entries(data)
        .map(([id, value]) => ({
          id,
          ...value,
        }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      elements.loadingState.dataset.active = "false";
      renderRecords();
    },
    handleSnapshotError,
  );
};

const refreshOnce = async () => {
  elements.refreshBtn.disabled = true;

  try {
    const snapshot = await get(recordsRef);
    const data = snapshot.val() ?? {};
    records = Object.entries(data)
      .map(([id, value]) => ({
        id,
        ...value,
      }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    renderRecords();
    toast.fire({ icon: "success", title: "รีเฟรชข้อมูลแล้ว" });
  } catch (error) {
    console.error(error);
    toast.fire({ icon: "error", title: "รีเฟรชข้อมูลไม่สำเร็จ" });
  } finally {
    elements.refreshBtn.disabled = false;
  }
};

const saveRecord = async (event) => {
  event.preventDefault();

  const recordId = elements.recordId.value;
  const payload = getFormData();

  if (!validateForm(payload)) return;

  setSubmitting(true);

  try {
    if (recordId) {
      await update(ref(db, `crud_records/${recordId}`), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
      toast.fire({ icon: "success", title: "อัปเดตข้อมูลแล้ว" });
    } else {
      await update(push(recordsRef), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.fire({ icon: "success", title: "เพิ่มข้อมูลแล้ว" });
    }

    elements.form.reset();
    setFormMode();
  } catch (error) {
    console.error(error);
    toast.fire({ icon: "error", title: "บันทึกข้อมูลไม่สำเร็จ" });
  } finally {
    setSubmitting(false);
  }
};

const editRecord = (id) => {
  const record = records.find((item) => item.id === id);

  if (!record) {
    toast.fire({ icon: "error", title: "ไม่พบข้อมูล" });
    return;
  }

  setFormMode(record);
};

const deleteRecord = async (id) => {
  const record = records.find((item) => item.id === id);

  if (!record) {
    toast.fire({ icon: "error", title: "ไม่พบข้อมูล" });
    return;
  }

  const result = await Swal.fire({
    icon: "warning",
    title: "ต้องการลบข้อมูลนี้?",
    text: `${record.name} จะถูกลบออกจากระบบถาวร`,
    showCancelButton: true,
    confirmButtonText: "ลบข้อมูล",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#64748b",
    reverseButtons: true,
  });

  if (!result.isConfirmed) return;

  try {
    await remove(ref(db, `crud_records/${id}`));
    toast.fire({ icon: "success", title: "ลบข้อมูลแล้ว" });

    if (elements.recordId.value === id) {
      elements.form.reset();
      setFormMode();
    }
  } catch (error) {
    console.error(error);
    toast.fire({ icon: "error", title: "ลบข้อมูลไม่สำเร็จ" });
  }
};

const handleRecordAction = (event) => {
  const button = event.target.closest("[data-action]");

  if (!button) return;

  const { action, id } = button.dataset;

  if (action === "edit") editRecord(id);
  if (action === "delete") deleteRecord(id);
};

elements.form.addEventListener("submit", saveRecord);
elements.cancelEditBtn.addEventListener("click", () => {
  elements.form.reset();
  setFormMode();
});
elements.searchInput.addEventListener("input", renderRecords);
elements.refreshBtn.addEventListener("click", refreshOnce);
elements.recordsTable.addEventListener("click", handleRecordAction);
elements.mobileList.addEventListener("click", handleRecordAction);
window.addEventListener("online", () => toast.fire({ icon: "success", title: "กลับมาออนไลน์แล้ว" }));
window.addEventListener("offline", () => toast.fire({ icon: "warning", title: "คุณกำลังออฟไลน์" }));

subscribeToRecords();
