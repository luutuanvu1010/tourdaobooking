// MỘT CHỖ XẾP LỚP VƯỢT LUẬT (ADR-0104 Đ1 mục 2, bài kiểm 3; kế hoạch NT-3). Bài quét TĨNH trên mã đã che chú thích (scripts/source-mask-lib.mjs):
//   (a) mỗi route trong bảy route nhận cờ vượt (tạo, sửa, xếp, thêm khi chạy, rút, dời, huỷ chuyến) có ĐÚNG MỘT biểu thức đổi lớp ra ô viết thẳng
//       `lop === "KHAN_CAP" ? can(staff, "trip.urgent_adjust") : can(staff, "trip.override")` — để hàng rào "mỗi ô phải được máy chủ hỏi"
//       (src/permission-enforcement.test.ts) đếm được cả hai ô;
//   (b) ngoài bảy dòng đó, KHÔNG tệp nào khác của src/modules/van-chuyen/ (trừ bài thử) viết chuỗi ô "trip.override" / "trip.urgent_adjust" — không route
//       nào tự hỏi ô vượt luật mà bỏ qua hàm lớp. NỚI CÓ TÊN N2 (ADR-0111 mục "Hàng rào nới"; docs/SO-HANG-RAO.md): ĐÚNG hai dòng
//       `if (!can(staff, "trip.override")) return CAN_DUYET_DE_NGHI();` — mỗi dòng ở thân route DUYỆT / BÁC đề nghị chuyển khách (không có "dưới mốc / ngoài
//       mốc" để xếp lớp: duyệt / bác luôn là ô vượt luật của Quản trị, Toàn quyền); không dòng nào trong đó có "trip.urgent_adjust". Bài bù: Bán hàng duyệt / bác
//       → 403 (chuyen-khach-route.test.ts NT-A5-11, -12);
//   (c) mọi lời gọi `quyenVuot(…)` (module van-chuyen + src/shared/moc-toi-thieu.ts) nhận đối số là lời gọi hàm lớp `lopVuotMoc(` / `lopVuotNghiCamKet(` /
//       `lopCuaLuat(` — không lớp viết tay; `lopCuaLuat` chỉ dựng từ hai hàm lớp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { maskSource } from "../../../scripts/source-mask-lib.mjs";

