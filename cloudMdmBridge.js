import { exec } from 'node:child_process';

const CFGUTIL = '/Applications/Apple Configurator.app/Contents/MacOS/cfgutil';
const CLOUD_URL = 'https://tamaben-lock.onrender.com/api/config';

let localIsLocked = false;
let isBusy = false;

console.log("==========================================================");
console.log(" 🌐 TAMABEN ROCK クラウドMDMリアルタイム遠隔コントローラー");
console.log(" ※追加プロファイルなし・アイコン配置保持・MDM純正紛失モード専用");
console.log(" クラウドURL:", CLOUD_URL);
console.log("==========================================================");

function runCommand(cmd) {
  return new Promise((resolve) => {
    exec(cmd, (err, stdout, stderr) => {
      resolve({ err, stdout, stderr });
    });
  });
}

async function checkCloudStatus() {
  if (isBusy) return;
  try {
    const res = await fetch(CLOUD_URL + '?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return;

    const data = await res.json();
    const serverIsLocked = data.system?.isLocked === true;
    const lockMode = data.system?.lockMode || 'YOUTUBE_24H';

    // 1. インターネット経由でロックが指示された場合 (プロファイルなし・MDM紛失モード発動)
    if (serverIsLocked && !localIsLocked) {
      isBusy = true;
      console.log(`\n[リアルタイム検知] ロック要求を受信 (モード: ${lockMode})`);
      console.log(">>> MDM純正「紛失モード」をインターネット経由で発動中 (アイコン配置保持)...");

      const lostMsg = "【24時間スマホ封印企画 実行中】\\n企画終了まで端末は使用できません。";
      const cmd = `"${CFGUTIL}" enable-lost-mode --message "${lostMsg}" --phone "090-0000-0000"`;
      const { err, stdout, stderr } = await runCommand(cmd);

      if (!err) {
        console.log("✅ [遠隔ロック成功] iPhone本体が完全にロックされました！");
        console.log("   (ホーム画面のアイコン配置・フォルダは100%保持されています)");
        localIsLocked = true;
      } else {
        console.log("⚠️ MDM実行結果:", stderr || err.message || stdout);
        localIsLocked = true;
      }
      isBusy = false;
    }

    // 2. インターネット経由で解除が指示された場合 (プロファイルなし・MDM紛失モード解除)
    else if (!serverIsLocked && localIsLocked) {
      isBusy = true;
      console.log("\n[リアルタイム検知] 解除要求を受信");
      console.log(">>> MDM「紛失モード」を遠隔解除中...");

      const cmd = `"${CFGUTIL}" disable-lost-mode`;
      const { err, stdout, stderr } = await runCommand(cmd);

      if (!err) {
        console.log("✅ [遠隔解除成功] iPhoneのロックが解除されました！");
        console.log("   (ホーム画面の配置も崩れず、そのまま元通りに復帰しました)");
        localIsLocked = false;
      } else {
        console.log("⚠️ MDM解除結果:", stderr || err.message || stdout);
        localIsLocked = false;
      }
      isBusy = false;
    }

  } catch (err) {
    // 通信エラー時は無視
  }
}

// 1.5秒ごとにインターネット経由でリアルタイム監視
setInterval(checkCloudStatus, 1500);
checkCloudStatus();
