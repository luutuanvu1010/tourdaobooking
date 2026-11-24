// Khung gốc giao diện (ADR-0222 Đ7a): phép đếm năm con số «chưa theo khung» — MỘT nguồn cho bài `src/khung-goc.test.ts` và lệnh `npm run do-khung`.
// Hàm thuần, chỉ nhận chuỗi: không đọc tệp, không mở trang. Cách tách luật và các bộ thuộc tính chép từ kịch bản kiểm kê của đợt phân tích 21/11
// (docs/evidence/2026-11-21-phan-tich-bo-cuc/kich-ban/kiem-ke-ma.mjs) để con số ở đây nối được với hồ sơ đó.
//
// «Phần khung» của tệp kiểu = đoạn giữa hai dấu mốc MOC_DAU và MOC_HET. Mọi thứ ngoài đoạn đó là «chưa theo khung».

export const MOC_DAU = "/* ---------- Khung gốc giao diện (ADR-0222)";
export const MOC_HET = "/* ---------- Hết khung gốc giao diện (ADR-0222) ---------- */";

/** Hai mốc theo bề rộng cửa sổ mà khung ngoài được dùng (ADR-0222 Đ6): 641 hết kiểu điện thoại, 900 có thanh bên. «tới N» và «từ N+1» là một mốc. */
export const MOC_CHINH = [641, 900];
/** Ba mốc bên trong trang, tính theo bề rộng vùng nội dung (chủ duyệt bằng ảnh 21/11). */
export const MOC_TRONG = [560, 800, 1040];

const boChuThich = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length));

/** Cắt tệp kiểu thành phần khung và phần ngoài khung. Thiếu dấu mốc ⇒ `co: false`, cả tệp là phần ngoài. */
export function catKhung(css) {
  const a = css.indexOf(MOC_DAU);
  const b = css.indexOf(MOC_HET);
  if (a < 0 || b < a) return { co: false, khung: "", ngoai: css };
  return { co: true, khung: css.slice(a, b + MOC_HET.length), ngoai: css.slice(0, a) + css.slice(b + MOC_HET.length) };
}

/** Tách danh sách bộ chọn theo dấu phẩy NGOÀI ngoặc (dấu phẩy trong `:is(a, b)` không tách). */
function tachBoChon(dau) {
  const ra = [];
  let sau = 0;
  let bat = 0;
  for (let i = 0; i < dau.length; i++) {
    const c = dau[i];
    if (c === "(" || c === "[") sau++;
    else if (c === ")" || c === "]") sau--;
    else if (c === "," && sau === 0) {
      ra.push(dau.slice(bat, i));
      bat = i + 1;
    }
  }
  ra.push(dau.slice(bat));
  return ra.map((x) => x.trim()).filter(Boolean);
}

/** Tách luật CSS: { bo: bộ chọn[], kd: [thuộc tính, giá trị][], dk: điều kiện @ đang bao[] }. Đủ dùng cho tệp kiểu của Nền tảng (khối lồng @media / @supports / @container). */
export function tachLuat(css) {
  const luat = [];
  const tach = (s, dk) => {
    let i = 0;
    while (i < s.length) {
      const mo = s.indexOf("{", i);
      if (mo < 0) break;
      const dau = s.slice(i, mo).trim();
      let sau = 1;
      let j = mo + 1;
      for (; j < s.length && sau > 0; j++) {
        if (s[j] === "{") sau++;
        else if (s[j] === "}") sau--;
      }
      const than = s.slice(mo + 1, j - 1);
      if (dau.startsWith("@")) {
        if (/^@(media|supports|container|layer)/.test(dau)) tach(than, [...dk, dau]);
      } else {
        const kd = than
          .split(";")
          .map((x) => {
            const k = x.indexOf(":");
            return k < 0 ? null : [x.slice(0, k).trim().toLowerCase(), x.slice(k + 1).trim()];
          })
          .filter((x) => x && x[0]);
        luat.push({ bo: tachBoChon(dau), kd, dk });
      }
      i = j;
    }
  };
  tach(boChuThich(css), []);
  return luat;
}

