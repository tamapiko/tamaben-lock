// Lightweight Apple plist parser & serializer (Zero-dependency)

export function parsePlist(xmlString) {
  const result = {};
  if (!xmlString || typeof xmlString !== 'string') return result;

  // 簡易キー/値抽出（Apple MDMの主要プロトコルメッセージ用）
  const dictMatch = xmlString.match(/<dict>([\s\S]*?)<\/dict>/);
  if (!dictMatch) return result;

  const content = dictMatch[1];
  const regex = /<key>([^<]+)<\/key>\s*<(string|data|integer|true|false)(?:>([^<]*)<\/\2>|\/>)/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    const type = match[2];
    const val = match[3];

    if (type === 'string' || type === 'data') {
      result[key] = val || '';
    } else if (type === 'integer') {
      result[key] = parseInt(val, 10);
    } else if (type === 'true') {
      result[key] = true;
    } else if (type === 'false') {
      result[key] = false;
    }
  }

  return result;
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
