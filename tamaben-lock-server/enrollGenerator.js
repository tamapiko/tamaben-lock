import crypto from 'node:crypto';

const CA_BASE64 = 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURSakNDQWk2Z0F3SUJBZ0lVYmF5Sy9aN3g0RENKN2RPVnhoVVlWa2hsL3o4d0RRWUpLb1pJaHZjTkFRRUwKQlFBd1F6RUxNQWtHQTFVRUJoTUNTbEF4RlRBVEJnTlZCQW9NREZSQlRVRkNSVTRnVEU5RFN6RWRNQnNHQTFVRQpBd3dVVkVGTlFVSkZUaUJNVDBOTElGSnZiM1FnUTBFd0hoY05Nall4TVRFek1UWXpNelUxV2hjTk16WXhNVEV3Ck1UWXpNelUxV2pCRE1Rc3dDUVlEVlFRR0V3SktVREVWTUJNR0ExVUVDZ3dNVkVGTlFVSkZUaUJNVDBOTE1SMHcKR3dZRFZRUUREQlJVUVUxQlFrVk9JRXhQUTBzZ1VtOXZkQ0JEUVRDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRApnZ0VQQURDQ0FRb0NnZ0VCQUtxNHRxQ3JwKzBoRDI5UGFwM0RtcmpYQUVzWm5DTmlCSVhZbUhSdFlEOWE3OVBDCnZJRi9mR29OS2hnMnZaVE1zOFM0akVZbDNHUHZrUHBML3JWOFdoUFhnZzBRWFNJTTA3cXM2QXpKUzZqSEtwT1EKc2tCcmhOWlRBT3VqdXFEd2FoSUx2dkZoRFphTUJuR0tSZmpIc0hrd1RTZ09zUll3LzRrVFN1ZmxQWWdjbXlWVwpkWlV0cFdHU0p4UlRMVTd2QnZKbEt6K1F0bEhkTjRDbjBVSE5PSG00RWtvWVFneTdpaFNYbE9iZDZzMHFaY25nCkx6MTZhYUIzb0NQWmRBQTF1OFpXQys5bXBWZGRLRjJjNEFsWlpIZlYrTlZYTjZJNVkzZkxLeG1GdHlPcnNKK3MKdEZWcUU3Q09UL3YxMkVCZTArWDRob0FsUWR4SkZ3WTZOU0k1Q2lNQ0F3RUFBYU15TURBd0hRWURWUjBPQkJZRQpGSVJKbGNZMVJybDA5bmJTNmZ6RjhncEI0bnlETUE4R0ExVWRFd0VCL3dRRk1BTUJBZjh3RFFZSktvWklodmNOCkFRRUxCUUFEZ2dFQkFDb1BEYVJtd2RIempWV3dQSEhVRStUeTBhcThpS0VvWW9QVXFldkV0NnBtRmM0ZlA1eDAKbTRzRWQzQTdWSnZ5OEQ3ejhxVlF6Qm5IeGU5ZWwwRGw5cVQ2N0tmcC92T1l2ZmxCM3NJS3FvL2lQdnVjZFU4Nwo1UmRrdDlnYU85a0VIS1lyQXk2SlRsSkF3bjVXNExONUhnWU1MMUtBekRMWHJlQ3JDRXkzWHVLQ3hsZC9RTmJ1CllQWjVLMUNSMDh0cXB0Y1JqQXc3d2E0M0wwUitvd2R5Mk9QbnRXSnhJaUJ1cGo4MXFjMDRLb1hUY3E5Tkh3K3QKRVgxZFFvcXRyREF3ZFZBM0N5OWl0c1h1OU5HaHhoWmNHL0RyT0ZqVE41bU1vZ1cvR1FoS0pwUkNZcG95blAwRwoydDV0QWcxWFBpZmhKLzJUSzROTTJZbTlQU014M2RMMGFNST0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=';
const P12_BASE64 = 'MIINxwIBAzCCDXUGCSqGSIb3DQEHAaCCDWYEgg1iMIINXjCCB8oGCSqGSIb3DQEHBqCCB7swgge3AgEAMIIHsAYJKoZIhvcNAQcBMF8GCSqGSIb3DQEFDTBSMDEGCSqGSIb3DQEFDDAkBBC9gGB7clB6Ud/2XSFz88d8AgIIADAMBggqhkiG9w0CCQUAMB0GCWCGSAFlAwQBKgQQEAupsWO7knTilbs7Gud2moCCB0B6myexYOKMdqV0aON4NE92q/hE2SjVahkm3HudJ0YXekNvNdUuknqxjBvfiEKxI/2ZgSoBCHh+dQclN/FInVrgQvugcDIldYSWFeRuOTPGdpP8t+HhsdF5CQgn42RSGT8oSvLUN7hXuXZnN+1AkgdmzSh+P+zPCeonxGFw5/wCdgTCroppPzoj20dDBg62iFCKczZC9ID5se0g1urDchFGQJJxA/XkZkPdcm/QhgP9ZuQxc6rUMKPKAH8mGj8IKOqc6A0QQ4bqo3n5rBz4kg0IrHOd5rkk85XDAzOX4iTWDzdJWmXl1q8lIQH9bKWnhOWYsLuBQL2Wg8DE27gEe35Pib5D3KONbkRmKNJZ7FHIKdVYgK3AXjJN9D0xxAyqvnMmySKhITv0xK3WzEh4AJbTPQSR5Jy/XpYRUVSPA/B55+8a2Yen91WhK/OBWMKhgo7HFYjtT2KW+wspjwXrCY9ZnPUKWD0uXNV3uoxdD4W7sjsBpNkQgoNL18g309TII2eG8Dhl1l80P8P3/VV2NVj2D5+i+3a+NKfpYaFRhO2Xt4zlS3tqResBvojSiRYvB+B2oM/xa4f6IkuVKKy2mF/NLlfKzVb8L0rhPqrMjIbejQNK59brO1ur3W76FwH4+84jQYmjLrlnqHEDlopAjPwLXW+w0zS4JpGdVk1Bx6Q6e58b4CdWf6+0cUvBfLk/joqfQSeJVH+8tuMe3VNfcvf9B9ehL5uTkZIbkNzYn4geB32u7LcKs7KPj6evYnoK6v0oTTKY6JawPqtXOUp85DG3MJzJIIChngP/7klKcw64OEDJjwBHGVuK+XQUFW/lnDCmL6nTcV3CENnA8Gx+QCCe1ZeXSvD8BF1XS0BZlS9tI8hDVi/ARI5UGL8ueitlzKaL7dmIp/Lzodz4zSxFh4CLGSD9gm0SQJbGTcGW79gbcHSaw8+KZzbbCaMAsARN6rIRzJdswP8EEuM7yrOvk2D8+hpC7+TEIozCGiHjuB0H97bncsTWXh/UkgQY8P9Y7/IM7uiRr4eElypG1PjgXCtL6cRFCk4UB5MNvf8yevMEsQWFC0Z0ncCv7A6s9qY7MF+fwg8nCw6aROhtcp1I5BrI1vvq4zh6vWcslxFG6WEwN9gyWDdBJoeLQZgUWsEKRnJH1JZNpfoG7UaX5XSYkVF63RgLXJpaAws2GFGgAY5BKlsVJFsmX0COMrtqslQb968JNUxgBKSZmMaZzR80QlLgDJSwdeaf4EenP6zrzBzgZNbHI9dVYgKP/tQMFkH+uxUacPnmaBQlhIxaMLKJhY10T7jdB29r/Bhf4ov4c7Vn6Y3j/apOZY9spXNkaKfLHX7rNzf3FfsE5Own0iSnXkKoMwVtplp5fJ4Txf+6uvgoy2juB9mYORzCQ+Yu162+bcjWaaogg+kC3HJw4u/TMWIXX3wOg3eKf+lG2V2DvFrm+nigSpC4TzXDvRuBanHiHKPXDZXWubvjFEX2g56anCNStR+82zYQJtoxYzlQ082Tbotg4/bC5Yd3orfIvkfCzPqJXg4IHUQkerAehDCVTb5LwkYd8VdQqANQWBCKTDAldf5/4EgXhO4gnvZ1gg2hkhSVCRHmSfA2R+PmCevXrc0uD6A5WjiFM4wx4vNaHOuLByezD+XzGJZfw7pBU8iOLKJZpiuzCQXsVViVlzLZbUu2rzMEcUjmc1g0xfI/yS0+gxResBonjZJTn2SWEBeDuyCjoaKQ19QRIKh8ISMkQo9dHRXnUBomVdQA5K1if6CCiRa6upPF8vG9Wh0zBXYMZhFNw83gN8K1GU4NR468cW6tXMP2GS9MRIeHscV0zaMdr8kroYqtAbtjKoB7KwGeIQulWKtH9KF3lMSSHp5dbiNoSHQLXUeggxXsQK9Gj1w4c/5FYt39WMccml0FNsMAyOcwQmjLE17YEyZWzI0BFansiUk7XKu2IcAXNcnFWCET86cgyfNsZUhEcgsLXZicC2qS/8gEokHli7E5RWwwY+2MZshBy8SYliFuGJp47o8j52AVCrgPnP6lwK6cMuFrX6G+n41FGiJ9W/6+VgbQXuti9FQ9d3FUKjiyCmvS6gdNCCNQfdID/DOReggWIuOdFQTzubV43j0tBT1895Tk8WMNKY3vL6rDXRvFjZr4TaDvuXa2xPTEMtHUgdSSFbxuDcOochqgl2jeBkz6sRjfUMZCbMzntwE927QiZYk1XKK+h0+UI+sr1XV58E+rfecmJlbJvNMKyH0yXhr43bTH05bKntlDJFxZfmSBHgBt3/PGhdpMfMSTwTTMyg+Xu8GAUkm9gBC2KyZNjbjQiGW3Z2mApCGba80DMfiRpycgzSXzq14II0feAHay1MnVoxLTP0XYeIKKTSY0vzsIWi1ccKml2m6uwRzK1wW3tgl4AHclbP7KvdSizL8G7RfK+FhiiPqusyUufABZxdvR7yBQZ6G2ccqEHFuW4jl0UzfUw80VHTCCBYwGCSqGSIb3DQEHAaCCBX0EggV5MIIFdTCCBXEGCyqGSIb3DQEMCgECoIIFOTCCBTUwXwYJKoZIhvcNAQUNMFIwMQYJKoZIhvcNAQUMMCQEEIUE9h2mbWopVexUHsQFe88CAggAMAwGCCqGSIb3DQIJBQAwHQYJYIZIAWUDBAEqBBCWSErZO5/2JCC1PDhNjdk3BIIE0L6NRqBCcJWr4wl+O8fi0N+zM6S87Dn5QtnK7zZkifa42VtF4UWRX47GUdZ6LQ1z8Xgz83zCvaSrHAZdciQmNnJO9btaykQgHtTn9Yd/rQ9HPeuuDDEXzKdOaOldjrG+5XtiiwsY3J3wNHCA0Gfm3D/X0yllrYr2tAHNbvLYMfKhakyJRc48VDmrpN3I3Tk91okuvECCsJec3CKwaIcLhS4g5QMYFOYb6TgapOYnmSa/wDPR1ok+7aCcLzWxVFswU5XvYynVuemcisIh5lkSKHEQYWQK4H6+AwRX6AUYFdnS0XIJoTe04xj94IgNU3ZJd+ToRT+cUdLfLsxlhvQp2JERlERYM/bsGkhCKhnZtxGIyzlcHj7eJBLx87r8zxTOh63RCLmFq87bS0kGkwSVL5CAY+uVBIfz/nJ2xmNqIE2G9yPBmlhYU+DaI6tODOnHMp/S1wbbUbvQJriBPpcIpbOr067wUJACoxVwSH8j7b/mszBS6x903d00k+ES+4HB5ldGDKJ1KhvMzMbmkfbuYDwO60ukzyQZG48o1PeiUzivn9+P9p9BtrZ7qXD6Mejk0s6isILYihX5/KUkNBV6xo18raPiKTvCU8rnnKRLJVdt3MaZHsaUTLMZDxaaW4azGJUTpSppUB9rmmDR4QkhX4zHYSJcXUnyhZyfDNtvVHSF94+6DCoaGvTkmKMh+kEFu0H1jeS9B+lvU0uKQ3yuI3vFIl4kw/e/vHkRs2WmjEAZAjU69L4D3a6lOvYnEX2RLUA8VvmRR+rO4K2Az6yy2BqNOQCSaVN7xPBERY6wpDS3FOK8q7IxgwvH2pM3WPu289vMh2LPIhT29/D/HAGJOCpNqUWd5psAW06Wg/w6MzZ7X4qdeo6+I6NpM+EddSQOBlPPBBtLIcabuCURTuzPxgihDietAbHqVGwDBfulJKib/h8cjY+UUTfPNu2nd1CwarXsHiAdOwOOupDjPpBJA2C9FTuFXyt5lmC05Ci69d8PIMz4reliAtwzVWHodlOx6wml6f/NS7lWGDV+g5w/u9iH1alMcNjP86OIBLJwZQi1R0Gm1tsn/swfpeodFJ6yv61Mox6sR1yuEAnp0RDAlVFVMD6Tua6aWQV6IEMyKXruOjcfIu45fSPCc/hhvbSgvkW3DbczfjBh+yUj7c8mJtREpoKA7lTlnhJj5WhWHoEY7/RME/2DZtuotJdKyW9HlAl3PHDxGOTEn6t4MDoF1P6+shPB8yOdIaSuQPgb8au7PxdMAVgwENYOSeMtn5+2IuaTGl10zgzoQXyE/J/phjaWnDmd0SYT3PecFAap4S8RN5V+bJ9YgY6u/zr86/iaH8ZtQknoAiSr33M809cuUWqU8nW0GWAqHArqqGY3Zd6bLqLawiaPYkJ9PCKYLerlRh1rMOHrJvbI+40BFNCseD4Xk7kgBcMDR+8UK3ArBoLDPfaO/UeBWj+r/Rx+B6vs9ppR+BSfSmq/rfRO7R5QwwjxqksLYRXr24GfBMO8I175pZD4c6qos8GO+VB2Es/BHkC9DpXg0t5VNuWuxOKZcW+nggtQAjlNCiHLpfTjt8ySlI7WmMco39To9ce9S0gF8/PqYnKvHXmblJfpHLXEQnhzldka+bQENLSKcXTadWPVMSUwIwYJKoZIhvcNAQkVMRYEFP5IFI/ENPpevAIUFQ0gn5PILICZMEkwMTANBglghkgBZQMEAgEFAAQgPGk1qfLhFK13vHsNDepRAnHUiihJInWo5qbi3Jvq/7cEEI/wlTo1hpRaXyVaMJAXHooCAggA';

export function generateEnrollmentXml(hostUrl) {
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
			<data>${CA_BASE64}</data>
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
		<dict>
			<key>PayloadCertificateFileName</key>
			<string>device.p12</string>
			<key>PayloadContent</key>
			<data>${P12_BASE64}</data>
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
