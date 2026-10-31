// Dải việc gấp (Phương án A, 31/10): luật thuần ở src/shared/viec-gap.ts. Biên «quá 2 giờ», biên hôm nay / ngày mai (giờ Việt Nam), không đơn, vắng quyền, nguồn lỗi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { NGUONG_CHO_QUA_MS, viecGap } from "./viec-gap.ts";
import { PERMISSION_CODES, can, type PermissionHolder } from "./permissions.ts";

const nguoi = (...p: string[]): PermissionHolder => ({ id: `t-${p.join("-")}`, permissions: p as PermissionHolder["permissions"] });
const KT = nguoi("ACCOUNTING");
/** 2026-10-31 10:00 giờ VN = 03:00Z. */
const BAY_GIO = Date.parse("2026-10-31T03:00:00.000Z");
const truoc = (ms: number): string => new Date(BAY_GIO - ms).toISOString();
const PHUT = 60_000;

test("biên 2 giờ: đúng 2 giờ CHƯA quá (không dải); thêm 1 mili giây thì quá", () => {
  const dung = viecGap(KT, [{ ngayDi: "2026-11-20", guiLuc: truoc(NGUONG_CHO_QUA_MS) }], BAY_GIO);
  assert.equal(dung.hien, false);
  const qua = viecGap(KT, [{ ngayDi: "2026-11-20", guiLuc: truoc(NGUONG_CHO_QUA_MS + 1) }], BAY_GIO);
  assert.equal(qua.hien, true);
  assert.equal(qua.quaHaiGio, 1);
  assert.equal(qua.phu, null, "chỉ gấp vì chờ lâu thì dòng phụ không nói chuyện ngày đi");
});

test("biên ngày đi: hôm nay và ngày mai gấp; ngày kia, hôm qua, không có ngày thì không (khi mới gửi)", () => {
  const moi = truoc(5 * PHUT);
  const gap = (ngayDi: string | null) => viecGap(KT, [{ ngayDi, guiLuc: moi }], BAY_GIO).hien;
  assert.equal(gap("2026-10-31"), true, "hôm nay");
  assert.equal(gap("2026-11-01"), true, "ngày mai");
  assert.equal(gap("2026-11-02"), false, "ngày kia");
  assert.equal(gap("2026-10-30"), false, "hôm qua: chỉ có điều kiện chờ quá 2 giờ (đặc tả mục 3 nói đúng hai điều kiện)");
  assert.equal(gap(null), false);
});

test("«hôm nay» tính theo GIỜ VIỆT NAM: 00:30 sáng VN (17:30Z hôm trước) ngày đi hôm nay vẫn gấp, ngày đi UTC-hôm-nay không gấp sai", () => {
  const luc = Date.parse("2026-10-30T17:30:00.000Z"); // = 2026-10-31 00:30 giờ VN
  const moi = new Date(luc - 5 * PHUT).toISOString();
  assert.equal(viecGap(KT, [{ ngayDi: "2026-10-31", guiLuc: moi }], luc).hien, true);
  assert.equal(viecGap(KT, [{ ngayDi: "2026-11-01", guiLuc: moi }], luc).hien, true);
  assert.equal(viecGap(KT, [{ ngayDi: "2026-11-02", guiLuc: moi }], luc).hien, false);
  assert.equal(viecGap(KT, [{ ngayDi: "2026-10-30", guiLuc: moi }], luc).hien, false, "ngày UTC của lúc này là 30/10 nhưng ngày Việt Nam đã sang 31/10");
});

test("câu chữ: tổng đơn chờ trước, rồi số đơn quá 2 giờ; tổng đếm CẢ đơn không gấp", () => {
  const r = viecGap(KT, [
    { ngayDi: "2026-11-20", guiLuc: truoc(3 * 60 * PHUT) }, // quá 2 giờ
    { ngayDi: "2026-10-31", guiLuc: truoc(10 * PHUT) }, // đi hôm nay
    { ngayDi: "2026-11-30", guiLuc: truoc(10 * PHUT) }, // không gấp, vẫn đếm vào tổng
  ], BAY_GIO);
  assert.equal(r.tong, 3);
  assert.equal(r.cau, "3 đơn chờ xác nhận, 1 đơn quá 2 giờ");
  assert.equal(r.diSom, 1);
  assert.equal(r.phu, "1 đơn có khách đi hôm nay hoặc ngày mai.");
  const chiDiSom = viecGap(KT, [{ ngayDi: "2026-11-01", guiLuc: truoc(PHUT) }], BAY_GIO);
  assert.equal(chiDiSom.cau, "1 đơn chờ xác nhận", "không có đơn quá 2 giờ thì không nói «0 đơn quá 2 giờ»");
});

test("không đơn / nguồn vắng / nguồn lỗi → ẩn hẳn", () => {
  assert.equal(viecGap(KT, [], BAY_GIO).hien, false);
  assert.equal(viecGap(KT, undefined, BAY_GIO).hien, false);
  assert.equal(viecGap(KT, null, BAY_GIO).hien, false);
});

test("guiLuc không đọc được → không tính là quá 2 giờ (không đoán)", () => {
  assert.equal(viecGap(KT, [{ ngayDi: "2026-11-20", guiLuc: "không phải ngày" }], BAY_GIO).hien, false);
  assert.equal(viecGap(KT, [{ ngayDi: "2026-11-20", guiLuc: "" }], BAY_GIO).hien, false);
});

test("vắng quyền: chỉ người giữ ô order.confirm.review có dải — 1024 tập quyền khớp can()", () => {
  const don = [{ ngayDi: "2026-10-31", guiLuc: truoc(5 * 60 * PHUT) }];
  let co = 0;
  for (let m = 0; m < 1 << PERMISSION_CODES.length; m++) {
    const w = nguoi(...PERMISSION_CODES.filter((_, i) => m & (1 << i)));
    const hien = viecGap(w, don, BAY_GIO).hien;
    assert.equal(hien, can(w, "order.confirm.review"), `tập ${m}`);
    if (hien) co++;
  }
  assert.ok(co > 0);
  for (const p of ["PARTNER", "INTERN", "HR", "DRIVER", "DRIVER_PARTNER"]) assert.equal(viecGap(nguoi(p), don, BAY_GIO).hien, false, p);
  for (const p of ["ACCOUNTING", "FIELD", "SALES", "ADMIN", "SUPER_ADMIN"]) assert.equal(viecGap(nguoi(p), don, BAY_GIO).hien, true, p);
});

test("chỉ web/home.ts import viec-gap (gói web/orders.ts sát trần byte)", () => {
  const doc = (p: string): string => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
  const ai: string[] = [];
  for (const dir of ["web/", "src/shared/"]) {
    for (const f of readdirSync(new URL(`../../${dir}`, import.meta.url))) {
      if (!f.endsWith(".ts") || f.endsWith(".test.ts") || f === "viec-gap.ts") continue;
      if (/from\s+["'][^"']*viec-gap(?:\.ts)?["']/.test(doc(dir + f))) ai.push(dir + f);
    }
  }
  assert.deepEqual(ai, ["web/home.ts"]);
});
