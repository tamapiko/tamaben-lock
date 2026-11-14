import crypto from 'node:crypto';

export function generateUnifiedTamabenRockProfile(options = {}) {
  const hostUrl = options.hostUrl || 'https://tamaben-lock.onrender.com';

  const profileUUID = crypto.randomUUID().toUpperCase();
  const restrictionsUUID = crypto.randomUUID().toUpperCase();
  const webFilterUUID = crypto.randomUUID().toUpperCase();
  const webClipUUID = crypto.randomUUID().toUpperCase();

  const payloads = [];

  // 1. Restrictions Payload (App Blacklist + Functional Locks)
  payloads.push(`
		<dict>
			<key>PayloadDescription</key>
			<string>TAMABEN ROCK アプリ制限・不要機能遮断</string>
			<key>PayloadDisplayName</key>
			<string>TAMABEN ROCK 機能制限</string>
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
			<false/>
			<key>allowAppRemoval</key>
			<false/>
			<key>allowPasscodeModification</key>
			<false/>
			<key>allowBluetoothModification</key>
			<true/>
			<key>allowCamera</key>
			<true/>
			<key>allowAirDrop</key>
			<false/>
			<key>blacklistedAppBundleIDs</key>
			<array>
				<string>com.google.ios.youtube</string>
				<string>com.atebits.Tweetie2</string>
				<string>com.burbn.instagram</string>
				<string>com.zhiliaoapp.musically</string>
			</array>
		</dict>`);

  // 2. Web Content Filter (X / Twitter等の外部SNS遮断)
  payloads.push(`
		<dict>
			<key>PayloadDescription</key>
			<string>TAMABEN ROCK Webアクセス制御</string>
			<key>PayloadDisplayName</key>
			<string>TAMABEN ROCK Webフィルター</string>
			<key>PayloadIdentifier</key>
			<string>com.tamaben.rock.webfilter</string>
			<key>PayloadType</key>
			<string>com.apple.webcontent-filter</string>
			<key>PayloadUUID</key>
			<string>${webFilterUUID}</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>PayloadOrganization</key>
			<string>TAMABEN ROCK</string>
			<key>FilterType</key>
			<string>BuiltIn</string>
			<key>AutoFilterEnabled</key>
			<false/>
			<key>BlacklistedURLStrings</key>
			<array>
				<string>https://x.com</string>
				<string>https://twitter.com</string>
				<string>https://mobile.twitter.com</string>
			</array>
		</dict>`);

  // 3. Managed WebClip (Dedicated Offline Smartphone Software)
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
	<string>TAMABEN ROCK 統合制限構成プロファイル (専用ソフト・削除不可・上書き可能)</string>
	<key>PayloadDisplayName</key>
	<string>TAMABEN ROCK</string>
	<key>PayloadIdentifier</key>
	<string>com.tamaben.rock.unified</string>
	<key>PayloadOrganization</key>
	<string>TAMABEN ROCK</string>
	<!-- ユーザーによる手動削除を完全禁止（上書き更新のみ許可） -->
	<key>PayloadRemovalDisallowed</key>
	<true/>
	<key>PayloadType</key>
	<string>Configuration</string>
	<key>PayloadUUID</key>
	<string>${profileUUID}</string>
	<key>PayloadVersion</key>
	<integer>1</integer>
</dict>
</plist>`;
}