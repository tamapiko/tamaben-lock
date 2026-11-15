import crypto from 'node:crypto';

export function generateUnifiedTamabenRockProfile(options = {}) {
  const hostUrl = options.hostUrl || 'https://tamaben-lock.onrender.com';

  const profileUUID = crypto.randomUUID().toUpperCase();
  const restrictionsUUID = crypto.randomUUID().toUpperCase();
  const webClipUUID = crypto.randomUUID().toUpperCase();

  const payloads = [];

  // 1. Restrictions Payload (全機能制限解除・アプリ禁止リスト空)
  payloads.push(`
		<dict>
			<key>PayloadDescription</key>
			<string>TAMABEN ROCK 基本設定 (機能制限解除済み)</string>
			<key>PayloadDisplayName</key>
			<string>TAMABEN ROCK 設定</string>
			<key>PayloadIdentifier</key>
			<string>com.tamaben.rock.restrictions</string>
			<key>PayloadType</key>
			<string>com.apple.applicationaccess</string>
			<key>PayloadUUID</key>
			<string>${restrictionsUUID}</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>PayloadOrganization</key>
			<string>TAMABEN ROCK</string>
			
			<key>allowAppInstallation</key>
			<true/>
			<key>allowAppRemoval</key>
			<true/>
			<key>allowPasscodeModification</key>
			<true/>
			<key>allowBluetoothModification</key>
			<true/>
			<key>allowCamera</key>
			<true/>
			<key>allowAirDrop</key>
			<true/>
		</dict>`);

  // 2. Managed WebClip (Dedicated Offline Smartphone Software)
  payloads.push(`
		<dict>
			<key>PayloadDescription</key>
			<string>TAMABEN ROCK 専用ソフト (ローカル・オフライン対応)</string>
			<key>PayloadDisplayName</key>
			<string>TAMABEN ROCK 専用アプリ</string>
			<key>PayloadIdentifier</key>
			<string>com.tamaben.rock.webclip</string>
			<key>PayloadType</key>
			<string>com.apple.webClip.managed</string>
			<key>PayloadUUID</key>
			<string>${webClipUUID}</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>PayloadOrganization</key>
			<string>TAMABEN ROCK</string>
			<key>Label</key>
			<string>TAMABEN ROCK</string>
			<key>URL</key>
			<string>${hostUrl}/app/</string>
			<key>IsRemovable</key>
			<false/>
			<key>FullScreen</key>
			<true/>
		</dict>`);

  // Unified Mobileconfig Plist
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PayloadContent</key>
	<array>${payloads.join('\n')}
	</array>
	<key>PayloadDescription</key>
	<string>TAMABEN ROCK 統合構成プロファイル (AirDrop・アプリ制限解除済み)</string>
	<key>PayloadDisplayName</key>
	<string>TAMABEN ROCK</string>
	<key>PayloadIdentifier</key>
	<string>com.tamaben.rock.unified</string>
	<key>PayloadOrganization</key>
	<string>TAMABEN ROCK</string>
	<key>PayloadType</key>
	<string>Configuration</string>
	<key>PayloadUUID</key>
	<string>${profileUUID}</string>
	<key>PayloadVersion</key>
	<integer>1</integer>
</dict>
</plist>`;
}