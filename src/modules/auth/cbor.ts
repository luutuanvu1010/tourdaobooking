// Bộ giải CBOR (RFC 8949) TỐI THIỂU cho WebAuthn: attestationObject và khoá COSE. Thuần, không phụ thuộc.
// Chỉ nhận: số nguyên (tới 2^53), chuỗi byte, chuỗi UTF-8, mảng, map (khoá số/chuỗi, không trùng), false/true/null.
// Từ chối: độ dài không xác định, tag, số thực, simple khác, lồng quá 8 tầng, khai độ dài vượt dữ liệu có thật.
export type CborValue = number | string | boolean | null | Uint8Array | CborValue[] | Map<number | string, CborValue>;

export class CborError extends Error {}

const MAX_DEPTH = 8;

export function decodeCbor(bytes: Uint8Array, offset = 0): { value: CborValue; end: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
  let pos = offset;
  const need = (n: number) => {
    if (n < 0 || pos + n > bytes.length) throw new CborError("CBOR bị cụt");
  };
  const readLength = (info: number): number => {
    if (info < 24) return info;
    if (info === 24) { need(1); return bytes[pos++]!; }
    if (info === 25) { need(2); const v = view.getUint16(pos); pos += 2; return v; }
    if (info === 26) { need(4); const v = view.getUint32(pos); pos += 4; return v; }
    if (info === 27) {
      need(8);
      const hi = view.getUint32(pos), lo = view.getUint32(pos + 4);
      pos += 8;
      if (hi > 0x1fffff) throw new CborError("Số CBOR quá lớn");
      return hi * 2 ** 32 + lo;
    }
    throw new CborError("CBOR độ dài không xác định không được hỗ trợ");
  };
  const item = (depth: number): CborValue => {
    if (depth > MAX_DEPTH) throw new CborError("CBOR lồng quá sâu");
    need(1);
    const first = bytes[pos++]!;
    const major = first >> 5, info = first & 0x1f;
    switch (major) {
      case 0: return readLength(info);
      case 1: return -1 - readLength(info);
      case 2: { const n = readLength(info); need(n); const v = bytes.slice(pos, pos + n); pos += n; return v; }
      case 3: {
        const n = readLength(info);
        need(n);
        let v: string;
        try { v = utf8.decode(bytes.subarray(pos, pos + n)); } catch { throw new CborError("UTF-8 hỏng"); }
        pos += n;
        return v;
      }
      case 4: {
        const n = readLength(info);
        need(n); // mỗi phần tử ≥ 1 byte: khai nhiều hơn số byte còn lại là giả
        const arr: CborValue[] = [];
        for (let i = 0; i < n; i++) arr.push(item(depth + 1));
        return arr;
      }
      case 5: {
        const n = readLength(info);
        need(n * 2);
        const map = new Map<number | string, CborValue>();
        for (let i = 0; i < n; i++) {
          const k = item(depth + 1);
          if (typeof k !== "number" && typeof k !== "string") throw new CborError("Khoá map CBOR phải là số hoặc chuỗi");
          if (map.has(k)) throw new CborError("Khoá map CBOR bị trùng");
          map.set(k, item(depth + 1));
        }
        return map;
      }
      case 7:
        if (info === 20) return false;
        if (info === 21) return true;
        if (info === 22) return null;
        throw new CborError("Kiểu CBOR không hỗ trợ");
      default:
        throw new CborError("Kiểu CBOR không hỗ trợ");
    }
  };
  const value = item(0);
  return { value, end: pos };
}
