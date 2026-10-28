// Luật thuần của việc đóng gói mã cho trợ lý chạy trên máy chủ Anthropic (ADR-0145 Đ3). Bài kiểm: src/goi-ma-tro-ly-may.test.ts.
// Tệp .mjs đặt ở scripts/ theo tiền lệ scripts/source-mask-lib.mjs (kịch bản .mjs và bài kiểm .ts cùng import được).

/** Thư mục được gửi (mọi tệp bên trong) và tệp lẻ được gửi. Ngoài hai danh sách này: không gửi.
 *  `tests/audit/` là khung thử D1 dùng chung mà bài kiểm trong src/ nhập; `tests/e2e/` (gọi API thật) không gửi. */
const THU_MUC_DUOC_GUI = ["src/", "web/", "migrations/", "tests/audit/"];
const TEP_DUOC_GUI = new Set([
  "package.json",
  "tsconfig.json",
  "CLAUDE.md",
  "docs/ARCHITECTURE.md",
  "docs/data-dictionary.json",
  // thư viện thuần mà nhiều bài kiểm trong src/ nhập (audit-checks nhập audit-thuong-mai)
  "scripts/source-mask-lib.mjs",
  "scripts/audit-checks.mjs",
  "scripts/audit-thuong-mai.mjs",
]);

/** Tệp bí mật cục bộ: không bao giờ gửi, dù nằm trong thư mục được gửi. */
const TEP_BI_MAT = /(^|\/)(\.dev\.vars|\.env)([./].*)?$/;

/** @param {string} p đường dẫn tương đối từ gốc kho, dấu `/` */
export function duocGui(p) {
  if (TEP_BI_MAT.test(p)) return false;
  return TEP_DUOC_GUI.has(p) || THU_MUC_DUOC_GUI.some((d) => p.startsWith(d));
}

