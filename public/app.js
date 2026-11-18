// TAMABEN LOCK Console Client
const API_BASE = '/api';

const elements = {
  systemStatusIndicator: document.getElementById('systemStatusIndicator'),
  systemStatusText: document.getElementById('systemStatusText'),
  lockStateDisplay: document.getElementById('lockStateDisplay'),
  lockModeDisplay: document.getElementById('lockModeDisplay'),
  lastUpdatedDisplay: document.getElementById('lastUpdatedDisplay'),
  categoriesGrid: document.getElementById('categoriesGrid'),
  logsTableBody: document.getElementById('logsTableBody'),
  btnBlockApps: document.getElementById('btnBlockApps'),
  btnBlockAllFeatures: document.getElementById('btnBlockAllFeatures'),
  btnReleaseAdmin: document.getElementById('btnReleaseAdmin'),
  btnPreviewProfile: document.getElementById('btnPreviewProfile'),
  btnRefreshLogs: document.getElementById('btnRefreshLogs'),
  btnRefreshDevices: document.getElementById('btnRefreshDevices'),
  devicesTableBody: document.getElementById('devicesTableBody'),
  previewModal: document.getElementById('previewModal'),
  btnCloseModal: document.getElementById('btnCloseModal'),
  btnCloseModal2: document.getElementById('btnCloseModal2'),
  profileXmlCode: document.getElementById('profileXmlCode')
};

// カテゴリーのマスター定義
const CATEGORY_NAMES = {
  BASE: '基本設定',
  SECURITY: 'セキュリティ',
  NETWORK: 'ネットワーク',
  APPLICATION: 'アプリ',
  WEB: 'Web',
  CERTIFICATE: '証明書',
  ACCOUNT: 'アカウント',
  HOME: 'ホーム画面'
};

async function fetchConfig() {
  try {
    const res = await fetch(`${API_BASE}/config`);
    const data = await res.json();
    renderSystemState(data.system);
    renderCategories(data.categories);
  } catch (err) {
    console.error('Failed to load config:', err);
    elements.systemStatusText.textContent = 'オフライン';
  }
}

function renderSystemState(system) {
  if (!system) return;
  const isLocked = system.isLocked;

  elements.systemStatusText.textContent = isLocked ? '制限中 (LOCKED)' : '待機中 (NORMAL)';
  elements.systemStatusIndicator.className = 'status-indicator ' + (isLocked ? 'locked' : '');

  elements.lockStateDisplay.textContent = isLocked ? '制限中' : '解除（通常）';
  elements.lockStateDisplay.className = 'lock-state-val ' + (isLocked ? 'locked' : 'unlocked');

  elements.lockModeDisplay.textContent = system.lockMode || 'MANUAL';
  elements.lastUpdatedDisplay.textContent = system.lastUpdated 
    ? new Date(system.lastUpdated).toLocaleTimeString() 
    : '-';
}

function renderCategories(categories) {
  if (!categories) return;
  elements.categoriesGrid.innerHTML = '';

  const order = ['BASE', 'SECURITY', 'NETWORK', 'APPLICATION', 'WEB', 'CERTIFICATE', 'ACCOUNT', 'HOME'];

  order.forEach(id => {
    const cat = categories[id];
    if (!cat) return;

    const card = document.createElement('div');
    card.className = `cat-card ${cat.enabled ? 'active' : ''}`;

    card.innerHTML = `
      <div class="cat-top">
        <div>
          <span class="cat-id-badge">${id}</span>
          <h3 class="cat-title">${cat.name || CATEGORY_NAMES[id]}</h3>
        </div>
        <label class="switch">
          <input type="checkbox" ${cat.enabled ? 'checked' : ''} data-cat-id="${id}">
          <span class="slider"></span>
        </label>
      </div>
      <p class="cat-desc">${cat.description || ''}</p>
      <div style="font-size: 11px; color: ${cat.enabled ? 'var(--accent)' : 'var(--text-muted)'}; font-weight: 600;">
        ${cat.enabled ? '● ポリシー有効' : '○ ポリシー無効'}
      </div>
    `;

    const toggleInput = card.querySelector('input');
    toggleInput.addEventListener('change', async () => {
      await toggleCategory(id);
    });

    elements.categoriesGrid.appendChild(card);
  });
}

async function toggleCategory(id) {
  try {
    const res = await fetch(`${API_BASE}/categories/${id}/toggle`, { method: 'POST' });
    if (res.ok) {
      await fetchConfig();
      await fetchLogs();
    }
  } catch (err) {
    alert('カテゴリー切り替えに失敗しました');
  }
}

