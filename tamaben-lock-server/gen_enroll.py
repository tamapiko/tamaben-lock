import base64

with open('/Users/uedamasahiro/.gemini/antigravity/scratch/TAMABEN_LOCK/server/certs/ca.crt', 'rb') as f:
    ca_b64 = base64.b64encode(f.read()).decode('utf-8')

with open('/Users/uedamasahiro/.gemini/antigravity/scratch/TAMABEN_LOCK/server/certs/device.p12', 'rb') as f:
    p12_b64 = base64.b64encode(f.read()).decode('utf-8')

content = f'''import crypto from 'node:crypto';

const CA_BASE64 = '{ca_b64}';
const P12_BASE64 = '{p12_b64}';

export function generateEnrollmentXml(hostUrl) {{
  const profileUUID = crypto.randomUUID().toUpperCase();
  const rootCaUUID = crypto.randomUUID().toUpperCase();
  const identityUUID = crypto.randomUUID().toUpperCase();
  const mdmPayloadUUID = crypto.randomUUID().toUpperCase();

  const base = hostUrl || 'https://tamaben-lock.onrender.com';
  const serverUrl = base + '/mdm/command';
  const checkInUrl = base + '/mdm/checkin';
  const topic = 'com.apple.mgmt.tamaben.lock';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PayloadContent</key>
	<array>
		<dict>
			<key>PayloadCertificateFileName</key>
			<string>TAMABEN_LOCK_CA.crt</string>
			<key>PayloadContent</key>
			<data>${{CA_BASE64}}</data>
			<key>PayloadDescription</key>
			<string>TAMABEN LOCK ルート認証局証明書</string>
			<key>PayloadDisplayName</key>
			<string>TAMABEN LOCK Root CA</string>
			<key>PayloadIdentifier</key>
			<string>com.tamaben.lock.rootca</string>
			<key>PayloadType</key>
			<string>com.apple.security.root</string>
			<key>PayloadUUID</key>
			<string>${{rootCaUUID}}</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
		</dict>
		<dict>
			<key>PayloadCertificateFileName</key>
			<string>device.p12</string>
			<key>PayloadContent</key>
			<data>${{P12_BASE64}}</data>
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
			<string>${{identityUUID}}</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
		</dict>
		<dict>
			<key>AccessRights</key>
			<integer>8191</integer>
			<key>CheckInURL</key>
			<string>${{checkInUrl}}</string>
			<key>CheckOutWhenRemoved</key>
			<true/>
			<key>IdentityCertificateUUID</key>
			<string>${{identityUUID}}</string>
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
			<string>${{mdmPayloadUUID}}</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>ServerURL</key>
			<string>${{serverUrl}}</string>
			<key>SignMessage</key>
			<false/>
			<key>Topic</key>
			<string>${{topic}}</string>
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
	<true/>
	<key>PayloadType</key>
	<string>Configuration</string>
	<key>PayloadUUID</key>
	<string>${{profileUUID}}</string>
	<key>PayloadVersion</key>
	<integer>1</integer>
</dict>
</plist>`;
}}
'''

with open('/Users/uedamasahiro/.gemini/antigravity/scratch/TAMABEN_LOCK/server/enrollGenerator.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