// Số điện thoại Việt Nam: 0, 84, +84 hay (+84), rồi số di động (9 chữ số bắt đầu 3/5/7/8/9) hoặc số bàn (mã vùng bắt đầu 2,
// 9 hay 10 chữ số: "(0258) 3812 345"); giữa hai chữ số được có tới 3 ký tự cách, chấm, gạch, ngoặc ("0987 654 321",
// "0987.654.321", "(098) 7654-321", "+84 987 654 321", "84987654321"). Không dính vào dãy số dài hơn, và không dính chữ cái
// hay gạch dưới (để không đụng mã băm, mã nhận dạng); dãy nằm trong một UUID cũng bỏ qua.
const SDT =
  /(?<![0-9A-Za-z_+])(\(?(?:\+ ?)?84\)?[ .\-]?|\(?0)([35789](?:[ .\-()]{0,3}[0-9]){8}|2(?:[ .\-()]{0,3}[0-9]){8,9})(?![0-9A-Za-z_])/g;
// Bộ tự quét sau khi che: rộng hơn bộ che (thêm tab, cách không ngắt, gạch dưới làm dấu phân cách). Mọi chuỗi nó bắt phải là số giả.
// Không gồm dấu "/" để ngày tháng ("08 28/10/2026") không bị nhận nhầm.
const SDT_RONG =
  /(?<![0-9A-Za-z_])(\(?(?:\+[ \t\u00a0]?)?84\)?[ .\-()\t\u00a0_]{0,3}|\(?0)([35789](?:[ .\-()\t\u00a0_]{0,3}[0-9]){8}|2(?:[ .\-()\t\u00a0_]{0,3}[0-9]){8,9})(?![0-9A-Za-z_])/g;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
// Email; phần trước @ được thay, miền giữ nguyên. Miền example.* là miền thử theo chuẩn, để nguyên.
const EMAIL = /(?<![A-Za-z0-9._%+-])([A-Za-z0-9._%+-]+)@((?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,})(?![A-Za-z0-9-])/g;
const MIEN_THU = /(^|\.)example\.(com|org|net)$/i;

const chinSo = (than) => than.replace(/[^0-9]/g, "");
/** Đoạn [đầu, cuối) của các UUID trong văn bản. */
const doanUuid = (t) => [...t.matchAll(UUID)].map((u) => [u.index, u.index + u[0].length]);
const trongDoan = (doan, tu, den) => doan.some(([a, b]) => tu < b && a < den);

/** Bỏ dấu tiếng Việt ("Lưu Tuấn Vũ" → "Luu Tuan Vu"), để thay được cả bản viết không dấu. */
export function boDau(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}
const thoat = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Dựng bộ che từ TOÀN BỘ văn bản sẽ gửi, để số giả không bao giờ trùng một số gốc ở bất kỳ tệp nào.
 * Cùng một số (viết liền hay có dấu phân cách, dạng 0… hay +84…) luôn ra cùng số giả, giữ hai chữ số đầu sau mã nước
 * (đầu số nhà mạng; số bàn giữ ba chữ số = mã vùng), độ dài và cách viết; cùng một email (không phân biệt hoa thường)
 * luôn ra cùng tên giả.
 * `thayChuoi`: cặp [chuỗi gốc, chuỗi thay] thay thêm (tên chủ, đường dẫn tài khoản máy), cả bản bỏ dấu, không phân biệt hoa thường.
 * @param {string[]} vanBan
 * @param {{ thayChuoi?: [string, string][] }} [tuyChon]
 */
export function taoBoChe(vanBan, tuyChon = {}) {
  const thay = [];
  for (const [tu, sang] of tuyChon.thayChuoi ?? []) {
    if (!tu) continue;
    for (const dang of new Set([tu, boDau(tu)])) thay.push([new RegExp(thoat(dang), "giu"), sang]);
  }
  const goc = new Set();
  for (const t of vanBan) {
    const uuid = doanUuid(t);
    for (const m of t.matchAll(SDT)) if (!trongDoan(uuid, m.index, m.index + m[0].length)) goc.add(chinSo(m[2]));
  }
  const soGia = new Map();
  const daDung = new Set();
  let dem = 0;
  const giaChoSo = (so) => {
    let g = soGia.get(so);
    if (g) return g;
    const giu = so[0] === "2" ? 3 : 2;
    do g = so.slice(0, giu) + String(++dem).padStart(so.length - giu, "0");
    while (goc.has(g) || daDung.has(g));
    daDung.add(g);
    soGia.set(so, g);
    return g;
  };
  const tenGia = new Map();
  const giaChoEmail = (khoa) => {
    let g = tenGia.get(khoa);
    if (!g) tenGia.set(khoa, (g = `nguoi${tenGia.size + 1}`));
    return g;
  };
  return {
    /** @param {string} t */
    che(t) {
      let soSdt = 0;
      let soEmail = 0;
      let soChuoi = 0;
      let text = t;
      for (const [re, sang] of thay)
        text = text.replace(re, () => {
          soChuoi++;
          return sang;
        });
      const uuid = doanUuid(text);
      text = text.replace(SDT, (all, dau, than, viTri) => {
        if (trongDoan(uuid, viTri, viTri + all.length)) return all;
        soSdt++;
        const gia = giaChoSo(chinSo(than));
        let k = 0;
        return dau + than.replace(/[0-9]/g, () => gia[k++]);
      });
      text = text.replace(EMAIL, (all, ten, mien) => {
        if (MIEN_THU.test(mien)) return all;
        soEmail++;
        return `${giaChoEmail(`${ten}@${mien}`.toLowerCase())}@${mien}`;
      });
      return { text, soSdt, soEmail, soChuoi };
    },
    /** Số dòng (từ 1) còn chuỗi giống số điện thoại mà không phải số giả — chạy trên văn bản ĐÃ che. */
    conSot(text) {
      const uuid = doanUuid(text);
      const dong = new Set();
      for (const m of text.matchAll(SDT_RONG)) {
        if (trongDoan(uuid, m.index, m.index + m[0].length) || daDung.has(chinSo(m[2]))) continue;
        dong.add(text.slice(0, m.index).split("\n").length);
      }
      return [...dong].sort((a, b) => a - b);
    },
  };
}

/** Chuỗi cấm đầu tiên còn trong văn bản (mã Sheet…), hoặc null. Bỏ qua chuỗi rỗng. */
export function timChuoiCam(text, chuoiCam) {
  return chuoiCam.find((c) => c && text.includes(c)) ?? null;
}
