// Authenticator GIẢ cho test (đơn vị + e2e): sinh đúng định dạng WebAuthn mà iPhone/Chrome gửi, bằng Web Crypto của Node. KHÔNG dùng ở mã chạy thật.
const enc = new TextEncoder();

/** Bộ mã hoá CBOR tối thiểu (số nguyên, chuỗi, byte, mảng, map, true/false/null) — đủ cho attestationObject và khoá COSE. */
export function cborEncode(value) {
  const out = [];
  const head = (major, n) => {
    if (n < 24) out.push((major << 5) | n);
    else if (n < 0x100) out.push((major << 5) | 24, n);
    else if (n < 0x10000) out.push((major << 5) | 25, n >> 8, n & 0xff);
    else out.push((major << 5) | 26, (n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff);
  };
  const put = (v) => {
    if (typeof v === "number") {
      if (!Number.isInteger(v)) throw new Error("cborEncode: chỉ số nguyên");
      v >= 0 ? head(0, v) : head(1, -1 - v);
    } else if (typeof v === "string") { const b = enc.encode(v); head(3, b.length); out.push(...b); }
    else if (v instanceof Uint8Array) { head(2, v.length); out.push(...v); }
    else if (Array.isArray(v)) { head(4, v.length); v.forEach(put); }
    else if (v instanceof Map) { head(5, v.size); for (const [k, x] of v) { put(k); put(x); } }
    else if (v === false) out.push(0xf4);
    else if (v === true) out.push(0xf5);
    else if (v === null) out.push(0xf6);
    else throw new Error("cborEncode: kiểu không hỗ trợ");
  };
  put(value);
  return Uint8Array.from(out);
}
