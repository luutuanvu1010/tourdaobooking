// Kiểu và hằng dùng chung của điều phối (ADR-0049; kế hoạch Task A2, mục 1.1, I7). Nhóm lý do và loại sự kiện chuyến là danh sách MỞ theo lượt → kiểm ở
// MÃ (không CHECK liệt kê ở CSDL); bài này khoá danh sách lượt 1 và đối chiếu dữ liệu gieo của migration 0041 với nhóm hợp lệ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  KET_QUA_CUOI_SUAT, LENH_DONG_SUAT, LOAI_DIEM, LOAI_SU_KIEN_CHUYEN, LOAI_SU_KIEN_KHAI_GIO, LOAI_SUAT, LY_DO_DONG_SUAT, MA_LUAT_PHA_LE, NGUON_GIO_XAY_RA, NHAN_NHOM_LY_DO,
  NHAN_SU_KIEN_CHUYEN, NHOM_LY_DO, TRANG_THAI_CHUYEN, TRANG_THAI_CUOI_CHUYEN, TRANG_THAI_DIEM, TRANG_THAI_SUAT, isMaLuatPhaLe, isNhomLyDo, isSuKienKhaiGio,
} from "./dieu-phoi-kieu.ts";
import { MA_GIU } from "./ly-do-giu.ts";
import { LENH_XEP } from "./moc-toi-thieu.ts";

test("NHOM_LY_DO: đúng bảy nhóm của thiết kế [TK] §1.9, có nhãn tiếng Việt; isNhomLyDo chỉ nhận đúng mã", () => {
  assert.deepEqual([...NHOM_LY_DO], ["DOI_GIO_XE", "BAO_HUY_DIEM", "PHA_LE", "TU_CHOI_NHAN", "KET_THUC_GIAN_DOAN", "HUY_CHUYEN", "BO_QUA_DIEM"]);
  for (const g of NHOM_LY_DO) assert.ok(NHAN_NHOM_LY_DO[g].trim().length > 0, g);
  assert.equal(Object.keys(NHAN_NHOM_LY_DO).length, NHOM_LY_DO.length);
  assert.equal(isNhomLyDo("PHA_LE"), true);
  for (const bad of ["pha_le", "KHAC", "", null, 1]) assert.equal(isNhomLyDo(bad), false, String(bad));
});

test("mọi mã lý do gieo ở migration *_chinh_sach_dieu_phoi.sql thuộc một nhóm hợp lệ (nhóm kiểm ở mã — I7)", () => {
  const dir = new URL("../../migrations/", import.meta.url);
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
  const rows = db.prepare("SELECT code, reason_group FROM vc_reason").all() as { code: string; reason_group: string }[];
  assert.ok(rows.length >= 10, `phải có lý do gieo, thấy ${rows.length}`);
  for (const r of rows) assert.ok(isNhomLyDo(r.reason_group), `${r.code}: nhóm lạ ${r.reason_group}`);
});

test("LOAI_SU_KIEN_CHUYEN: đủ 16 loại tương ứng các hành động trip_* của kế hoạch mục 1.1 (+ ALLOCATION_STOP_CHANGED — ADR-0050 VK1-B), không trùng, có nhãn", () => {
  assert.deepEqual([...LOAI_SU_KIEN_CHUYEN], [
    "CREATED", "UPDATED", "CANCELLED",
    "ALLOCATED", "ALLOCATION_REMOVED", "ALLOCATION_MOVED", "ALLOCATION_STOP_CHANGED",
    "DEPARTED", "STOP_ARRIVED", "PASSENGER_BOARDED", "PASSENGER_NO_SHOW", "PASSENGER_CANCELLED_AT_STOP", "PASSENGER_DROPPED",
    "STOPS_REORDERED", "ENDED", "ENDED_INTERRUPTED",
  ]);
  assert.equal(new Set(LOAI_SU_KIEN_CHUYEN).size, LOAI_SU_KIEN_CHUYEN.length);
  for (const k of LOAI_SU_KIEN_CHUYEN) assert.ok(NHAN_SU_KIEN_CHUYEN[k].trim().length > 0, k);
  // Ruling R-K1: MOVED / ALLOCATION_MOVED giữ nghĩa "dời sang chuyến KHÁC"; đổi điểm cùng chuyến là loại riêng.
  assert.equal(NHAN_SU_KIEN_CHUYEN.ALLOCATION_MOVED, "Dời khách sang chuyến khác");
  assert.equal(NHAN_SU_KIEN_CHUYEN.ALLOCATION_STOP_CHANGED, "Đổi điểm đón / trả theo đơn");
});

