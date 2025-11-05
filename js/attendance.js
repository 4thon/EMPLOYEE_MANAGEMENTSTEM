// attendance.js (final - with Time Out button in profile view, no file download)

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const timeDisplay = document.getElementById('timeDisplay');
  const empId = document.getElementById('empId');
  const empName = document.getElementById('empName');
  const empPosition = document.getElementById('empPosition');
  const timeInBtn = document.getElementById('timeInBtn');
  const backBtn = document.getElementById('backBtn'); // used as Back or Time Out

  const inputPanel = document.querySelector('.input-panel');
  const profilePanel = document.querySelector('.profile-panel');
  const tbody = document.querySelector('#logTable tbody');

  const pName = document.getElementById('pName');
  const pPosition = document.getElementById('pPosition');
  const pTimeIn = document.getElementById('pTimeIn');
  const pTimeOut = document.getElementById('pTimeOut');
  const pDate = document.getElementById('pDate');

  // Attendance data (persisted locally)
  let logs = JSON.parse(localStorage.getItem('attendanceLogs')) || [];
  let activeIndex = null; // selected row for time-out

  // Neon popup message
  function showPopup(message, color = "#00ffcc") {
    const popup = document.createElement('div');
    popup.className = 'neon-popup';
    popup.textContent = message;
    popup.style.borderColor = color;
    popup.style.color = color;
    popup.style.boxShadow = `0 0 15px ${color}`;
    document.body.appendChild(popup);
    setTimeout(() => popup.classList.add('show'), 10);
    setTimeout(() => {
      popup.classList.remove('show');
      setTimeout(() => popup.remove(), 400);
    }, 2400);
  }

  // Real-time clock
  setInterval(() => {
    const now = new Date();
    timeDisplay.textContent = now.toLocaleTimeString();
  }, 1000);

  // Escape HTML
  function escapeHtml(s) {
    if (!s && s !== 0) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Save logs to localStorage
  function saveLogs() {
    localStorage.setItem('attendanceLogs', JSON.stringify(logs));
  }

  // Render table rows
  function renderTable() {
    tbody.innerHTML = '';
    logs.forEach((log, idx) => {
      const row = document.createElement('tr');
      row.dataset.index = idx;
      row.innerHTML = `
        <td>${escapeHtml(log.id)}</td>
        <td>${escapeHtml(log.name)}</td>
        <td>${escapeHtml(log.position)}</td>
        <td>${escapeHtml(log.timeIn)}</td>
        <td>${log.timeOut ? escapeHtml(log.timeOut) : '—'}</td>
        <td>${escapeHtml(log.date)}</td>
      `;
      row.addEventListener('click', () => handleRowClick(idx));
      tbody.appendChild(row);
    });
  }

  // Reset input form
  function resetForm() {
    empId.value = '';
    empName.value = '';
    empPosition.value = '';
    activeIndex = null;
  }

  // Show profile (with or without Time Out button)
  function showProfile(name, position, timeIn, date, timeOut = '—', showTimeOut = false) {
    pName.textContent = name;
    pPosition.textContent = position;
    pTimeIn.textContent = `Time In: ${timeIn}`;
    pTimeOut.textContent = `Time Out: ${timeOut}`;
    pDate.textContent = `Date: ${date}`;

    if (showTimeOut) {
      backBtn.textContent = 'Time Out';
      backBtn.dataset.mode = 'timeout';
    } else {
      backBtn.textContent = 'Back';
      backBtn.dataset.mode = 'back';
    }

    inputPanel.classList.add('hide');
    setTimeout(() => profilePanel.classList.add('show'), 300);
  }

  // Hide profile
  function hideProfile() {
    profilePanel.classList.remove('show');
    setTimeout(() => inputPanel.classList.remove('hide'), 300);
  }

  // Handle Time In
  timeInBtn.addEventListener('click', () => {
    const idVal = empId.value.trim();
    const nameVal = empName.value.trim();
    const posVal = empPosition.value.trim();

    if (!idVal || !nameVal || !posVal) {
      showPopup('⚠️ Please fill all fields.', '#ffcc00');
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const dateStr = now.toLocaleDateString();

    // Prevent duplicate Time In for same date + ID
    const exists = logs.some(l => l.id === idVal && l.date === dateStr);
    if (exists) {
      showPopup('ℹ️ Employee already timed in today.', '#00bfff');
      resetForm();
      return;
    }

    const newLog = {
      id: idVal,
      name: nameVal,
      position: posVal,
      timeIn: timeStr,
      timeOut: null,
      date: dateStr
    };

    logs.push(newLog);
    saveLogs();
    renderTable();

    showProfile(nameVal, posVal, timeStr, dateStr, '—', false);
    showPopup('✅ Time In recorded successfully.', '#00ffcc');

    setTimeout(() => {
      hideProfile();
      resetForm();
    }, 1800);
  });

  // Handle row click → profile view with Time Out
  function handleRowClick(index) {
    const log = logs[index];
    if (!log) return;

    if (log.timeOut) {
      showPopup('ℹ️ This employee already timed out.', '#00bfff');
      return;
    }

    activeIndex = index;
    showProfile(log.name, log.position, log.timeIn, log.date, log.timeOut || '—', true);
    showPopup('👤 Ready for Time Out', '#00ffcc');
  }

  // Back / Time Out handler
  backBtn.addEventListener('click', () => {
    const mode = backBtn.dataset.mode || 'back';

    if (mode === 'timeout') {
      if (activeIndex === null) {
        showPopup('⚠️ No record selected.', '#ffcc00');
        return;
      }

      const log = logs[activeIndex];
      if (log.timeOut) {
        showPopup('ℹ️ Already timed out.', '#00bfff');
        hideProfile();
        resetForm();
        return;
      }

      const now = new Date();
      const timeOutStr = now.toLocaleTimeString();
      log.timeOut = timeOutStr;
      saveLogs();
      renderTable();

      pTimeOut.textContent = `Time Out: ${timeOutStr}`;
      showPopup('✅ Time Out recorded successfully.', '#00ffcc');

      setTimeout(() => {
        hideProfile();
        resetForm();
      }, 1400);
    } else {
      hideProfile();
      resetForm();
    }
  });

  // Initialize table
  renderTable();
});
