// Phép đếm ngôn ngữ thị giác trên tệp kiểu (ADR-0234 Đ5a). Một nguồn cho bài `src/ngon-ngu-thi-giac.test.ts` và lệnh `npm run do-khung -- --dem`.
// Chỉ đọc chữ trong tệp: đếm GIÁ TRỊ viết thẳng (không phải var()) của màu, cỡ chữ, bo góc, bóng. Thứ trình duyệt thật vẽ ra do lệnh đo trên trang (Đ5b) kiểm.
import { tachLuat } from "./dem-khung-goc.mjs";

// Màu: mã hex, hàm màu, và tên màu CSS hay gặp (soát độc lập 24/11: «white», «oklch()» từng lọt). Không tính transparent, currentColor.
const MAU = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^)]*\)|\b(?:white|black|red|green|blue|gray|grey|silver|orange|yellow|purple|pink|navy|teal|maroon|olive|lime|aqua|fuchsia|gold|brown|tomato|crimson)\b/gi;
const DO_DAI = /-?\d*\.?\d+(?:px|rem|em|%)/g;
const chuan = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
/** Bỏ tên biến (--c-green-text…) trước khi dò màu, để chữ trong tên token không bị đọc là tên màu. */
const boTenBien = (v) => v.replace(/--[\w-]+/g, "");
const laRoot = (bo) => bo.length > 0 && bo.every((b) => b === ":root");
/** Giá trị chỉ gồm var(), từ khoá, phép tính trên var() — không có số đo hay màu viết thẳng. */
const MAU_1 = new RegExp(MAU.source, "i");
const chiThamChieu = (v) => !MAU_1.test(boTenBien(v)) && !/\d/.test(v.replace(/var\(--[\w-]+\)/g, "")); // giá trị dự phòng trong var(--x, …) VẪN tính là viết thẳng

/** Các con số của tệp kiểu: mỗi con số có trần ở bài kiểm, trần chỉ được hạ. */
export function demThiGiac(css) {
  const luat = tachLuat(css);
  const mauToken = new Set(), mauNgoai = [], coChu = new Set(), boGoc = new Set(), bong = new Set(), thang = new Map();
  let colorMix = 0;
  for (const l of luat) {
    const root = laRoot(l.bo);
    for (const [p, v0] of l.kd) {
      const v = chuan(v0);
      if (v.includes("color-mix(")) colorMix++;
      MAU.lastIndex = 0;
      const mau = boTenBien(v).match(MAU) ?? [];
      if (root && p.startsWith("--")) for (const m of mau) mauToken.add(m.replace(/\s/g, ""));
      if (!root) for (const m of mau) mauNgoai.push(`${l.bo.join(", ")} { ${p}: ${m} }`);
      const laCo = (root && /^--fs-/.test(p)) || p === "font-size" || p === "font"; // «font: 15px/1.2 …» viết gọn cũng tính
      if (laCo) for (const d of v.match(DO_DAI) ?? []) coChu.add(d);
      if (root && /^--fs-step-\d+$/.test(p)) thang.set(p, v);
      const laBo = (root && /^--(radius|bo)-/.test(p)) || /^border(-[a-z]+)*-radius$/.test(p);
      if (laBo) for (const d of v.match(DO_DAI) ?? []) boGoc.add(d);
      const laBong = (root && /^--(shadow|ring)-/.test(p)) || p === "box-shadow" || p === "text-shadow";
      if (laBong && v !== "none" && !chiThamChieu(v)) bong.add(v);
      if (/^(-webkit-)?(filter|backdrop-filter)$/.test(p) && v.includes("drop-shadow(")) bong.add(v);
    }
  }
  return { mauToken: mauToken.size, mauNgoaiRoot: mauNgoai.length, mauNgoaiMau: mauNgoai, coChu: coChu.size, coChuGiaTri: [...coChu].sort(), boGoc: boGoc.size, boGocGiaTri: [...boGoc].sort(), bong: bong.size, colorMix, thangChu: Object.fromEntries(thang) };
}
