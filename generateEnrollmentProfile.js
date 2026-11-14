import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CERTS_DIR = path.join(__dirname, 'certs');
const p12Buffer = fs.readFileSync(path.join(CERTS_DIR, 'device.p12'));
const caBuffer = fs.readFileSync(path.join(CERTS_DIR, 'ca.crt'));

const p12Base64 = p12Buffer.toString('base64');
const caBase64 = caBuffer.toString('base64');

const profileUUID = crypto.randomUUID().toUpperCase();
const rootCaUUID = crypto.randomUUID().toUpperCase();
const identityUUID = crypto.randomUUID().toUpperCase();
const mdmPayloadUUID = crypto.randomUUID().toUpperCase();

const serverUrl = 'https://look-mixture-answers-ship.trycloudflare.com/mdm/command';
const checkInUrl = 'https://look-mixture-answers-ship.trycloudflare.com/mdm/checkin';
const topic = 'com.apple.mgmt.tamaben.lock';

const profileXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PayloadContent</key>
	<array>
		<!-- 1. Root CA Certificate -->
		<dict>
			<key>PayloadCertificateFileName</key>
			<string>TAMABEN_LOCK_CA.crt</string>
			<key>PayloadContent</key>
			<data>${caBase64}</data>
			<key>PayloadDescription</key>
			<string>TAMABEN LOCK ルート認証局証明書</string>
			<key>PayloadDisplayName</key>
			<string>TAMABEN LOCK Root CA</string>
			<key>PayloadIdentifier</key>
			<string>com.tamaben.lock.rootca</string>
			<key>PayloadType</key>
			<string>com.apple.security.root</string>
			<key>PayloadUUID</key>
			<string>${rootCaUUID}</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
		</dict>

		<!-- 2. Device Identity Certificate (PKCS#12) -->
		<dict>
			<key>PayloadCertificateFileName</key>
			<string>device.p12</string>
			<key>PayloadContent</key>
			<data>${p12Base64}</data>
			<key>Password</key>
			<string>tamaben</string>
			<key>PayloadDescription</key>
			<string>TAMABEN LOCK 端末識別証明書</string>
			<key>PayloadDisplayName</key>
			<string>TAMABEN LOCK Identity</string>
			<key>PayloadIdentifier</key>
			<string>com.tamaben.lock.identity</string>
			<key>PayloadType</key>
			<string>com.apple.security.pkcs12</string>
			<key>PayloadUUID</key>
			<string>${identityUUID}</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
		</dict>

		<!-- 3. Apple MDM Service Payload -->
		<dict>
			<key>AccessRights</key>
			<integer>8191</integer>
			<key>CheckInURL</key>
			<string>${checkInUrl}</string>
			<key>CheckOutWhenRemoved</key>
			<true/>
			<key>IdentityCertificateUUID</key>
			<string>${identityUUID}</string>
			<key>PayloadDescription</key>
			<string>TAMABEN LOCK MDM サービス管理設定</string>
			<key>PayloadDisplayName</key>
			<string>TAMABEN LOCK デバイス管理</string>
			<key>PayloadIdentifier</key>
			<string>com.tamaben.lock.mdm.service</string>
			<key>PayloadOrganization</key>
			<string>TAMABEN LOCK</string>
			<key>PayloadType</key>
			<string>com.apple.mdm</string>
			<key>PayloadUUID</key>
			<string>${mdmPayloadUUID}</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>ServerURL</key>
			<string>${serverUrl}</string>
			<key>SignMessage</key>
			<false/>
			<key>Topic</key>
			<string>${topic}</string>
		</dict>
	</array>

	<key>PayloadDescription</key>
	<string>TAMABEN LOCK 正式Apple MDM管理登録プロファイル</string>
	<key>PayloadDisplayName</key>
	<string>TAMABEN LOCK MDM 登録</string>
	<key>PayloadIdentifier</key>
	<string>com.tamaben.lock.mdm.enrollment</string>
	<key>PayloadOrganization</key>
	<string>TAMABEN LOCK</string>
	<key>PayloadRemovalDisallowed</key>
	<false/>
	<key>PayloadType</key>
	<string>Configuration</string>
	<key>PayloadUUID</key>
	<string>${profileUUID}</string>
	<key>PayloadVersion</key>
	<integer>1</integer>
</dict>
</plist>`;

const outputPath = path.join(__dirname, '..', 'TAMABEN_LOCK_MDM_登録.mobileconfig');
fs.writeFileSync(outputPath, profileXml, 'utf8');
console.log(`Enrollment profile written to ${outputPath}`);
