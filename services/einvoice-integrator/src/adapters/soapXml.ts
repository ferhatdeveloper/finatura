/** Ortak SOAP/XML yardımcıları — sağlayıcı SOAP iskeletleri paylaşır */

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function extractXmlTag(xml: string, tag: string): string | undefined {
  const re = new RegExp(
    `<(?:[\\w-]+:)?${tag}[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`,
    'i',
  );
  const m = xml.match(re);
  return m?.[1]?.trim();
}

export function extractXmlAttr(
  xml: string,
  tag: string,
  attr: string,
): string | undefined {
  const re = new RegExp(
    `<(?:[\\w-]+:)?${tag}\\b[^>]*\\b${attr}="([^"]*)"`,
    'i',
  );
  const m = xml.match(re);
  return m?.[1]?.trim();
}

export function isSoapFault(xml: string): boolean {
  return /Fault/i.test(xml) && /faultstring|FaultString|ERROR_CODE|ERROR_SHORT_DES/i.test(xml);
}

export function soapFaultMessage(xml: string, fallback = 'SOAP Fault'): string {
  return (
    extractXmlTag(xml, 'faultstring') ||
    extractXmlTag(xml, 'FaultString') ||
    extractXmlTag(xml, 'ERROR_SHORT_DES') ||
    extractXmlTag(xml, 'ERROR_LONG_DES') ||
    extractXmlTag(xml, 'Message') ||
    fallback
  );
}

export function ublToBase64(ublXml: string): string {
  return Buffer.from(ublXml, 'utf8').toString('base64');
}

/**
 * Tek dosyalı minimal ZIP (FIT DocData vb. için).
 * Harici zip kütüphanesi yok; yalnızca store (sıkıştırmasız) yöntemi.
 */
export function zipSingleFileBase64(fileName: string, content: string): string {
  const nameBuf = Buffer.from(fileName, 'utf8');
  const data = Buffer.from(content, 'utf8');
  const crc = crc32(data);

  const local = Buffer.alloc(30 + nameBuf.length);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0, 6);
  local.writeUInt16LE(0, 8);
  local.writeUInt16LE(0, 10);
  local.writeUInt16LE(0, 12);
  local.writeUInt32LE(crc >>> 0, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28);
  nameBuf.copy(local, 30);

  const central = Buffer.alloc(46 + nameBuf.length);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0, 14);
  central.writeUInt32LE(crc >>> 0, 16);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt16LE(0, 30);
  central.writeUInt16LE(0, 32);
  central.writeUInt16LE(0, 34);
  central.writeUInt16LE(0, 36);
  central.writeUInt32LE(0, 38);
  central.writeUInt32LE(0, 42);
  nameBuf.copy(central, 46);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(local.length + data.length, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([local, data, central, end]).toString('base64');
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}