async function fetchLogs() {
  try {
    const res = await fetch(`${API_BASE}/logs`);
    const logs = await res.json();
    renderLogs(logs);
  } catch (err) {
    console.error('Failed to load logs:', err);
  }
}

function renderLogs(logs) {
  elements.logsTableBody.innerHTML = '';
  if (!logs || logs.length === 0) {
    elements.logsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">ログはありません</td></tr>';
    return;
  }

  logs.forEach(log => {
    const tr = document.createElement('tr');
    const timeStr = new Date(log.timestamp).toLocaleString();
    tr.innerHTML = `
      <td style="color: var(--text-muted); font-size: 11px;">${timeStr}</td>
      <td><span class="log-action-badge">${log.action}</span></td>
      <td>${log.details}</td>
      <td style="color: var(--text-muted); font-size: 12px;">${log.operator || 'ADMIN'}</td>
    `;
    elements.logsTableBody.appendChild(tr);
  });
}

// SNS・動画アプリ即時非表示モード
elements.btnBlockApps?.addEventListener('click', async () => {
  if (!confirm('YouTube, X, Instagram, TikTok などのアプリアイコンをiPhoneから即座に非表示（起動禁止）にしますか？')) return;
  try {
    const res = await fetch(`${API_BASE}/config`);
    const data = await res.json();
    data.categories.APPLICATION.enabled = true;
    data.categories.APPLICATION.blockedAppBundleIDs = [
      'com.google.ios.youtube',
      'com.atebits.Tweetie2',
      'com.burbn.instagram',
      'com.zhiliaoapp.musically'
    ];
    data.system.isLocked = true;
    data.system.lockMode = 'APP_BLOCK';

    const saveRes = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (saveRes.ok) {
      alert('【適用完了】iPhoneから対象アプリのアイコンが消滅しました！');
      await fetchConfig();
      await fetchLogs();
    }
  } catch (e) {
    alert('エラーが発生しました');
  }
});

// スマホ機能 丸ごと制限モード
elements.btnBlockAllFeatures?.addEventListener('click', async () => {
  if (!confirm('【集中モード】カメラ、Safari、App Store、AirDrop を一括停止し、スマホの娯楽機能を完全にシャットアウトしますか？')) return;
  try {
    const res = await fetch(`${API_BASE}/config`);
    const data = await res.json();
    data.categories.SECURITY.allowCamera = false;
    data.categories.SECURITY.allowAirDrop = false;
    data.categories.APPLICATION.allowAppInstallation = false;
    data.categories.APPLICATION.blockedAppBundleIDs = [
      'com.google.ios.youtube',
      'com.atebits.Tweetie2',
      'com.burbn.instagram',
      'com.zhiliaoapp.musically'
    ];
    data.categories.WEB.allowSafari = false;
    data.system.isLocked = true;
    data.system.lockMode = 'FULL_RESTRICTION';

    const saveRes = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (saveRes.ok) {
      alert('【適用完了】カメラ・Safari・AirDrop・SNSアプリが一括非表示・停止されました！');
      await fetchConfig();
      await fetchLogs();
    }
  } catch (e) {
    alert('エラーが発生しました');
  }
});

// 全解除 (通常モードに戻す)
elements.btnReleaseAdmin?.addEventListener('click', async () => {
  if (!confirm('すべてのアプリ非表示と機能制限を解除し、通常状態に復帰しますか？')) return;
  try {
    const res = await fetch(`${API_BASE}/config`);
    const data = await res.json();
    data.categories.SECURITY.allowCamera = true;
    data.categories.SECURITY.allowAirDrop = true;
    data.categories.APPLICATION.allowAppInstallation = true;
    data.categories.APPLICATION.blockedAppBundleIDs = [];
    data.categories.WEB.allowSafari = true;
    data.system.isLocked = false;
    data.system.lockMode = 'MANUAL';

    const saveRes = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (saveRes.ok) {
      alert('【解除完了】すべてのアプリと機能が復元されました！');
      await fetchConfig();
      await fetchLogs();
    }
  } catch (e) {
    alert('エラーが発生しました');
  }
});

// プロファイルプレビュー
elements.btnPreviewProfile.addEventListener('click', async () => {
  try {
    const res = await fetch(`${API_BASE}/profile`);
    const xml = await res.text();
    elements.profileXmlCode.textContent = xml;
    elements.previewModal.classList.add('open');
  } catch (e) {
    alert('プロファイルの取得に失敗しました');
  }
});

