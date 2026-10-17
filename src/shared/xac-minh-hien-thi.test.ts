import { test } from "node:test";
import assert from "node:assert/strict";
import { LY_DO_TU_CHOI, NHAN_LY_DO_CHAN, laMaLyDoTuChoi, nhanLyDoTuChoi } from "./xac-minh-hien-thi.ts";

test("mọi mã lý do khớp khuôn reason_code của 0105; nhãn tiếng Việt có dấu, không rỗng", () => {
  for (const [ma, nhan] of Object.entries(LY_DO_TU_CHOI)) {
    assert.match(ma, /^[A-Z0-9_]{2,40}$/, ma);
    assert.ok(nhan.trim().length > 5 && /[^\u0000-\u007f]/.test(nhan), `${ma}: nhãn phải là tiếng Việt có dấu`);
  }
  assert.equal(Object.keys(LY_DO_TU_CHOI).length, 8);
});

test("laMaLyDoTuChoi / nhanLyDoTuChoi: mã lạ, mã kế thừa từ Object không lọt", () => {
  assert.equal(laMaLyDoTuChoi("KHONG_KHOP_GIAY_TO"), true);
  for (const v of ["XYZ", "", "toString", "__proto__", 5, null, undefined]) assert.equal(laMaLyDoTuChoi(v), false, String(v));
  assert.equal(nhanLyDoTuChoi("XYZ"), "Lý do khác");
  assert.equal(nhanLyDoTuChoi("toString"), "Lý do khác");
  assert.equal(nhanLyDoTuChoi("GIAY_TO_HET_HAN"), "Giấy tờ đã hết hạn");
});

test("bốn khoá NHAN_LY_DO_CHAN khớp LyDoChan của luật thuần", async () => {
  const nguon = (await import("node:fs")).readFileSync(new URL("../modules/parties/xac-minh.ts", import.meta.url), "utf8");
  const kieu = nguon.match(/export type LyDoChan = ([^;]+);/)![1]!.match(/"([a-z_]+)"/g)!.map((s) => s.slice(1, -1)).sort();
  assert.deepEqual(Object.keys(NHAN_LY_DO_CHAN).sort(), kieu);
  for (const nhan of Object.values(NHAN_LY_DO_CHAN)) assert.ok(nhan.length > 10);
});
