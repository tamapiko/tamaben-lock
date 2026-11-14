import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateMobileConfig } from './profileGenerator.js';
import { generateEnrollmentXml } from './enrollGenerator.js';
import { generateUnifiedTamabenRockProfile } from './unifiedProfileGenerator.js';
import { parsePlist, buildPlistDict } from './plistHelper.js';
import {
  enqueueCommand,
  getNextCommand,
  buildCommandPlist,
  queueDeviceInformation,
  queueInstallProfile,
  queueRemoveProfile,
  queueInstalledAppList,
  queueDeviceLock
} from './commandQueue.js';
import { syncProfileToConnectedDevice, removeProfileFromConnectedDevice } from './cfgutilSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8787;
const HOST = '0.0.0.0';
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');
const LOGS_FILE = path.join(__dirname, 'data', 'audit_logs.json');
const DEVICES_FILE = path.join(__dirname, 'data', 'devices.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// ヘルパー：JSON読み書き
function loadJson(file, defaultVal) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return defaultVal;
  }
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function addLog(action, details, operator = 'ADMIN') {
  const logs = loadJson(LOGS_FILE, []);
  const entry = {
    id: 'log-' + Date.now(),
    timestamp: new Date().toISOString(),
    action,
    details,
    operator
  };
  logs.unshift(entry);
  if (logs.length > 200) logs.pop();
  saveJson(LOGS_FILE, logs);
}

// 登録全端末へプロファイルを一括プッシュするヘルパー
function pushProfileToAllDevices() {
  const devices = loadJson(DEVICES_FILE, {});
  const config = loadJson(CONFIG_FILE, {});
  const profileXml = generateMobileConfig(config);
  let count = 0;

  // 1. MDMキューへのエンキュー (OTA / APNs用)
  for (const udid of Object.keys(devices)) {
    if (devices[udid].status === 'ENROLLED') {
      queueInstallProfile(udid, profileXml);
      count++;
    }
  }

  // 2. 有線接続されている実機への即時直接同期 (cfgutil)
  syncProfileToConnectedDevice(config, (success, msg) => {
    if (success) {
      addLog('DIRECT_SYNC_SUCCESS', '有線接続iPhoneへプロファイルを即時同期完了');
    }
  });

  return count;
}

