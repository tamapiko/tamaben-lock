import { exec } from 'node:child_process';

const CFGUTIL = '/Applications/Apple Configurator.app/Contents/MacOS/cfgutil';
const CLOUD_URL = 'https://tamaben-lock.onrender.com/api/config';
const HEARTBEAT_URL = 'https://tamaben-lock.onrender.com/api/heartbeat';

let localIsLocked = false;
let isBusy = false;

console.log("==========================================================");
console.log(" 🌐 TAMABEN ROCK クラウドMDM 1分定期連携コントローラー");
console.log(" サーバー ⇄ スマホ MDM連携通信: 1分周期で完全同期中");
console.log("==========================================================");

function runCommand(cmd) {
  return new Promise((resolve) => {
    exec(cmd, (err, stdout, stderr) => {
      resolve({ err, stdout, stderr });
    });
  });
}

// 1分ごとのMDM定期チェックイン・同期
async function perform1MinMdmSync() {
  try {
    const res = await fetch(HEARTBEAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        udid: "00008150-000603890263C01C",
        isLocked: localIsLocked,
        source: "MDM_BRIDGE_1MIN",
        timestamp: Date.now()
      })
    });
    if (res.ok) {
      console.log(`[1分MDM定期通信] サーバーと連携通信完了 (${new Date().toLocaleTimeString()})`);
    }
  } catch (e) {
    // 通信エラー待機
  }
}

async function checkCloudStatus() {
  if (isBusy) return;
  try {
    const res = await fetch(CLOUD_URL + '?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return;

    const data = await res.json();
    const serverIsLocked = data.system?.isLocked === true;
    const lockMode = data.system?.lockMode || 'YOUTUBE_24H';

    // 1. ロック要求を受信
    if (serverIsLocked && !localIsLocked) {
      isBusy = true;
      console.log(`\n[リアルタイム検知] ロック要求を受信 (モード: ${lockMode})`);
      console.log(">>> MDM純正「紛失モード」をインターネット経由で発動中...");

      const lostMsg = "【24時間スマホ封印企画 実行中】\\n企画終了まで端末は使用できません。";
      const cmd = `"${CFGUTIL}" enable-lost-mode --message "${lostMsg}" --phone "090-0000-0000"`;
      const { err, stdout, stderr } = await runCommand(cmd);

      if (!err) {
        console.log("✅ [MDMロック成功] iPhone本体が完全にロックされました！");
        localIsLocked = true;
      } else {
        console.log("⚠️ MDM実行結果:", stderr || err.message || stdout);
        localIsLocked = true;
      }
      isBusy = false;
    }

    // 2. 解除要求を受信
    else if (!serverIsLocked && localIsLocked) {
      isBusy = true;
      console.log("\n[リアルタイム検知] 解除要求を受信");
      console.log(">>> MDM「紛失モード」を遠隔解除中...");

      const cmd = `"${CFGUTIL}" disable-lost-mode`;
      const { err, stdout, stderr } = await runCommand(cmd);

      if (!err) {
        console.log("✅ [MDM解除成功] iPhoneのロックが解除されました！");
        localIsLocked = false;
      } else {
        console.log("⚠️ MDM解除結果:", stderr || err.message || stdout);
        localIsLocked = false;
      }
      isBusy = false;
    }

  } catch (err) {}
}

// 1.5秒ごとの即時ロック監視 ＆ 60秒（1分）ごとの定期連携通信
setInterval(checkCloudStatus, 1500);
setInterval(perform1MinMdmSync, 60000);
perform1MinMdmSync();
checkCloudStatus();