const DIR = fileURLToPath(new URL(".", import.meta.url));
const MOC = fileURLToPath(new URL("../../shared/moc-toi-thieu.ts", import.meta.url));
const BIEU_THUC = 'lop === "KHAN_CAP" ? can(staff, "trip.urgent_adjust") : can(staff, "trip.override")';
const BAY_ROUTE: [string, string][] = [
  ["POST", "/api/van-chuyen/chuyen"],
  ["PUT", "/api/van-chuyen/chuyen/:id"],
  ["POST", "/api/van-chuyen/chuyen/:id/phan-bo"],
  ["POST", "/api/van-chuyen/chuyen/:id/them-diem"],
  ["POST", "/api/van-chuyen/chuyen/:id/rut"],
  ["POST", "/api/van-chuyen/chuyen/:id/doi"],
  ["POST", "/api/van-chuyen/chuyen/:id/huy"],
];
const tepMa = readdirSync(DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
/** Mã đã che chú thích (giữ chuỗi). */
const khongChuThich = (p: string) => maskSource(readFileSync(p, "utf8"), { strings: false, comments: true });
const demChuoi = (s: string, x: string) => s.split(x).length - 1;

test("NT-3 (a): bảy route nhận cờ vượt — mỗi route đúng MỘT biểu thức đổi lớp ra ô viết thẳng", () => {
  const src = khongChuThich(join(DIR, "index.ts"));
  for (const [m, duong] of BAY_ROUTE) {
    const dau = src.indexOf(`route("${m}", "${duong}",`);
    assert.ok(dau >= 0, `tìm thấy route ${m} ${duong}`);
    const sau = src.indexOf("route(", dau + 10);
    const than = src.slice(dau, sau < 0 ? undefined : sau);
    assert.equal(demChuoi(than, BIEU_THUC), 1, `${m} ${duong}: cần đúng một biểu thức đổi lớp`);
  }
});

/** Nới N2 (ADR-0111): hai route duyệt / bác đề nghị chuyển khách hỏi THẲNG ô trip.override, đúng một dòng mỗi route, đúng câu này. */
const N2_ROUTE: [string, string][] = [["POST", "/api/van-chuyen/de-nghi/:rid/duyet"], ["POST", "/api/van-chuyen/de-nghi/:rid/bac"]];
const N2_DONG = 'if (!can(staff, "trip.override")) return CAN_DUYET_DE_NGHI();';
/** Khoảng dòng (đánh số từ 1) của thân route `m duong` trong index.ts đã che chú thích. */
function dongCuaRoute(src: string, m: string, duong: string): [number, number] {
  const dau = src.indexOf(`route("${m}", "${duong}",`);
  assert.ok(dau >= 0, `tìm thấy route ${m} ${duong}`);
  const sau = src.indexOf("route(", dau + 10);
  const dongDau = src.slice(0, dau).split("\n").length;
  return [dongDau, sau < 0 ? Infinity : src.slice(0, sau).split("\n").length];
}

test("NT-3 (b): ngoài bảy dòng đổi lớp, không tệp nào của module van-chuyen viết chuỗi ô trip.override / trip.urgent_adjust (trừ nới N2: đúng hai dòng của duyệt / bác)", () => {
  const thay: string[] = [];
  let tong = 0;
  let n2 = 0;
  const idx = khongChuThich(join(DIR, "index.ts"));
  const khoangN2 = N2_ROUTE.map(([m, d]) => dongCuaRoute(idx, m, d));
  for (const f of tepMa) {
    khongChuThich(join(DIR, f)).split("\n").forEach((dong, i) => {
      if (!/"trip\.(override|urgent_adjust)"/.test(dong)) return;
      if (f === "index.ts" && dong.includes(BIEU_THUC)) {
        tong++;
        if (demChuoi(dong, '"trip.override"') === 1 && demChuoi(dong, '"trip.urgent_adjust"') === 1) return;
      }
      if (f === "index.ts" && dong.trim() === N2_DONG && khoangN2.some(([a, b]) => i + 1 > a && i + 1 < b)) {
        n2++;
        return;
      }
      thay.push(`${f}:${i + 1}`);
    });
  }
  assert.deepEqual(thay, [], "chuỗi ô vượt luật ngoài biểu thức đổi lớp");
  assert.equal(tong, BAY_ROUTE.length, "chống bài rỗng: đủ bảy dòng đổi lớp");
  assert.equal(n2, N2_ROUTE.length, "nới N2: đúng một dòng hỏi thẳng trip.override ở MỖI route duyệt / bác (không hơn, không thiếu)");
  for (const [a, b] of khoangN2) {
    const than = idx.split("\n").slice(a - 1, b - 1).join("\n");
    assert.equal(demChuoi(than, '"trip.urgent_adjust"'), 0, "nới N2 không kèm ô điều chỉnh khẩn cấp");
    assert.equal(demChuoi(than, '"trip.override"'), 1, "nới N2: thân route duyệt / bác hỏi trip.override đúng một lần");
  }
});

test("NT-3 (c): mọi lời gọi quyenVuot(…) nhận đối số là hàm lớp (lopVuotMoc / lopVuotNghiCamKet / lopCuaLuat); lopCuaLuat dựng từ hai hàm lớp", () => {
  const sai: string[] = [];
  let soGoi = 0;
  for (const p of [...tepMa.map((f) => join(DIR, f)), MOC]) {
    const ma = maskSource(readFileSync(p, "utf8"), { strings: false, comments: true });
    for (const k of ma.matchAll(/\bquyenVuot\(/g)) {
      soGoi++;
      const doiSo = ma.slice(k.index! + k[0].length).trimStart();
      if (!/^(lopVuotMoc|lopVuotNghiCamKet|lopCuaLuat)\(/.test(doiSo)) sai.push(`${p.slice(p.lastIndexOf("/") + 1)}: quyenVuot(${doiSo.slice(0, 30)}…`);
    }
  }
  assert.deepEqual(sai, []);
  assert.ok(soGoi >= 3, `chống bài rỗng: thấy ${soGoi} lời gọi quyenVuot(`);
  const moc = maskSource(readFileSync(MOC, "utf8"), { strings: false, comments: true });
  const dinhNghia = moc.slice(moc.indexOf("export const lopCuaLuat"), moc.indexOf("export const lopCanCho"));
  assert.match(dinhNghia, /lopVuotMoc\(/);
  assert.match(dinhNghia, /lopVuotNghiCamKet\(/);
});

// Phiếu kiểm D1 THẤP-4 (đột biến M13–M15, V1c sống sót): ở rút, huỷ và thêm khách khi xe chạy (cùng xếp, dời, sửa), cổng cờ vượt chỉ hỏi ô lớp KHAN_CAP
// (`trip.urgent_adjust`) — hôm nay ô đó TRÙNG ô xếp xe nên người thiếu ô đã dừng ở 403 đầu route, không bài hành vi nào chạm tới cổng. Bài quét này chỉ giữ
// được LỜI GỌI (mỗi lệnh gọi `chanCoVuot` với đúng các cờ của thân, rồi trả ngay khi bị chặn, trước khi chạy lô); hành vi của cổng ở ba lệnh đó là dựa vào
// kỷ luật (docs/SO-HANG-RAO.md, dòng "Điều chỉnh khẩn cấp ở các lệnh bị khoá").
test("Phiếu D1 THẤP-4: mỗi lệnh nhận cờ vượt gọi chanCoVuot với ĐÚNG các cờ của thân rồi trả ngay khi bị chặn — trước khi chạy lô", () => {
  const lenh = khongChuThich(join(DIR, "dieu-phoi-lenh.ts"));
  const CO: [string, string][] = [
    ["lenhSuaChuyen", "{ moc: b.phaLe !== null, nghiCamKet: b.nghiPhaLe !== null || b.camKetPhaLe !== null }"],
    ["lenhXepLo", "{ moc: b.phaLe !== null, nghiCamKet: b.camKetPhaLe !== null }"],
    ["lenhThemDiemDangChay", "{ moc: b.phaLe !== null, nghiCamKet: b.camKetPhaLe !== null }"],
    ["lenhRut", "{ moc: b.phaLe !== null, nghiCamKet: false }"],
    ["lenhDoi", "{ moc: b.phaLe !== null, nghiCamKet: b.camKetPhaLe !== null }"],
    ["lenhHuy", "{ moc: b.phaLe !== null, nghiCamKet: false }"],
  ];
  for (const [ten, co] of CO) {
    const dau = lenh.search(new RegExp(`\\n(export )?async function ${ten}\\(`));
    assert.ok(dau >= 0, `tìm thấy ${ten}`);
    const sau = lenh.slice(dau + 1).search(/\n(export )?(async )?function /);
    const than = lenh.slice(dau, sau < 0 ? undefined : dau + 1 + sau);
    assert.equal(demChuoi(than, "chanCoVuot("), 1, `${ten}: đúng một lời gọi chanCoVuot`);
    const goi = `const cam = chanCoVuot(${co}, vuot);`;
    const i = than.indexOf(goi);
    assert.ok(i >= 0, `${ten}: cổng nhận đúng cờ ${co}`);
    assert.match(than.slice(i + goi.length), /^\s*if \(cam\) return cam;/, `${ten}: bị chặn thì trả ngay`);
    const lo = than.indexOf("chayLo(");
    assert.ok(lo < 0 || i < lo, `${ten}: cổng đứng trước khi chạy lô`);
  }
  // Route tạo chuyến (index.ts) gọi cổng trực tiếp.
  const idx = khongChuThich(join(DIR, "index.ts"));
  const dau = idx.indexOf('route("POST", "/api/van-chuyen/chuyen",');
  const than = idx.slice(dau, idx.indexOf("route(", dau + 10));
  assert.equal(demChuoi(than, "chanCoVuot("), 1, "tạo chuyến: đúng một lời gọi chanCoVuot");
  assert.match(than, /const cam = chanCoVuot\(\{ moc: false, nghiCamKet: t\.nghiPhaLe !== null \}, vuot\);\s*if \(cam\) return cam;/);
  assert.ok(than.indexOf("chanCoVuot(") < than.indexOf("chayLo("), "tạo chuyến: cổng đứng trước khi chạy lô");
});