test("ADR-0050 VK1-A (I35): LOAI_SU_KIEN_KHAI_GIO là TẬP CON của LOAI_SU_KIEN_CHUYEN, ĐÚNG tám loại tiến độ; mọi loại khác (kế hoạch) luôn MAY_CHU; NGUON_GIO_XAY_RA khớp CHECK của 0042", () => {
  assert.deepEqual([...LOAI_SU_KIEN_KHAI_GIO], [
    "DEPARTED", "STOP_ARRIVED", "PASSENGER_BOARDED", "PASSENGER_NO_SHOW", "PASSENGER_CANCELLED_AT_STOP", "PASSENGER_DROPPED", "ENDED", "ENDED_INTERRUPTED",
  ]);
  for (const k of LOAI_SU_KIEN_KHAI_GIO) assert.ok((LOAI_SU_KIEN_CHUYEN as readonly string[]).includes(k), k);
  for (const k of ["CREATED", "UPDATED", "CANCELLED", "ALLOCATED", "ALLOCATION_REMOVED", "ALLOCATION_MOVED", "ALLOCATION_STOP_CHANGED", "STOPS_REORDERED"]) {
    assert.equal(isSuKienKhaiGio(k), false, `${k} là sự kiện kế hoạch / đổi thứ tự — không khai giờ`);
  }
  for (const k of LOAI_SU_KIEN_KHAI_GIO) assert.equal(isSuKienKhaiGio(k), true, k);
  assert.equal(isSuKienKhaiGio("LA"), false);
  assert.deepEqual([...NGUON_GIO_XAY_RA], ["MAY_CHU", "VAN_PHONG_KHAI"]);
});

test("LENH_DONG_SUAT (bảng lệnh → mã đóng suất, một chỗ): 'cập nhật điểm theo đơn' đóng bằng STOP_CHANGED (ADR-0050 VK1-B, TC-51 (b)) — KHÔNG dùng lại MOVED (Ruling R-K1)", () => {
  assert.deepEqual({ ...LENH_DONG_SUAT }, {
    RUT: "REMOVED",
    DOI_DI: "MOVED",
    HUY_CO_KHACH: "TRIP_CANCELLED",
    KET_THUC_GIAN_DOAN: "TRIP_INTERRUPTED",
    DOI_DIEM_THEO_CHANG: "STOP_CHANGED",
  });
  assert.equal(LENH_DONG_SUAT.DOI_DIEM_THEO_CHANG, "STOP_CHANGED");
  for (const [lenh, ma] of Object.entries(LENH_DONG_SUAT)) {
    assert.ok((LY_DO_DONG_SUAT as readonly string[]).includes(ma), `${lenh}: mã ${ma} phải thuộc LY_DO_DONG_SUAT (CHECK close_reason của 0042)`);
    if (lenh !== "KET_THUC_GIAN_DOAN") assert.ok((LENH_XEP as readonly string[]).includes(lenh), `${lenh} phải là một lệnh lúc xếp (LENH_XEP)`);
  }
});

test("MA_LUAT_PHA_LE: đúng hai luật cấu hình được phá lệ (mốc tối thiểu, khoảng nghỉ); mỗi mã cũng là một mã 'giữ' (một chỗ sống — K9)", () => {
  assert.deepEqual([...MA_LUAT_PHA_LE], ["MOC_TOI_THIEU", "KHOANG_NGHI"]);
  for (const m of MA_LUAT_PHA_LE) {
    assert.equal(isMaLuatPhaLe(m), true);
    assert.ok(Object.hasOwn(MA_GIU, m), `${m} phải có trong MA_GIU`);
  }
  assert.equal(isMaLuatPhaLe("THIEU_TEN"), false);
});

test("tập ĐÓNG của bốn máy trạng thái (khớp CHECK của migration lõi chuyến — kế hoạch mục 1.3) và các tập con", () => {
  assert.deepEqual([...TRANG_THAI_CHUYEN], ["PLANNED", "RUNNING", "ENDED", "ENDED_INTERRUPTED", "CANCELLED"]);
  assert.deepEqual([...TRANG_THAI_CUOI_CHUYEN], ["ENDED", "ENDED_INTERRUPTED", "CANCELLED"]);
  assert.deepEqual([...TRANG_THAI_SUAT], ["WAITING", "BOARDED", "NO_SHOW", "CANCELLED_AT_STOP", "DROPPED"]);
  assert.deepEqual([...KET_QUA_CUOI_SUAT], ["DROPPED", "NO_SHOW", "CANCELLED_AT_STOP"]);
  assert.deepEqual([...TRANG_THAI_DIEM], ["PENDING", "ARRIVED", "DONE", "SKIPPED", "MOVED"]);
  assert.deepEqual([...LOAI_DIEM], ["PICKUP", "DROPOFF"]);
  assert.deepEqual([...LOAI_SUAT], ["PASSENGER", "CREW"]);
  assert.deepEqual([...LY_DO_DONG_SUAT], ["MOVED", "REMOVED", "TRIP_CANCELLED", "TRIP_INTERRUPTED", "TRANSFERRED", "STOP_CHANGED"]);
  for (const s of TRANG_THAI_CUOI_CHUYEN) assert.ok((TRANG_THAI_CHUYEN as readonly string[]).includes(s));
  for (const s of KET_QUA_CUOI_SUAT) assert.ok((TRANG_THAI_SUAT as readonly string[]).includes(s));
});

test("tệp kiểu là luật thuần: không import module, import kèm đuôi .ts", () => {
  const src = readFileSync(new URL("./dieu-phoi-kieu.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /from\s+["'][^"']*modules\//);
  for (const m of src.matchAll(/from\s+["'](\.[^"']+)["']/g)) assert.match(m[1]!, /\.ts$/, `import ${m[1]} phải kèm đuôi .ts`);
});