const closeModal = () => elements.previewModal.classList.remove('open');
elements.btnCloseModal.addEventListener('click', closeModal);
elements.btnCloseModal2.addEventListener('click', closeModal);
elements.previewModal.addEventListener('click', (e) => {
  if (e.target === elements.previewModal) closeModal();
});

elements.btnRefreshLogs.addEventListener('click', fetchLogs);

async function fetchDevices() {
  try {
    const res = await fetch(`${API_BASE}/devices`);
    const devices = await res.json();
    renderDevices(devices);
  } catch (err) {
    console.error('Failed to load devices:', err);
  }
}

function renderDevices(devices) {
  elements.devicesTableBody.innerHTML = '';
  if (!devices || devices.length === 0) {
    elements.devicesTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">現在検出・登録されているデバイスはありません（待機中）</td></tr>';
    return;
  }

  devices.forEach(dev => {
    const tr = document.createElement('tr');
    const isEnrolled = dev.status === 'ENROLLED';
    const lastSeenDate = dev.lastSeen ? new Date(dev.lastSeen) : null;
    const isOnline = lastSeenDate && (Date.now() - lastSeenDate.getTime() < 10 * 60 * 1000);
    const lastSeenStr = lastSeenDate ? lastSeenDate.toLocaleTimeString() : '-';

    const diffSec = lastSeenDate ? Math.floor((Date.now() - lastSeenDate.getTime()) / 1000) : 9999;
    let statusBadge = "";
    if (diffSec <= 90) { // 1分30秒以内 (1分定期連携が確実に動作中)
      statusBadge = `<span class="log-action-badge" style="background: rgba(48, 209, 88, 0.25); color: #30d158; font-weight: 700; border: 1px solid #30d15888;">● 1分定期連携中 (${diffSec}s前)</span>`;
    } else if (isOnline) {
      statusBadge = `<span class="log-action-badge" style="background: rgba(48, 209, 88, 0.15); color: #30d158;">● オンライン (${Math.floor(diffSec/60)}分前)</span>`;
    } else {
      statusBadge = `<span class="log-action-badge" style="background: rgba(142, 142, 147, 0.2); color: #8e8e93;">○ 待機中</span>`;
    }

    tr.innerHTML = `
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">📱</span>
          <div>
            <div style="font-weight: 700;">${dev.productName || 'iPhone 18 pro'}</div>
            <div style="font-size: 10px; color: var(--text-muted);">${dev.status || 'ENROLLED'}</div>
          </div>
        </div>
      </td>
      <td>${statusBadge}</td>
      <td style="font-family: var(--font-mono); font-size: 11px;">
        <span title="${dev.udid}">${dev.udid.substring(0, 16)}...</span>
      </td>
      <td><span style="font-weight: 600;">iOS ${dev.osVersion || '27.2'}</span></td>
      <td style="color: var(--text-muted); font-size: 11px;">${lastSeenStr}</td>
      <td>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-danger" style="font-weight: 700; background: linear-gradient(135deg, #ff453a 0%, #a80000 100%);" onclick="sendDeviceCommand('${dev.udid}', 'EnableLostMode')">🔒 24H企画ロック</button>
          <button class="btn btn-sm btn-ghost" onclick="sendDeviceCommand('${dev.udid}', 'DisableLostMode')">🔓 企画解除</button>
          <button class="btn btn-sm btn-primary" onclick="sendDeviceCommand('${dev.udid}', 'InstallProfile')">ポリシー反映</button>
          <button class="btn btn-sm btn-outline" style="border-color: #38bdf8; color: #38bdf8;" onclick="showInstalledApps('${dev.udid}')">📱 アプリ一覧</button>
          <button class="btn btn-sm btn-secondary" onclick="sendDeviceCommand('${dev.udid}', 'DeviceInformation')">情報取得</button>
          <button class="btn btn-sm" style="background: #2c1517; color: #ff453a; border: 1px solid #ff453a33;" onclick="deleteDevice('${dev.udid}')">削除</button>
        </div>
      </td>
    `;
    elements.devicesTableBody.appendChild(tr);
  });
}

