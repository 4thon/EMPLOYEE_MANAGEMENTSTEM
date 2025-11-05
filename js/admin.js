/* admin.js - Dashboard logic
   - employees => localStorage key 'employees'
   - attendanceLogs => localStorage key 'attendanceLogs'
   - users => localStorage key 'users'
*/

document.addEventListener('DOMContentLoaded', () => {
  // NAV + views
  const navBtns = document.querySelectorAll('.nav-btn');
  const views = document.querySelectorAll('.view');
  navBtns.forEach(b => b.addEventListener('click', () => {
    navBtns.forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    views.forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + b.dataset.view).classList.add('active');
    if (b.dataset.view === 'dashboard') refreshDashboard();
    if (b.dataset.view === 'employees') renderEmployees();
    if (b.dataset.view === 'attendance') renderAttendance();
    if (b.dataset.view === 'users') renderUsers();
  }));

  // Keys
  const EMP_KEY = 'employees';
  const LOG_KEY = 'attendanceLogs';
  const USER_KEY = 'users';

  // Cached DOM
  const cardTotal = document.getElementById('card-total-employees');
  const cardPresent = document.getElementById('card-present');
  const cardAbsent = document.getElementById('card-absent');
  const cardLogs = document.getElementById('card-logs');

  const employeesTbody = document.querySelector('#employeesTable tbody');
  const attendanceTbody = document.querySelector('#attendanceTable tbody');
  const usersTbody = document.querySelector('#usersTable tbody');

  const empSearch = document.getElementById('empSearch');
  const attSearch = document.getElementById('attSearch');
  const userSearch = document.getElementById('userSearch');

  const addEmployeeBtn = document.getElementById('addEmployeeBtn');
  const refreshEmployeesBtn = document.getElementById('refreshEmployeesBtn');
  const exportEmployeesBtn = document.getElementById('exportEmployeesBtn');
  const importEmployeesBtn = document.getElementById('importEmployeesBtn');
  const importEmployeesFile = document.getElementById('importEmployeesFile');

  const refreshAttendanceBtn = document.getElementById('refreshAttendanceBtn');
  const printAttendanceBtn = document.getElementById('printAttendanceBtn');

  const addUserBtn = document.getElementById('addUserBtn');

  const modalOverlay = document.getElementById('modalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalSave = document.getElementById('modalSave');
  const modalCancel = document.getElementById('modalCancel');

  const logoutBtn = document.getElementById('logoutBtn');
  const generateReportBtn = document.getElementById('generateReportBtn');
  const reportType = document.getElementById('reportType');
  const reportDate = document.getElementById('reportDate');
  const reportPreview = document.getElementById('reportPreview');

  // state
  let employees = JSON.parse(localStorage.getItem(EMP_KEY)) || [];
  let attendanceLogs = JSON.parse(localStorage.getItem(LOG_KEY)) || [];
  let users = JSON.parse(localStorage.getItem(USER_KEY)) || [];

  // Session & route protection: require sessionStorage.currentUser
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
  if (!currentUser) {
    // not logged in -> redirect to selection/login page
    // Change path below if your selection/login page filename differs:
    window.location.href = '../html/select-user.html';
    // stop further execution
    return;
  } else {
    // show welcome name
    document.getElementById('welcomeName').textContent = `Welcome, ${currentUser.fullname || currentUser.username}`;
    const chip = document.getElementById('currentUserChip');
    chip.innerHTML = `Role: <strong>${currentUser.role || 'Admin / HR'}</strong>`;
  }

  // seed localStorage from data folder if empty (fetch requires serving via server)
  async function seedIfEmpty() {
    try {
      if (!employees.length) {
        const r = await fetch('../data/employees.json');
        if (r.ok) {
          const data = await r.json();
          if (Array.isArray(data)) employees = data;
        }
      }
      if (!attendanceLogs.length) {
        const r2 = await fetch('../data/attendance.json');
        if (r2.ok) {
          const data2 = await r2.json();
          if (Array.isArray(data2)) attendanceLogs = data2;
        }
      }
      if (!users.length) {
        // default admin user (also used by login)
        users = [{ username: 'admin', password: 'admin', fullname: 'Administrator', role: 'Admin' }];
      }
      // persist
      localStorage.setItem(EMP_KEY, JSON.stringify(employees));
      localStorage.setItem(LOG_KEY, JSON.stringify(attendanceLogs));
      localStorage.setItem(USER_KEY, JSON.stringify(users));
    } catch (e) {
      // fetch failed (likely because files were opened without server) — that's OK, we just use localStorage defaults
      console.warn('Seed fetch failed (are you using Live Server?):', e);
    }
  }

  // run seed (don't await blocking UI)
  seedIfEmpty().then(() => {
    // refresh views after possible seed
    renderEmployees(); renderAttendance(); renderUsers(); refreshDashboard();
  });

  // UTIL
  function saveEmployees(){ localStorage.setItem(EMP_KEY, JSON.stringify(employees)); }
  function saveLogs(){ localStorage.setItem(LOG_KEY, JSON.stringify(attendanceLogs)); }
  function saveUsers(){ localStorage.setItem(USER_KEY, JSON.stringify(users)); }
  function escapeHtml(s){ if(!s && s !== 0) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function showToast(message, type='info'){
    const color = type === 'success' ? '#00ffcc' : type === 'warn' ? '#ffcc00' : '#00bfff';
    const p = document.createElement('div'); p.className='neon-popup'; p.textContent=message;
    p.style.borderColor = color; p.style.color = color; p.style.boxShadow = `0 0 18px ${color}`;
    document.body.appendChild(p); setTimeout(()=>p.classList.add('show'),10);
    setTimeout(()=>{p.classList.remove('show'); setTimeout(()=>p.remove(),300)},2200);
  }

  // RENDER
  function refreshDashboard(){
    cardTotal.textContent = employees.length;
    const today = new Date().toLocaleDateString();
    const present = attendanceLogs.filter(l => l.date === today && l.timeIn).length;
    const absents = employees.length - present;
    cardPresent.textContent = present;
    cardAbsent.textContent = absents >= 0 ? absents : 0;
    cardLogs.textContent = attendanceLogs.length;
  }

  function renderEmployees(filter=''){
    employeesTbody.innerHTML = '';
    const f = filter.trim().toLowerCase();
    employees.forEach((emp, idx) => {
      if(f && !(emp.id+emp.name+emp.position).toLowerCase().includes(f)) return;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><img src="${emp.photo || '../images/default-user.png'}" class="photo-thumb" /></td>
        <td>${escapeHtml(emp.id)}</td>
        <td>${escapeHtml(emp.name)}</td>
        <td>${escapeHtml(emp.position)}</td>
        <td>${escapeHtml(emp.contact || '')}</td>
        <td>
          <button class="btn ghost edit-emp" data-idx="${idx}">Edit</button>
          <button class="btn ghost del-emp" data-idx="${idx}">Delete</button>
        </td>
      `;
      employeesTbody.appendChild(tr);
    });
  }

  function renderAttendance(filter=''){
    attendanceTbody.innerHTML = '';
    const f = filter.trim().toLowerCase();
    attendanceLogs.forEach((log, idx) => {
      const key = (log.id+log.name+log.position+(log.date||'')).toLowerCase();
      if(f && !key.includes(f)) return;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(log.id||'')}</td>
        <td>${escapeHtml(log.name||'')}</td>
        <td>${escapeHtml(log.position||'')}</td>
        <td>${escapeHtml(log.timeIn||'')}</td>
        <td>${escapeHtml(log.timeOut||'—')}</td>
        <td>${escapeHtml(log.date||'')}</td>
        <td>
          <button class="btn ghost edit-log" data-idx="${idx}">Edit</button>
          <button class="btn ghost del-log" data-idx="${idx}">Delete</button>
        </td>
      `;
      attendanceTbody.appendChild(tr);
    });
  }

  function renderUsers(filter=''){
    usersTbody.innerHTML = '';
    const f = filter.trim().toLowerCase();
    users.forEach((u, idx) => {
      if(f && !(u.username+u.fullname+u.role).toLowerCase().includes(f)) return;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(u.username)}</td><td>${escapeHtml(u.fullname)}</td><td>${escapeHtml(u.role)}</td><td><button class="btn ghost del-user" data-idx="${idx}">Remove</button></td>`;
      usersTbody.appendChild(tr);
    });
  }

  // HANDLERS
  empSearch?.addEventListener('input', e => renderEmployees(e.target.value));
  attSearch?.addEventListener('input', e => renderAttendance(e.target.value));
  userSearch?.addEventListener('input', e => renderUsers(e.target.value));

  refreshEmployeesBtn?.addEventListener('click', () => { renderEmployees(); showToast('Employees refreshed','success'); });
  refreshAttendanceBtn?.addEventListener('click', () => { renderAttendance(); showToast('Attendance refreshed','success'); });

  // EXPORT / IMPORT employees
  exportEmployeesBtn?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(employees, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'employees.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    showToast('Exported employees.json','success');
  });
  importEmployeesBtn?.addEventListener('click', () => importEmployeesFile.click());
  importEmployeesFile?.addEventListener('change', function(){
    const f = this.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(r.result);
        if(Array.isArray(parsed)){ employees = employees.concat(parsed); saveEmployees(); renderEmployees(); showToast('Imported employees','success'); } else showToast('Invalid JSON','warn');
      } catch(e){ showToast('Import failed','warn'); }
    };
    r.readAsText(f); this.value = '';
  });

  // Add Employee modal (with image -> base64)
  addEmployeeBtn?.addEventListener('click', () => {
    modalTitle.textContent = 'Add Employee';
    modalBody.innerHTML = `
      <label>ID<input id="m-id" type="text" /></label>
      <label>Name<input id="m-name" type="text" /></label>
      <label>Position<input id="m-pos" type="text" /></label>
      <label>Contact<input id="m-contact" type="text" /></label>
      <label>Photo<input id="m-photo" type="file" accept="image/*" /></label>
      <img id="m-preview" class="img-preview" src="../images/default-user.png" alt="Preview" />
    `;
    modalOverlay.classList.remove('hidden');
    const photoInput = document.getElementById('m-photo');
    const preview = document.getElementById('m-preview');
    let photoBase64 = null;

    photoInput.addEventListener('change', (ev) => {
      const f = ev.target.files[0];
      if(!f) return;
      const fr = new FileReader();
      fr.onload = () => { photoBase64 = fr.result; preview.src = photoBase64; };
      fr.readAsDataURL(f);
    });

    modalSave.onclick = () => {
      const id = document.getElementById('m-id').value.trim();
      const name = document.getElementById('m-name').value.trim();
      const pos = document.getElementById('m-pos').value.trim();
      const contact = document.getElementById('m-contact').value.trim();
      if(!id||!name||!pos){ showToast('Please fill required fields','warn'); return; }
      // prevent duplicate for same date
      employees.push({ id, name, position: pos, contact, photo: photoBase64 || '../images/default-user.png' });
      saveEmployees(); renderEmployees(); modalOverlay.classList.add('hidden'); showToast('Employee added','success');
    };
  });

  // Delegated table button handlers
  document.addEventListener('click', (e) => {
    // Edit employee
    if(e.target.matches('.edit-emp')){
      const idx = +e.target.dataset.idx;
      const emp = employees[idx];
      modalTitle.textContent = 'Edit Employee';
      modalBody.innerHTML = `
        <label>ID<input id="m-id" type="text" value="${escapeHtml(emp.id)}" /></label>
        <label>Name<input id="m-name" type="text" value="${escapeHtml(emp.name)}" /></label>
        <label>Position<input id="m-pos" type="text" value="${escapeHtml(emp.position)}" /></label>
        <label>Contact<input id="m-contact" type="text" value="${escapeHtml(emp.contact||'')}" /></label>
        <label>Photo<input id="m-photo" type="file" accept="image/*" /></label>
        <img id="m-preview" class="img-preview" src="${emp.photo || '../images/default-user.png'}" alt="Preview" />
      `;
      modalOverlay.classList.remove('hidden');
      const photoInput = document.getElementById('m-photo');
      const preview = document.getElementById('m-preview');
      let photoBase64 = emp.photo || null;
      photoInput.addEventListener('change', (ev) => {
        const f = ev.target.files[0];
        if(!f) return;
        const fr = new FileReader();
        fr.onload = () => { photoBase64 = fr.result; preview.src = photoBase64; };
        fr.readAsDataURL(f);
      });
      modalSave.onclick = () => {
        const id = document.getElementById('m-id').value.trim();
        const name = document.getElementById('m-name').value.trim();
        const pos = document.getElementById('m-pos').value.trim();
        const contact = document.getElementById('m-contact').value.trim();
        if(!id||!name||!pos){ showToast('Please fill required fields','warn'); return; }
        employees[idx] = { id, name, position: pos, contact, photo: photoBase64 || emp.photo || '../images/default-user.png' };
        saveEmployees(); renderEmployees(); modalOverlay.classList.add('hidden'); showToast('Employee updated','success');
      };
    }

    // Delete employee
    if(e.target.matches('.del-emp')){
      const idx = +e.target.dataset.idx;
      if(!confirm('Delete this employee?')) return;
      employees.splice(idx,1); saveEmployees(); renderEmployees(); showToast('Employee removed','success');
    }

    // Edit attendance
    if(e.target.matches('.edit-log')){
      const idx = +e.target.dataset.idx;
      const log = attendanceLogs[idx];
      modalTitle.textContent = 'Edit Attendance Log';
      modalBody.innerHTML = `
        <label>ID<input id="m-id" value="${escapeHtml(log.id||'')}" /></label>
        <label>Name<input id="m-name" value="${escapeHtml(log.name||'')}" /></label>
        <label>Position<input id="m-pos" value="${escapeHtml(log.position||'')}" /></label>
        <label>Time In<input id="m-timein" value="${escapeHtml(log.timeIn||'')}" /></label>
        <label>Time Out<input id="m-timeout" value="${escapeHtml(log.timeOut||'')}" /></label>
        <label>Date<input id="m-date" value="${escapeHtml(log.date||'')}" /></label>
      `;
      modalOverlay.classList.remove('hidden');
      modalSave.onclick = () => {
        attendanceLogs[idx] = {
          id: document.getElementById('m-id').value.trim(),
          name: document.getElementById('m-name').value.trim(),
          position: document.getElementById('m-pos').value.trim(),
          timeIn: document.getElementById('m-timein').value.trim(),
          timeOut: document.getElementById('m-timeout').value.trim() || null,
          date: document.getElementById('m-date').value.trim()
        };
        saveLogs(); renderAttendance(); modalOverlay.classList.add('hidden'); showToast('Log updated','success');
      };
    }

    // Delete attendance
    if(e.target.matches('.del-log')){
      const idx = +e.target.dataset.idx;
      if(!confirm('Delete this attendance entry?')) return;
      attendanceLogs.splice(idx,1); saveLogs(); renderAttendance(); showToast('Entry deleted','success');
    }

    // Delete user
    if(e.target.matches('.del-user')){
      const idx = +e.target.dataset.idx;
      if(!confirm('Remove this user?')) return;
      users.splice(idx,1); saveUsers(); renderUsers(); showToast('User removed','success');
    }
  });

  // Add User
  addUserBtn?.addEventListener('click', () => {
    modalTitle.textContent = 'Add User';
    modalBody.innerHTML = `
      <label>Username<input id="m-username" placeholder="username" /></label>
      <label>Full name<input id="m-fullname" placeholder="Full name" /></label>
      <label>Password<input id="m-password" type="text" placeholder="password" /></label>
      <label>Role<select id="m-role"><option>Admin</option><option>HR</option></select></label>
    `;
    modalOverlay.classList.remove('hidden');
    modalSave.onclick = () => {
      const u = document.getElementById('m-username').value.trim();
      const f = document.getElementById('m-fullname').value.trim();
      const pwd = document.getElementById('m-password').value.trim();
      const r = document.getElementById('m-role').value;
      if(!u||!f||!pwd){ showToast('Fill required fields','warn'); return; }
      users.push({ username: u, fullname: f, role: r, password: pwd});
      saveUsers(); renderUsers(); modalOverlay.classList.add('hidden'); showToast('User added','success');
    };
  });

  // Modal cancel closes overlay
  modalCancel.addEventListener('click', () => modalOverlay.classList.add('hidden'));

  // Print attendance
  printAttendanceBtn?.addEventListener('click', () => {
    const html = buildAttendancePrintHtml(attendanceLogs);
    const w = window.open('', '_blank');
    w.document.write(html); w.document.close(); w.print(); w.close();
  });

  // Generate & print report (simple)
  generateReportBtn?.addEventListener('click', () => {
    const type = reportType.value;
    const dateVal = reportDate.value;
    let filtered = attendanceLogs.slice();
    if(type === 'daily' && dateVal){
      const d = new Date(dateVal).toLocaleDateString();
      filtered = filtered.filter(l => l.date === d);
    } else if(type === 'weekly' && dateVal){
      const base = new Date(dateVal);
      const start = new Date(base); start.setDate(base.getDate() - 3);
      const end = new Date(base); end.setDate(base.getDate() + 3);
      filtered = filtered.filter(l => { const ld = new Date(l.date); return ld >= start && ld <= end; });
    } else if(type === 'monthly' && dateVal){
      const base = new Date(dateVal);
      filtered = filtered.filter(l => { const ld = new Date(l.date); return ld.getMonth() === base.getMonth() && ld.getFullYear() === base.getFullYear(); });
    }
    const html = buildAttendancePrintHtml(filtered, `Report - ${type} ${dateVal||''}`);
    const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.print(); w.close();
    showToast('Report printed','success');
  });

document.getElementById('logoutBtn').addEventListener('click', () => {
  document.getElementById('logoutConfirm').classList.remove('hidden');
});

document.getElementById('cancelLogout').addEventListener('click', () => {
  document.getElementById('logoutConfirm').classList.add('hidden');
});

document.getElementById('confirmLogout').addEventListener('click', () => {
  window.location.href = 'select-user.html'; // or your selection page path
});


  // Utility: build printable HTML
  function buildAttendancePrintHtml(arr, title = 'Attendance Records'){
    const rows = arr.map(r => `<tr><td style="border:1px solid #ddd;padding:6px">${escapeHtml(r.id||'')}</td><td style="border:1px solid #ddd;padding:6px">${escapeHtml(r.name||'')}</td><td style="border:1px solid #ddd;padding:6px">${escapeHtml(r.position||'')}</td><td style="border:1px solid #ddd;padding:6px">${escapeHtml(r.timeIn||'')}</td><td style="border:1px solid #ddd;padding:6px">${escapeHtml(r.timeOut||'—')}</td><td style="border:1px solid #ddd;padding:6px">${escapeHtml(r.date||'')}</td></tr>`).join('');
    return `<div style="padding:16px;font-family:Arial"><h2>${title}</h2><table style="width:100%;border-collapse:collapse"><thead><tr><th style="border:1px solid #ddd;padding:6px">ID</th><th style="border:1px solid #ddd;padding:6px">Name</th><th style="border:1px solid #ddd;padding:6px">Position</th><th style="border:1px solid #ddd;padding:6px">Time In</th><th style="border:1px solid #ddd;padding:6px">Time Out</th><th style="border:1px solid #ddd;padding:6px">Date</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  // Initialize render
  renderEmployees(); renderAttendance(); renderUsers(); refreshDashboard();
});

