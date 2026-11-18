import crypto from 'node:crypto';

export function generateMobileConfig(config) {
  const profileUUID = crypto.randomUUID().toUpperCase();
  const orgName = config.system?.name || 'TAMABEN LOCK';

  const cats = config.categories || {};
  const isBaseEnabled = cats.BASE?.enabled;
  const isAppEnabled = cats.APPLICATION?.enabled;
  const isSecEnabled = cats.SECURITY?.enabled;
  const isWebEnabled = cats.WEB?.enabled;
  const isHomeEnabled = cats.HOME?.enabled;

  const payloads = [];
  // ==========================================
  // 0. Single App Mode (com.apple.app.lock) - 24時間企画ロック用
  // ==========================================
  const isLocked = config.system?.isLocked;
  const isYoutubeMode = config.system?.lockMode === "YOUTUBE_24H" || isLocked;

  if (isLocked) {
    const appLockUUID = crypto.randomUUID().toUpperCase();
    payloads.push(`
		<!-- 0. 単一アプリ封印ロック (専用アプリ以外一切使用不可) -->
		<dict>
			<key>PayloadDescription</key>
			<string>TAMABEN LOCK 24時間封印 単一アプリモード</string>
			<key>PayloadDisplayName</key>
			<string>TAMABEN LOCK 単一アプリ封印</string>
			<key>PayloadIdentifier</key>
			<string>com.tamaben.lock.applock</string>
			<key>PayloadType</key>
			<string>com.apple.app.lock</string>
			<key>PayloadUUID</key>
			<string>${appLockUUID}</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>PayloadOrganization</key>
			<string>${orgName}</string>
			<key>App</key>
			<dict>
				<key>Identifier</key>
				<string>com.tamaben.lock.app</string>
				<key>Options</key>
				<dict>
					<key>DisableTouch</key>
					<false/>
					<key>DisableDeviceRotation</key>
					<false/>
					<key>DisableVolumeButtons</key>
					<false/>
					<key>DisableRingerSwitch</key>
					<false/>
					<key>DisableSleepWakeButton</key>
					<false/>
					<key>DisableAutoLock</key>
					<false/>
				</dict>
			</dict>
		</dict>`);
  }


  // ==========================================
  // 1. Restrictions Payload (com.apple.applicationaccess)
  // ==========================================
  const restrictionsUUID = crypto.randomUUID().toUpperCase();
  const allowAppInstallation = isAppEnabled ? (cats.APPLICATION.allowAppInstallation !== false) : true;
  const allowAppRemoval = isAppEnabled ? (cats.APPLICATION.allowAppRemoval !== false) : true;
  const allowSafari = isWebEnabled ? (cats.WEB.allowSafari !== false) : true;
  const allowPasscodeModification = isSecEnabled ? (cats.SECURITY.allowPasscodeModification !== false) : true;
  const allowBluetoothModification = isBaseEnabled ? (cats.BASE.allowBluetoothModification !== false) : true;
  const allowProfileRemoval = isBaseEnabled ? (cats.BASE.allowProfileRemoval !== false) : true;

  // カメラ・AirDrop（スマホ全体制限用）
  const allowCamera = isSecEnabled ? (cats.SECURITY.allowCamera !== false) : true;
  const allowAirDrop = isSecEnabled ? (cats.SECURITY.allowAirDrop !== false) : true;

  // 指定アプリ非表示（ブラックリスト: 監視対象専用）
  let whitelistedAppsXml = '';
  if (isLocked) {
    // ロック中は専用アプリ（および緊急電話）以外すべてのアプリをOSレベルで完全非表示・使用不可にする！
    whitelistedAppsXml = `
			<key>whitelistedAppBundleIDs</key>
			<array>
				<string>com.tamaben.lock.app</string>
				<string>com.apple.mobilephone</string>
			</array>`;
  }

  let blacklistedAppsXml = '';
  const blacklistedApps = (isAppEnabled && cats.APPLICATION.blockedAppBundleIDs) || [];
  if (blacklistedApps.length > 0) {
    blacklistedAppsXml = '\n\t\t\t<key>blacklistedAppBundleIDs</key>\n\t\t\t<array>';
    for (const bundleId of blacklistedApps) {
      blacklistedAppsXml += `\n\t\t\t\t<string>${bundleId}</string>`;
    }
    blacklistedAppsXml += '\n\t\t\t</array>';
  }

  payloads.push(`
		<!-- 1. 基本・アプリ・セキュリティ制限 -->
		<dict>
			<key>PayloadDescription</key>
			<string>TAMABEN LOCK 基本機能制限</string>
			<key>PayloadDisplayName</key>
			<string>TAMABEN LOCK 機能制限</string>
			<key>PayloadIdentifier</key>
			<string>com.tamaben.lock.restrictions</string>
			<key>PayloadType</key>
			<string>com.apple.applicationaccess</string>
			<key>PayloadUUID</key>
			<string>${restrictionsUUID}</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>PayloadOrganization</key>
			<string>${orgName}</string>
			
			<key>allowAppInstallation</key>
			<${allowAppInstallation}/>
			<key>allowAppRemoval</key>
			<${allowAppRemoval}/>
			<key>allowSafari</key>
			<${allowSafari}/>
			<key>allowPasscodeModification</key>
			<${allowPasscodeModification}/>
			<key>allowBluetoothModification</key>
			<${allowBluetoothModification}/>
			<key>allowCamera</key>
			<${allowCamera}/>
			<key>allowAirDrop</key>
			<${allowAirDrop}/>${whitelistedAppsXml}${blacklistedAppsXml}
		</dict>`);

  // ==========================================
  // 2. Web Content Filter (com.apple.webcontent-filter)
  // ==========================================
  if (isWebEnabled && cats.WEB.filterBrowsing) {
    const webFilterUUID = crypto.randomUUID().toUpperCase();
    const blacklist = cats.WEB.blacklistedUrls || ['https://x.com', 'https://twitter.com', 'https://mobile.twitter.com'];
    
    let blacklistXml = '';
    for (const url of blacklist) {
      blacklistXml += `\n\t\t\t\t<string>${url}</string>`;
    }

    payloads.push(`
		<!-- 2. Webコンテンツ制限 (X/Twitter等の外部サイトブロック) -->
		<dict>
			<key>PayloadDescription</key>
			<string>TAMABEN LOCK 外部Webサイトアクセス制限</string>
			<key>PayloadDisplayName</key>
			<string>TAMABEN LOCK Webフィルター</string>
			<key>PayloadIdentifier</key>
			<string>com.tamaben.lock.webfilter</string>
			<key>PayloadType</key>
			<string>com.apple.webcontent-filter</string>
			<key>PayloadUUID</key>
			<string>${webFilterUUID}</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>PayloadOrganization</key>
			<string>${orgName}</string>
			<key>FilterType</key>
			<string>BuiltIn</string>
			<key>RestrictWeb</key>
			<true/>
			<key>BlacklistedURLs</key>
			<array>${blacklistXml}
			</array>
		</dict>`);
  }

  // ==========================================
  // 3. Web Clip (com.apple.webClip.managed)
  // ==========================================
  if (isHomeEnabled) {
    const webClipUUID = crypto.randomUUID().toUpperCase();
    const syncUrl = config.system?.syncUrl || 'https://look-mixture-answers-ship.trycloudflare.com';

    payloads.push(`
		<!-- 3. ホーム画面 同期Webクリップ -->
		<dict>
			<key>PayloadDescription</key>
			<string>TAMABEN LOCK ホーム画面 同期アイコン</string>
			<key>PayloadDisplayName</key>
			<string>TAMABEN LOCK 同期</string>
			<key>PayloadIdentifier</key>
			<string>com.tamaben.lock.webclip</string>
			<key>PayloadType</key>
			<string>com.apple.webClip.managed</string>
			<key>PayloadUUID</key>
			<string>${webClipUUID}</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>PayloadOrganization</key>
			<string>${orgName}</string>
			<key>Label</key>
			<string>TAMABEN LOCK</string>
			<key>URL</key>
			<string>${syncUrl}</string>
			<key>IsRemovable</key>
			<false/>
			<key>FullScreen</key>
			<true/>
		</dict>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PayloadContent</key>
	<array>${payloads.join('\n')}
	</array>
	<key>PayloadDescription</key>
	<string>TAMABEN LOCK 統合ポリシー構成プロファイル</string>
	<key>PayloadDisplayName</key>
	<string>TAMABEN LOCK 完全版ベース</string>
	<key>PayloadIdentifier</key>
	<string>com.tamaben.lock.profile.base</string>
	<key>PayloadOrganization</key>
	<string>${orgName}</string>
	<!-- ユーザーによる手動削除を禁止（上書き更新のみ許可） -->
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
