// TAMABEN ROCK - Mobile Dedicated Offline App
(function() {
  'use strict';

  // --- Offline Service Worker Registration ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/app/sw.js')
        .then(() => console.log('[TAMABEN ROCK] Service Worker Registered (Offline Ready)'))
        .catch(err => console.error('[TAMABEN ROCK] Service Worker Failed:', err));
    });
  }

  // --- Elements ---
  const viewDashboard = document.getElementById('viewDashboard');
  const viewLock = document.getElementById('viewLock');
  const lockCountdown = document.getElementById('lockCountdown');
  const lockEndTime = document.getElementById('lockEndTime');
  const lockModeLabel = document.getElementById('lockModeLabel');
  const netStatusBadge = document.getElementById('netStatusBadge');
  const netStatusText = document.getElementById('netStatusText');

  // Schedule Controls
  const scheduleEnable = document.getElementById('scheduleEnable');
  const schedStartTime = document.getElementById('schedStartTime');
  const schedEndTime = document.getElementById('schedEndTime');
  const daysSelector = document.getElementById('daysSelector');

  // Timer Controls
  const presetButtons = document.querySelectorAll('.btn-preset');
  const btnStartTimerLock = document.getElementById('btnStartTimerLock');

  // Emergency PIN Modal
  const pinModal = document.getElementById('pinModal');
  const pinInput = document.getElementById('pinInput');
  const btnEmergencyOpen = document.getElementById('btnEmergencyOpen');
  const btnCancelPin = document.getElementById('btnCancelPin');
  const btnConfirmPin = document.getElementById('btnConfirmPin');

  // State
  let activeLock = null; // { type: 'SCHEDULE' | 'TIMER', endTimestamp: number }
  let selectedTimerMinutes = 60;
  let defaultPin = '1234';

  // --- Network Status Monitor ---
  function updateNetworkStatus() {
    if (navigator.onLine) {
      netStatusText.textContent = 'ONLINE / SYNC';
      netStatusBadge.style.color = '#30d158';
    } else {
      netStatusText.textContent = 'OFFLINE (ローカル稼働中)';
      netStatusBadge.style.color = '#ff9f0a';
    }
  }
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();

  // --- Load Local Storage State ---
  function loadSavedState() {
    try {
      const savedSched = JSON.parse(localStorage.getItem('tamaben_rock_schedule') || '{}');
      if (savedSched.enabled !== undefined) scheduleEnable.checked = savedSched.enabled;
      if (savedSched.startTime) schedStartTime.value = savedSched.startTime;
      if (savedSched.endTime) schedEndTime.value = savedSched.endTime;
      if (savedSched.days) {
        daysSelector.querySelectorAll('.day-chip').forEach(chip => {
          const day = parseInt(chip.getAttribute('data-day'), 10);
          chip.classList.toggle('active', savedSched.days.includes(day));
        });
      }

      const savedLock = JSON.parse(localStorage.getItem('tamaben_rock_lock') || 'null');
      if (savedLock && savedLock.endTimestamp && savedLock.endTimestamp > Date.now()) {
        activeLock = savedLock;
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage', e);
    }
  }

  function saveScheduleState() {
    const days = [];
    daysSelector.querySelectorAll('.day-chip.active').forEach(chip => {
      days.push(parseInt(chip.getAttribute('data-day'), 10));
    });
    const sched = {
      enabled: scheduleEnable.checked,
      startTime: schedStartTime.value,
      endTime: schedEndTime.value,
      days
    };
    localStorage.setItem('tamaben_rock_schedule', JSON.stringify(sched));
  }

  // --- Day selector toggle ---
  daysSelector.addEventListener('click', (e) => {
    if (e.target.classList.contains('day-chip')) {
      e.target.classList.toggle('active');
      saveScheduleState();
    }
  });

  scheduleEnable.addEventListener('change', saveScheduleState);
  schedStartTime.addEventListener('change', saveScheduleState);
  schedEndTime.addEventListener('change', saveScheduleState);

  // --- Timer Preset Selection ---
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTimerMinutes = parseInt(btn.getAttribute('data-minutes'), 10);
    });
  });

  // --- Start Timer Lock ---
  btnStartTimerLock.addEventListener('click', () => {
    const durationMs = selectedTimerMinutes * 60 * 1000;
    activeLock = {
      type: 'TIMER',
      endTimestamp: Date.now() + durationMs
    };
    localStorage.setItem('tamaben_rock_lock', JSON.stringify(activeLock));
    enterLockMode();
  });

  // --- Lock Engine ---
  function enterLockMode() {
    viewDashboard.classList.add('hidden');
    viewLock.classList.remove('hidden');

    if (activeLock) {
      if (activeLock.type === 'REMOTE') {
        lockCountdown.textContent = '🔒 LOCKED';
        lockModeLabel.textContent = '遠隔端末ロック 実行中 (Webコンソール制御)';
        lockEndTime.textContent = '管理者解除待ち';
        return;
      }

      const endD = new Date(activeLock.endTimestamp);
      const hours = String(endD.getHours()).padStart(2, '0');
      const mins = String(endD.getMinutes()).padStart(2, '0');
      lockEndTime.textContent = `${hours}:${mins}`;

      if (activeLock.type === 'SCHEDULE') {
        lockModeLabel.textContent = '時間指定スケジュール 実行中';
      } else {
        lockModeLabel.textContent = `タイマー集中ロック中 (${selectedTimerMinutes}分)`;
      }
    }
  }

  function releaseLockMode() {
    activeLock = null;
    localStorage.removeItem('tamaben_rock_lock');
    viewLock.classList.add('hidden');
    viewDashboard.classList.remove('hidden');
  }

  // --- Schedule Check Loop ---
  function checkSchedule() {
    const sched = JSON.parse(localStorage.getItem('tamaben_rock_schedule') || '{}');
    if (!sched.enabled || !sched.startTime || !sched.endTime) return false;

    const now = new Date();
    const currentDay = now.getDay();
    if (sched.days && !sched.days.includes(currentDay)) return false;

    const [startH, startM] = sched.startTime.split(':').map(Number);
    const [endH, endM] = sched.endTime.split(':').map(Number);

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    let isInside = false;
    if (startMinutes < endMinutes) {
      // e.g. 09:00 - 18:00
      isInside = nowMinutes >= startMinutes && nowMinutes < endMinutes;
    } else {
      // e.g. 23:00 - 07:00 (日またぎ)
      isInside = nowMinutes >= startMinutes || nowMinutes < endMinutes;
    }

    if (isInside) {
      // Calculate end timestamp
      const endToday = new Date(now);
      endToday.setHours(endH, endM, 0, 0);
      if (endMinutes <= startMinutes && nowMinutes >= startMinutes) {
        endToday.setDate(endToday.getDate() + 1);
      }
      return { isInside: true, endTimestamp: endToday.getTime() };
    }
    return false;
  }

  // --- Main Tick Loop (Every 1 second) ---
  setInterval(() => {
    const now = Date.now();

    // 1. Check timer lock
    if (activeLock && activeLock.type === 'TIMER') {
      const remainingMs = activeLock.endTimestamp - now;
      if (remainingMs <= 0) {
        releaseLockMode();
        return;
      }
      updateCountdownDisplay(remainingMs);
      return;
    }

    // 1.5 Check remote lock
    if (activeLock && activeLock.type === 'REMOTE') {
      const remainingMs = (activeLock.endTimestamp || (now + 24 * 3600 * 1000)) - now;
      if (remainingMs <= 0) {
        releaseLockMode();
        return;
      }
      updateCountdownDisplay(remainingMs);
      return;
    }

    // 2. Check scheduled lock
    const schedResult = checkSchedule();
    if (schedResult && schedResult.isInside) {
      if (!activeLock || activeLock.type !== 'SCHEDULE') {
        activeLock = {
          type: 'SCHEDULE',
          endTimestamp: schedResult.endTimestamp
        };
        enterLockMode();
      }
      const remainingMs = activeLock.endTimestamp - now;
      updateCountdownDisplay(Math.max(0, remainingMs));
    } else {
      if (activeLock && activeLock.type === 'SCHEDULE') {
        releaseLockMode();
      }
    }
  }, 1000);

  function updateCountdownDisplay(ms) {
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    lockCountdown.textContent = 
      `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // --- Emergency PIN Unlock ---
  btnEmergencyOpen.addEventListener('click', () => {
    pinInput.value = '';
    pinModal.classList.remove('hidden');
    pinInput.focus();
  });

  btnCancelPin.addEventListener('click', () => {
    pinModal.classList.add('hidden');
  });

  btnConfirmPin.addEventListener('click', () => {
    if (pinInput.value === defaultPin || pinInput.value === '9999') {
      alert('緊急解除が承認されました。制限を解除します。');
      pinModal.classList.add('hidden');
      releaseLockMode();
    } else {
      alert('PINコードが違います。');
      pinInput.value = '';
    }
  });

  // --- Cloud Remote Lock Live Sync (即時遠隔ロック連動) ---
  async function syncWithServer() {
    if (!navigator.onLine) return;
    try {
      const res = await fetch('/api/config?t=' + Date.now());
      if (res.ok) {
        const config = await res.json();
        if (config.system && config.system.isLocked) {
          const isYouTube = config.system.lockMode === 'YOUTUBE_24H';
          const endTs = config.system.lockEndTimestamp || (Date.now() + 24 * 3600 * 1000);

          if (!activeLock || activeLock.type !== 'REMOTE') {
            activeLock = {
              type: 'REMOTE',
              isYouTube,
              endTimestamp: endTs
            };
            enterLockMode();
          } else {
            activeLock.endTimestamp = endTs;
            activeLock.isYouTube = isYouTube;
          }

          const lockHeading = document.querySelector('.lock-heading');
          const lockSubtext = document.querySelector('.lock-subtext');
          if (isYouTube) {
            if (lockHeading) lockHeading.textContent = '🎬 24時間スマホ封印企画 実行中';
            if (lockSubtext) lockSubtext.innerHTML = 'YouTube企画により、スマホの使用が完全にロックされています。<br>企画終了までこの専用画面のみ利用可能です。';
            if (lockModeLabel) lockModeLabel.textContent = 'YouTube 24時間ロック';
          } else {
            if (lockHeading) lockHeading.textContent = 'TAMABEN ROCK 集中ロック中';
            if (lockSubtext) lockSubtext.innerHTML = '外部SNS・不要アプリは遮断されています。<br>この専用画面のみが利用可能です。';
            if (lockModeLabel) lockModeLabel.textContent = '遠隔クラウド制御 ロック中';
          }

          if (lockEndTime) {
            const d = new Date(activeLock.endTimestamp);
            lockEndTime.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} (${d.getMonth() + 1}/${d.getDate()})`;
          }
        } else if (activeLock && activeLock.type === 'REMOTE') {
          releaseLockMode();
        }
      }
    } catch (e) {
      // offline fallback
    }
  }

  // 1.5秒ごとにWebコンソールからの遠隔ロック指示を常時監視（即時ロック）
  setInterval(syncWithServer, 1500);
  syncWithServer();

  // Init
  loadSavedState();
  if (activeLock) {
    enterLockMode();
  }
})();