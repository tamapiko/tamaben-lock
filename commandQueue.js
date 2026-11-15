import crypto from 'node:crypto';
import { buildPlistDict } from './plistHelper.js';

// インメモリ＋永続化コマンドキュー
const queues = new Map(); // udid -> Array<Command>

export function enqueueCommand(udid, commandType, commandDetails = {}) {
  if (!queues.has(udid)) {
    queues.set(udid, []);
  }

  const commandUUID = crypto.randomUUID().toUpperCase();
  const commandObj = {
    CommandUUID: commandUUID,
    Command: {
      RequestType: commandType,
      ...commandDetails
    },
    createdAt: new Date().toISOString()
  };

  queues.get(udid).push(commandObj);
  console.log(`[MDM Queue] Enqueued ${commandType} (${commandUUID}) for ${udid}`);
  return commandUUID;
}

export function getNextCommand(udid) {
  if (!queues.has(udid) || queues.get(udid).length === 0) {
    return null;
  }
  return queues.get(udid).shift();
}

export function buildCommandPlist(commandObj) {
  return buildPlistDict({
    CommandUUID: commandObj.CommandUUID,
    Command: commandObj.Command
  });
}

// 便利なビルダー関数群
export function queueDeviceInformation(udid) {
  return enqueueCommand(udid, 'DeviceInformation', {
    Queries: [
      'DeviceName',
      'OSVersion',
      'BuildVersion',
      'ModelName',
      'Model',
      'SerialNumber',
      'BatteryLevel',
      'IsSupervised',
      'AvailableDeviceCapacity'
    ]
  });
}

export function queueInstallProfile(udid, profileXml) {
  const profileBuffer = Buffer.from(profileXml, 'utf8');
  return enqueueCommand(udid, 'InstallProfile', {
    Payload: profileBuffer
  });
}

export function queueRemoveProfile(udid, profileIdentifier) {
  return enqueueCommand(udid, 'RemoveProfile', {
    Identifier: profileIdentifier
  });
}

export function queueInstalledAppList(udid) {
  return enqueueCommand(udid, 'InstalledApplicationList', {});
}

export function queueDeviceLock(udid, message = 'TAMABEN ROCK 24時間スマホ禁止中', pin = '') {
  const details = { Message: message };
  if (pin) details.PIN = pin;
  return enqueueCommand(udid, 'DeviceLock', details);
}

// 紛失モード開始 (YouTube企画・24時間完全ロック用: パスコード入力不能・画面完全固定)
export function queueEnableLostMode(udid, message = '【YouTube企画】24時間スマホ禁止生活 実行中\n企画終了まで端末は使用できません。', footnote = 'TAMABEN ROCK デジタルデトックス') {
  return enqueueCommand(udid, 'EnableLostMode', {
    Message: message,
    Footnote: footnote
  });
}

// 紛失モード解除 (企画終了後の遠隔即時復帰)
export function queueDisableLostMode(udid) {
  return enqueueCommand(udid, 'DisableLostMode', {});
}