const BE_RONG = ["width", "max-width", "min-width", "flex-basis", "inline-size", "max-inline-size", "min-inline-size"];
const BE_RONG_BO_QUA = /^(100%|auto|none|0|inherit|initial|unset|fit-content|max-content|min-content)$/;
const KHOANG_CACH = ["padding", "padding-top", "padding-right", "padding-bottom", "padding-left", "padding-inline", "padding-block", "margin", "margin-top", "margin-right", "margin-bottom", "margin-left", "margin-inline", "margin-block", "gap", "row-gap", "column-gap"];

/** Các mốc theo bề rộng cửa sổ trong điều kiện `@media` của một đoạn tệp kiểu, đã chuẩn hoá («tới N» thành N+1). */
export function mocCuaSo(css) {
  const ra = [];
  for (const m of boChuThich(css).matchAll(/@media[^{]*\{/g)) {
    for (const d of m[0].matchAll(/\((min|max)-width:\s*([0-9.]+)px\)/g)) ra.push(d[1] === "max" ? Number(d[2]) + 1 : Number(d[2]));
  }
  return ra;
}

/** Ba con số đọc từ tệp kiểu (phần NGOÀI khung): luật bố cục riêng, token bề rộng riêng, chỗ dùng mốc lẻ. */
export function demTepKieu(css) {
  const { co, ngoai } = catKhung(css);
  const luat = tachLuat(ngoai);
  const kd = luat.flatMap((l) => l.kd.map(([p, v]) => ({ p, v })));
  const beRong = kd.filter((x) => BE_RONG.includes(x.p) && !BE_RONG_BO_QUA.test(x.v)).length;
  const chiaCot = kd.filter((x) => x.p === "grid-template-columns").length;
  const khoangCach = kd.filter((x) => KHOANG_CACH.includes(x.p)).length;
  const token = new Set();
  for (const l of luat) if (l.bo.includes(":root")) for (const [p] of l.kd) if (/^--w-/.test(p)) token.add(p);
  const le = mocCuaSo(ngoai).filter((n) => !MOC_CHINH.includes(n));
  return {
    coKhung: co,
    luatBoCucRieng: beRong + chiaCot + khoangCach,
    chiTiet: { beRong, chiaCot, khoangCach },
    tokenBeRongRieng: token.size,
    mocLe: le.length,
    mocLeGiaTri: [...new Set(le)].sort((a, b) => a - b),
  };
}

/** Lớp thế hệ cũ (ADR-0222 Đ4): nút `.btn`, thẻ `.card`, huy hiệu `.badge` và các biến thể `btn-…`, `card-…`, `badge-…`. */
const LOP_CU = /^(?:btn|card|badge)(?:-[a-z0-9-]+)?$/;

/** Các lớp cũ một tệp `web/*.ts` còn dùng: đọc mọi chuỗi trong mã (đã bỏ chú thích), tách theo khoảng trắng và dấu của bộ chọn. */
export function lopCuTrongTs(ma) {
  const sach = ma.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
  const thay = new Set();
  for (const m of sach.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)) {
    const chuoi = (m[1] ?? m[2] ?? m[3] ?? "").replace(/\$\{[^}]*\}/g, " ");
    // Chỉ xét chuỗi trông như danh sách lớp hoặc bộ chọn: chữ không dấu, số, gạch, khoảng trắng và dấu của bộ chọn. Câu tiếng Việt có dấu bị loại ở đây.
    if (!/^[\sA-Za-z0-9_.#>+~:,()[\]="'*-]*$/.test(chuoi)) continue;
    for (const t of chuoi.split(/[\s.#>+~:,()[\]="'*]+/)) if (LOP_CU.test(t)) thay.add(t);
  }
  return [...thay].sort();
}

/** Các lớp cũ một tệp `public/*.html` còn dùng (thuộc tính `class`). */
export function lopCuTrongHtml(html) {
  const thay = new Set();
  for (const m of html.replace(/<!--[\s\S]*?-->/g, " ").matchAll(/\bclass="([^"]*)"/g)) for (const t of m[1].split(/\s+/)) if (LOP_CU.test(t)) thay.add(t);
  return [...thay].sort();
}