window.deleteDevice = async function(udid) {
  if (!confirm(`UDID [${udid}] の端末を管理対象リストから削除しますか？\n（※再登録時は再度プロファイルを開くことで自動検出されます）`)) return;

  try {
    const res = await fetch(`${API_BASE}/devices/${udid}`, { method: 'DELETE' });
    if (res.ok) {
      alert('端末情報を管理対象から正常に削除しました。');
      await fetchDevices();
      await fetchLogs();
    } else {
      alert('端末の削除に失敗しました');
    }
  } catch (err) {
    alert('通信エラーが発生しました');
  }
};

window.sendDeviceCommand = async function(udid, commandType) {
  try {
    let payload = { commandType };
    if (commandType === 'EnableLostMode') {
      const msg = prompt('iPhoneのロック画面に表示するメッセージを入力してください：', '【YouTube企画】24時間スマホ禁止生活 実行中！\n企画終了までこのスマホは使用できません。');
      if (msg === null) return;
      payload.message = msg;
      payload.footnote = 'TAMABEN ROCK デジタルデトックス';
    }

    const res = await fetch(`${API_BASE}/devices/${udid}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      if (commandType === 'EnableLostMode') {
        alert('🔒【24時間企画ロック発動完了】\niPhoneへ紛失モード（完全画面固定・パスコード解除不可）を送信しました！\n画面に指定メッセージが表示され、端末が完全に使えなくなります。');
      } else if (commandType === 'DisableLostMode') {
        alert('🔓【企画ロック解除完了】\niPhoneの紛失モードを解除しました！通常利用に復帰します。');
      } else if (commandType === 'DeviceLock') {
        alert('【即時ロック実行完了】\n端末ロック信号を即座に送信しました！\n端末側（専用アプリ）が直ちに全画面ロック状態へ突入します。');
      } else if (commandType === 'InstallProfile') {
        alert('【ポリシー反映完了】\n最新の制限ポリシーを即座に端末へ配信しました。');
      } else {
        alert(`コマンド [${commandType}] を即時送信しました。`);
      }
      await fetchConfig();
      await fetchLogs();
    }
  } catch (err) {
    alert('コマンド送信に失敗しました');
  }
};

elements.btnRefreshDevices?.addEventListener('click', fetchDevices);

// 初期ロード
fetchConfig();
fetchLogs();
fetchDevices();



// --- アプリ一覧表示 (正規MDM通信) ---
window.showInstalledApps = async function(udid) {
  const modal = document.getElementById('appsModal');
  const container = document.getElementById('appsListContainer');
  modal.classList.add('active');
  container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px 0;">正規MDM経由でアプリ一覧を取得中...</div>';

  try {
    let res = await fetch(`${API_BASE}/devices/${udid}/apps`);
    let apps = await res.json();

    if (!apps || apps.length === 0) {
      await fetch(`${API_BASE}/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ udid, command: 'InstalledApplicationList' })
      });
      container.innerHTML = `
        <div style="text-align: center; padding: 30px; grid-column: 1 / -1;">
          <div style="font-size: 28px; margin-bottom: 12px;">📡</div>
          <div style="font-weight: 700; color: #fff; margin-bottom: 6px;">正規MDMコマンド [InstalledApplicationList] をiPhoneへ発行しました</div>
          <div style="font-size: 12px; color: var(--text-muted); line-height: 1.6;">端末が通信時にインストール済みアプリの一覧を返送します。</div>
          <button class="btn btn-sm btn-primary" style="margin-top: 14px;" onclick="showInstalledApps('${udid}')">アプリ一覧を再読込</button>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    apps.forEach(app => {
      const card = document.createElement('div');
      card.className = 'app-card';
      const name = app.Name || app.Identifier || '不明なアプリ';
      const bundleId = app.Identifier || '';
      const version = app.Version || '';

      card.innerHTML = `
        <div class="app-icon-box">📦</div>
        <div class="app-info">
          <span class="app-name" title="${name}">${name}</span>
          <span class="app-bundle-id" title="${bundleId}">${bundleId}</span>
          ${version ? `<span class="app-version">v${version}</span>` : ''}
        </div>
      `;
      container.appendChild(card);
    });

  } catch (err) {
    container.innerHTML = `<div style="color: #ff453a; padding: 20px; text-align: center;">取得エラー: ${err.message}</div>`;
  }
};

document.getElementById('btnCloseAppsModal')?.addEventListener('click', () => {
  document.getElementById('appsModal')?.classList.remove('active');
});
document.getElementById('btnCloseAppsModal2')?.addEventListener('click', () => {
  document.getElementById('appsModal')?.classList.remove('active');
});
