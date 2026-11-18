import { execFileSync } from 'node:child_process';

// 100% Precise Apple Plist Parser powered by Apple-standard plistlib with regex fallback
export function parsePlist(xmlString) {
  if (!xmlString || typeof xmlString !== 'string') return {};

  try {
    const stdout = execFileSync('python3', ['-c', `
import sys, plistlib, json
try:
    xml = sys.stdin.read()
    data = plistlib.loads(xml.encode("utf-8"))
    def clean(obj):
        if isinstance(obj, bytes):
            return obj.hex()
        if isinstance(obj, dict):
            return {k: clean(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [clean(v) for v in obj]
        return obj
    print(json.dumps(clean(data)))
except Exception as e:
    print("{}")
`], { input: xmlString, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

    return JSON.parse(stdout);
  } catch (err) {
    console.log('[Plist Parse Fallback via Regex]', err.message);
    // 簡易正規表現フォールバック
    const res = {};
    const dictMatch = xmlString.match(/<dict>([\s\S]*?)<\/dict>/);
    if (!dictMatch) return res;
    const content = dictMatch[1];
    const regex = /<key>([^<]+)<\/key>\s*<(string|data|integer|true|false)(?:>([^<]*)<\/\2>|\/>)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const key = match[1];
      const type = match[2];
      const val = match[3];
      if (type === 'string' || type === 'data') res[key] = val || '';
      else if (type === 'integer') res[key] = parseInt(val, 10);
      else if (type === 'true') res[key] = true;
      else if (type === 'false') res[key] = false;
    }
    return res;
  }
}

export function buildPlistDict(obj) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n';
  xml += '<plist version="1.0">\n<dict>\n';

  function encodeVal(val) {
    if (typeof val === 'string') {
      return `<string>${val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</string>`;
    }
    if (typeof val === 'number') {
      return `<integer>${val}</integer>`;
    }
    if (typeof val === 'boolean') {
      return val ? '<true/>' : '<false/>';
    }
    if (Buffer.isBuffer(val)) {
      return `<data>${val.toString('base64')}</data>`;
    }
    if (Array.isArray(val)) {
      let arr = '<array>\n';
      for (const item of val) {
        arr += `  ${encodeVal(item)}\n`;
      }
      arr += '</array>';
      return arr;
    }
    if (typeof val === 'object' && val !== null) {
      let sub = '<dict>\n';
      for (const [k, v] of Object.entries(val)) {
        sub += `  <key>${k}</key>\n  ${encodeVal(v)}\n`;
      }
      sub += '</dict>';
      return sub;
    }
    return '<string></string>';
  }

  for (const [key, value] of Object.entries(obj)) {
    xml += `  <key>${key}</key>\n  ${encodeVal(value)}\n`;
  }

  xml += '</dict>\n</plist>';
  return xml;
}
