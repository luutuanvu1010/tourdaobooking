// Che chuỗi và chú thích trong mã TypeScript bằng KHOẢNG TRẮNG CÙNG ĐỘ DÀI (giữ nguyên ký tự xuống dòng) để các bài kiểm tĩnh
// (src/permission-enforcement.test.ts, src/route-write-guard.test.ts) đếm ngoặc và tìm định danh mà không bị chữ trong
// chuỗi hay chú thích đánh lừa. Vị trí ký tự KHÔNG đổi, nên chỉ số tìm được trên bản che dùng thẳng cho bản gốc.
//
// Không phải trình phân tích cú pháp đầy đủ — đủ cho mã của repo này: chuỗi '…' và "…", khuôn mẫu `…` có ${…} lồng nhau,
// chú thích // và /* … */. Regex literal KHÔNG được xử lý: một regex chứa "//" hoặc "/*" sẽ bị hiểu nhầm là chú thích
// (mã route hiện không có; nếu có, bài kiểm sẽ đỏ vì đếm ngoặc lệch, không im lặng cho qua).
//
// Tệp .mjs đặt ở scripts/ theo tiền lệ scripts/data-dictionary-lib.mjs (được src/architecture.test.ts import): tsc quét
// mọi tệp .ts trong src/ trừ *.test.ts, nên một tệp trợ giúp .ts cho test không có chỗ đứng trong src/.

/**
 * @param {string} src mã nguồn
 * @param {{ strings?: boolean, comments?: boolean }} [opts] che chuỗi (mặc định có), che chú thích (mặc định có)
 * @returns {string} bản che, cùng độ dài với `src`
 */
export function maskSource(src, opts = {}) {
  const strings = opts.strings ?? true;
  const comments = opts.comments ?? true;
  const out = src.split("");
  const n = src.length;
  const blank = (from, to) => {
    for (let k = from; k < to; k++) if (out[k] !== "\n") out[k] = " ";
  };

  /** Quét mã từ `i`; nếu `stopAtBrace`, dừng NGAY SAU dấu `}` khép ${…} của khuôn mẫu đang mở. Trả chỉ số tiếp theo. */
  function scanCode(i, stopAtBrace) {
    let depth = 0;
    while (i < n) {
      const c = src[i];
      const d = src[i + 1];
      if (c === "/" && d === "/") {
        const e = src.indexOf("\n", i);
        const end = e === -1 ? n : e;
        if (comments) blank(i, end);
        i = end;
        continue;
      }
      if (c === "/" && d === "*") {
        const e = src.indexOf("*/", i + 2);
        const end = e === -1 ? n : e + 2;
        if (comments) blank(i, end);
        i = end;
        continue;
      }
      if (c === '"' || c === "'") {
        let k = i + 1;
        while (k < n && src[k] !== c && src[k] !== "\n") {
          if (src[k] === "\\") k++;
          k++;
        }
        if (strings) blank(i + 1, Math.min(k, n));
        i = Math.min(k + 1, n);
        continue;
      }
      if (c === "`") {
        i = scanTemplate(i + 1);
        continue;
      }
      if (c === "{") depth++;
      else if (c === "}") {
        if (stopAtBrace && depth === 0) return i + 1;
        depth--;
      }
      i++;
    }
    return n;
  }

  /** Quét thân khuôn mẫu từ sau dấu ` mở; văn bản bị che, phần ${…} là mã (quét bằng scanCode). Trả chỉ số sau dấu ` đóng. */
  function scanTemplate(i) {
    while (i < n) {
      const c = src[i];
      if (c === "\\") {
        if (strings) blank(i, Math.min(i + 2, n));
        i += 2;
        continue;
      }
      if (c === "`") return i + 1;
      if (c === "$" && src[i + 1] === "{") {
        i = scanCode(i + 2, true);
        continue;
      }
      if (strings) blank(i, i + 1);
      i++;
    }
    return n;
  }

  scanCode(0, false);
  return out.join("");
}