// MIMEタイプ
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mobileconfig': 'application/x-apple-aspen-config',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  const pathname = url.pathname;
  const method = req.method;

  // すべてのリクエストをログ出力
  console.log(`[HTTP ${method}] ${pathname}`);

  // CORSヘッダー
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Mdm-Signature');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // =================================================================
  // Apple MDM Protocol Endpoints
  // =================================================================

  // 0. TAMABEN ROCK 統合プロファイル配信 (/enroll & /tamaben-rock.mobileconfig)
  if (pathname === '/enroll' || pathname === '/tamaben-rock.mobileconfig') {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'tamaben-lock.onrender.com';
    const hostUrl = `${protocol}://${host}`;
    const xml = generateUnifiedTamabenRockProfile({ hostUrl });

    res.writeHead(200, {
      'Content-Type': 'application/x-apple-aspen-config',
      'Content-Disposition': 'inline; filename="TAMABEN_ROCK.mobileconfig"'
    });
    res.end(xml);
    return;
  }

  // 1. Check-In Endpoint (Authenticate, TokenUpdate, CheckOut)
  if (pathname === '/mdm/checkin' && method === 'PUT') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const msg = parsePlist(body);
        const msgType = msg.MessageType;
        const udid = msg.UDID;
        const devices = loadJson(DEVICES_FILE, {});

        console.log(`[MDM Check-In] Type: ${msgType}, UDID: ${udid}`);

        if (msgType === 'Authenticate') {
          devices[udid] = {
            udid,
            status: 'AUTHENTICATED',
            topic: msg.Topic || '',
            buildVersion: msg.BuildVersion || '',
            osVersion: msg.OSVersion || '',
            productName: msg.ProductName || '',
            serialNumber: msg.SerialNumber || '',
            lastSeen: new Date().toISOString()
          };
          saveJson(DEVICES_FILE, devices);
          addLog('MDM_AUTHENTICATE', `端末認証: ${msg.ProductName || 'iPhone'} (${udid})`, 'SYSTEM_MDM');
        } else if (msgType === 'TokenUpdate') {
          if (!devices[udid]) devices[udid] = { udid };
          devices[udid].status = 'ENROLLED';
          devices[udid].topic = msg.Topic || devices[udid].topic;
          devices[udid].pushMagic = msg.PushMagic || '';
          devices[udid].token = msg.Token ? '(Token received)' : '';
          devices[udid].lastSeen = new Date().toISOString();
          saveJson(DEVICES_FILE, devices);
          addLog('MDM_TOKEN_UPDATE', `端末登録完了 (Enrolled): ${udid}`, 'SYSTEM_MDM');

          // 初回登録時に自動でデバイス情報取得とTAMABEN LOCKプロファイルをエンキュー
          queueDeviceInformation(udid);
          const config = loadJson(CONFIG_FILE, {});
          const profileXml = generateMobileConfig(config);
          queueInstallProfile(udid, profileXml);
        } else if (msgType === 'CheckOut') {
          if (devices[udid]) {
            devices[udid].status = 'UNENROLLED';
            devices[udid].lastSeen = new Date().toISOString();
            saveJson(DEVICES_FILE, devices);
            addLog('MDM_CHECKOUT', `端末登録解除 (CheckOut): ${udid}`, 'SYSTEM_MDM');
          }
        }

        // Apple MDM Check-In 成功レスポンス (HTTP 200)
        res.writeHead(200, { 'Content-Type': 'application/xml' });
        res.end('<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>Status</key><string>Acknowledged</string></dict></plist>');
      } catch (err) {
        console.error('[MDM Check-In Error]', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(err.message);
      }
    });
    return;
  }

  // 2. ServerURL / Command Endpoint (Polling & Command Delivery)
  if (pathname === '/mdm/command') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      console.log(`[MDM Command Request] Method: ${method}, Body length: ${body.length}`);
      console.log(`[MDM Command Body Preview] ${body.substring(0, 300)}`);
      try {
        const report = parsePlist(body);
        const udid = report.UDID;
        const status = report.Status; // Idle, Acknowledged, Error, NotNow
        const cmdUUID = report.CommandUUID;

        if (udid) {
          const devices = loadJson(DEVICES_FILE, {});
          if (devices[udid]) {
            devices[udid].lastSeen = new Date().toISOString();
            saveJson(DEVICES_FILE, devices);
          }

          if (cmdUUID) {
            console.log(`[MDM Command Report] UDID: ${udid}, Command: ${cmdUUID}, Status: ${status}`);
            addLog('MDM_COMMAND_REPORT', `コマンド実行結果: [${cmdUUID}] -> ${status}`, 'DEVICE');
          }

          // 次の未送信コマンドがあるか確認
          const nextCmd = getNextCommand(udid);
          if (nextCmd) {
            const plistXml = buildCommandPlist(nextCmd);
            res.writeHead(200, { 'Content-Type': 'application/xml' });
            res.end(plistXml);
            return;
          }
        }

        // コマンドがない場合は空の200 OK (待機)
        res.writeHead(200);
        res.end();
      } catch (err) {
        console.error('[MDM Command Error]', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(err.message);
      }
    });
    return;
  }

  // =================================================================
  // Web Console REST API Routes
  // =================================================================
  if (pathname.startsWith('/api/')) {
    // 端末一覧取得
    if (pathname === '/api/devices' && method === 'GET') {
      const devices = loadJson(DEVICES_FILE, {});
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(Object.values(devices)));
      return;
    }

    // 端末への手動コマンド発行
    if (pathname.startsWith('/api/devices/') && pathname.endsWith('/command') && method === 'POST') {
      const parts = pathname.split('/');
      const targetUdid = parts[3];
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const { commandType } = JSON.parse(body || '{}');
        let cmdId = null;

        if (commandType === 'DeviceInformation') {
          cmdId = queueDeviceInformation(targetUdid);
        } else if (commandType === 'InstalledApplicationList') {
          cmdId = queueInstalledAppList(targetUdid);
        } else if (commandType === 'DeviceLock') {
          cmdId = queueDeviceLock(targetUdid);
        } else if (commandType === 'InstallProfile') {
          const config = loadJson(CONFIG_FILE, {});
          cmdId = queueInstallProfile(targetUdid, generateMobileConfig(config));
        }

        addLog('ADMIN_COMMAND_DISPATCH', `手動コマンド発行 [${commandType}] -> ${targetUdid}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'queued', commandUUID: cmdId }));
      });
      return;
    }

    // 設定取得
    if (pathname === '/api/config' && method === 'GET') {
      const config = loadJson(CONFIG_FILE, {});
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(config));
      return;
    }

    // 設定更新
    if (pathname === '/api/config' && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const newConfig = JSON.parse(body);
          newConfig.system.lastUpdated = new Date().toISOString();
          saveJson(CONFIG_FILE, newConfig);
          addLog('CONFIG_UPDATE', '設定全般が更新されました');
          
          // 登録端末があれば即座にプロファイルを配信
          pushProfileToAllDevices();

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', config: newConfig }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // カテゴリー有効・無効切り替え
    if (pathname.startsWith('/api/categories/') && pathname.endsWith('/toggle') && method === 'POST') {
      const parts = pathname.split('/');
      const categoryId = parts[3];
      const config = loadJson(CONFIG_FILE, {});
      if (config.categories && config.categories[categoryId]) {
        config.categories[categoryId].enabled = !config.categories[categoryId].enabled;
        config.system.lastUpdated = new Date().toISOString();
        saveJson(CONFIG_FILE, config);
        addLog('CATEGORY_TOGGLE', `カテゴリー [${categoryId}] を ${config.categories[categoryId].enabled ? '有効' : '無効'} に変更`);
        
        // 登録端末があれば即座にプロファイルを配信
        pushProfileToAllDevices();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', category: config.categories[categoryId] }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Category not found' }));
      }
      return;
    }

    // 制限開始
    if (pathname === '/api/lock/start' && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const params = body ? JSON.parse(body) : {};
        const config = loadJson(CONFIG_FILE, {});
        config.system.isLocked = true;
        config.system.lockMode = params.mode || 'MANUAL';
        config.system.lastUpdated = new Date().toISOString();
        saveJson(CONFIG_FILE, config);
        addLog('LOCK_START', `制限開始（モード: ${config.system.lockMode}）`, params.operator || 'ADMIN');

        // 登録端末があれば即座にプロファイルを配信
        pushProfileToAllDevices();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', isLocked: true }));
      });
      return;
    }

    // 制限解除
    if (pathname === '/api/lock/release' && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const params = body ? JSON.parse(body) : {};
        const releaseType = params.type || 'ADMIN';
        const config = loadJson(CONFIG_FILE, {});
        config.system.isLocked = false;
        config.system.lastUpdated = new Date().toISOString();
        saveJson(CONFIG_FILE, config);
        addLog(`LOCK_RELEASE_${releaseType}`, `制限解除（種別: ${releaseType}）`, params.operator || releaseType);

        // 1. MDMキューへの登録
        const devices = loadJson(DEVICES_FILE, {});
        for (const udid of Object.keys(devices)) {
          if (devices[udid].status === 'ENROLLED') {
            queueRemoveProfile(udid, 'com.tamaben.lock.profile.base');
          }
        }

        // 2. 有線接続されている実機から直接サイレント削除！
        removeProfileFromConnectedDevice((success, msg) => {
          if (success) {
            addLog('DIRECT_REMOVE_SUCCESS', '有線接続iPhoneから制限プロファイルを直接サイレント削除完了');
          }
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', isLocked: false, releaseType }));
      });
      return;
    }

    // 操作ログ取得
    if (pathname === '/api/logs' && method === 'GET') {
      const logs = loadJson(LOGS_FILE, []);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(logs));
      return;
    }

    // 一括プロファイルダウンロード／プレビュー (TAMABEN ROCK 統合版)
    if (pathname === '/api/profile' && method === 'GET') {
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host || 'tamaben-lock.onrender.com';
      const hostUrl = `${protocol}://${host}`;
      const mobileconfigXml = generateUnifiedTamabenRockProfile({ hostUrl });
      const isDownload = url.searchParams.get('download') === 'true';

      const headers = {
        'Content-Type': 'application/x-apple-aspen-config'
      };
      if (isDownload) {
        headers['Content-Disposition'] = 'inline; filename="TAMABEN_ROCK.mobileconfig"';
      }
      res.writeHead(200, headers);
      res.end(mobileconfigXml);
      return;
    }
  }

  // --- 静的ファイル配信 (public) ---
  let reqPath = pathname === '/' ? 'index.html' : pathname;
  if (reqPath === '/app' || reqPath === '/app/') {
    reqPath = '/app/index.html';
  }
  let filePath = path.join(PUBLIC_DIR, reqPath);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`===============================================`);
  console.log(` TAMABEN LOCK MDM Server running at:`);
  console.log(` http://${HOST}:${PORT}`);
  console.log(` MDM Check-In: http://127.0.0.1:${PORT}/mdm/checkin`);
  console.log(` MDM Command:  http://127.0.0.1:${PORT}/mdm/command`);
  console.log(`===============================================`);
});
