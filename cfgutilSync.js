import { exec } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateMobileConfig } from './profileGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CFGUTIL_PATH = '/Applications/Apple Configurator.app/Contents/MacOS/cfgutil';
const PROFILE_PATH = path.join(__dirname, '..', 'TAMABEN_LOCK_完全版ベース.mobileconfig');
const PROFILE_IDENTIFIER = 'com.tamaben.lock.profile.base';

// プロファイルを直接適用 (制限開始 / 設定更新)
export function syncProfileToConnectedDevice(config, callback) {
  try {
    const xml = generateMobileConfig(config);
    fs.writeFileSync(PROFILE_PATH, xml, 'utf8');

    const cmd = `"${CFGUTIL_PATH}" install-profile "${PROFILE_PATH}"`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.log(`[Cfgutil Install Warning] ${stderr || err.message}`);
        if (callback) callback(false, stderr || err.message);
      } else {
        console.log(`[Cfgutil Install Success] Profile applied to connected iPhone`);
        if (callback) callback(true, stdout);
      }
    });
  } catch (e) {
    console.error('[Cfgutil Sync Error]', e);
    if (callback) callback(false, e.message);
  }
}

// プロファイルを直接サイレント削除 (制限解除 / 緊急解除)
export function removeProfileFromConnectedDevice(callback) {
  try {
    const cmd = `"${CFGUTIL_PATH}" remove-profile ${PROFILE_IDENTIFIER}`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.log(`[Cfgutil Remove Warning] ${stderr || err.message}`);
        if (callback) callback(false, stderr || err.message);
      } else {
        console.log(`[Cfgutil Remove Success] Profile removed silently from connected iPhone`);
        if (callback) callback(true, stdout);
      }
    });
  } catch (e) {
    console.error('[Cfgutil Remove Error]', e);
    if (callback) callback(false, e.message);
  }
}
