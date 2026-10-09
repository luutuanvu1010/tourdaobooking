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

test("NHOM_LY_DO: đúng mười hai nhóm — bảy của thiết kế [TK] §1.9 + BAN_XE từ ADR-0055 + CHI_PHI_XE (ADR-0057 C3) + DIEU_CHINH (ADR-0097 Đ2.5) + TU_CHOI_CHUYEN, BAN_TAI_XE (ADR-0053 D8.1, D9.1); có nhãn tiếng Việt; isNhomLyDo chỉ nhận đúng mã", () => {
  assert.deepEqual([...NHOM_LY_DO], ["DOI_GIO_XE", "BAO_HUY_DIEM", "PHA_LE", "TU_CHOI_NHAN", "KET_THUC_GIAN_DOAN", "HUY_CHUYEN", "BO_QUA_DIEM", "BAN_XE", "CHI_PHI_XE", "DIEU_CHINH", "TU_CHOI_CHUYEN", "BAN_TAI_XE"]);
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

test("LOAI_SU_KIEN_CHUYEN: đủ 17 loại tương ứng các hành động trip_* của kế hoạch mục 1.1 (+ ALLOCATION_STOP_CHANGED — ADR-0050 VK1-B; + ALLOCATION_PASSENGER_CHANGED — R-P29, chủ lần 16), không trùng, có nhãn", () => {
  assert.deepEqual([...LOAI_SU_KIEN_CHUYEN], [
    "CREATED", "UPDATED", "CANCELLED",
    "ALLOCATED", "ALLOCATION_REMOVED", "ALLOCATION_MOVED", "ALLOCATION_STOP_CHANGED", "ALLOCATION_PASSENGER_CHANGED",
    "DEPARTED", "STOP_ARRIVED", "PASSENGER_BOARDED", "PASSENGER_NO_SHOW", "PASSENGER_CANCELLED_AT_STOP", "PASSENGER_DROPPED",
    "STOPS_REORDERED", "ENDED", "ENDED_INTERRUPTED",
    // ADR-0052 D5 (Đợt 5): văn phòng thêm điểm / báo huỷ khi xe đang chạy
    "STOP_ADDED_RUNNING", "ALLOCATION_OFFICE_CANCELLED",
    // ADR-0052 D5b (Đợt 5 A-1b): tài xế bổ sung tên khách chưa có tên
    "PASSENGER_NAMED",
    // ADR-0097 (gói A1, V3-B): văn phòng điều chỉnh kết quả một khách; thu hồi xuất bến nhầm
    "CORRECTION", "DEPARTURE_REVOKED",
    // ADR-0104 Đ2.9: máy cập nhật chuyến theo đơn (lệnh đơn nối khúc chuyến vào cùng lô) — danh sách mở (0042:157), không dựng lại bảng
    "ALLOCATION_ORDER_SYNCED",
    // ADR-0053 D8 (A4 T7): tài xế đối tác Từ chối chuyến trước hạn — danh sách mở (0042:157)
    "DRIVER_REFUSED",
  ]);
  assert.equal(NHAN_SU_KIEN_CHUYEN.DRIVER_REFUSED, "Tài xế từ chối chuyến");
  assert.equal(NHAN_SU_KIEN_CHUYEN.ALLOCATION_ORDER_SYNCED, "Máy cập nhật chuyến theo đơn");
  assert.equal(NHAN_SU_KIEN_CHUYEN.CORRECTION, "Văn phòng điều chỉnh kết quả khách");
  assert.equal(NHAN_SU_KIEN_CHUYEN.DEPARTURE_REVOKED, "Văn phòng thu hồi xuất bến");
  assert.equal(NHAN_SU_KIEN_CHUYEN.ALLOCATION_PASSENGER_CHANGED, "Cập nhật khách theo đơn");
  assert.equal(NHAN_SU_KIEN_CHUYEN.STOP_ADDED_RUNNING, "Văn phòng thêm điểm khi xe đang chạy");
  assert.equal(NHAN_SU_KIEN_CHUYEN.ALLOCATION_OFFICE_CANCELLED, "Văn phòng báo huỷ khách");
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
  for (const k of ["CREATED", "UPDATED", "CANCELLED", "ALLOCATED", "ALLOCATION_REMOVED", "ALLOCATION_MOVED", "ALLOCATION_STOP_CHANGED", "ALLOCATION_PASSENGER_CHANGED", "STOPS_REORDERED"]) {
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
    DOI_KHACH_THEO_DON: "PASSENGER_CHANGED",
    // ADR-0104 Đ2 (phán quyết G7 của điều phối, 2026-10-08 — nới có tên N6 trong docs/SO-HANG-RAO.md): máy đồng bộ chuyến theo đơn đóng ghế của đơn huỷ /
    // chặng bỏ / ghế thừa bằng REMOVED (cùng họ "rút khách"); khoá người đổi vẫn PASSENGER_CHANGED (DOI_KHACH_THEO_DON).
    DONG_BO_THEO_DON: "REMOVED",
  });
  assert.equal(LENH_DONG_SUAT.DOI_DIEM_THEO_CHANG, "STOP_CHANGED");
  assert.equal(LENH_DONG_SUAT.DOI_KHACH_THEO_DON, "PASSENGER_CHANGED", "R-P29 (chủ lần 16): mã RIÊNG, không dùng lại STOP_CHANGED / REMOVED");
  for (const [lenh, ma] of Object.entries(LENH_DONG_SUAT)) {
    assert.ok((LY_DO_DONG_SUAT as readonly string[]).includes(ma), `${lenh}: mã ${ma} phải thuộc LY_DO_DONG_SUAT (CHECK close_reason của 0042)`);
    if (lenh !== "KET_THUC_GIAN_DOAN") assert.ok((LENH_XEP as readonly string[]).includes(lenh), `${lenh} phải là một lệnh lúc xếp (LENH_XEP)`);
  }
});

// ADR-0056 VK3-A A3: ĐỔI GIÁ TRỊ GHIM theo ADR (thêm CAM_KET), không nới. THIEU_GIA (ADR-0057 C5) KHÔNG phá lệ được — không thuộc tập này.
test("MA_LUAT_PHA_LE: đúng ba luật cấu hình được phá lệ (mốc tối thiểu, khoảng nghỉ, cam kết xe riêng / số chỗ); mỗi mã cũng là một mã 'giữ' (một chỗ sống — K9)", () => {
  assert.deepEqual([...MA_LUAT_PHA_LE], ["MOC_TOI_THIEU", "KHOANG_NGHI", "CAM_KET"]);
  assert.equal(isMaLuatPhaLe("THIEU_GIA"), false);
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
  assert.deepEqual([...LY_DO_DONG_SUAT], ["MOVED", "REMOVED", "TRIP_CANCELLED", "TRIP_INTERRUPTED", "TRANSFERRED", "STOP_CHANGED", "PASSENGER_CHANGED"]);
  for (const s of TRANG_THAI_CUOI_CHUYEN) assert.ok((TRANG_THAI_CHUYEN as readonly string[]).includes(s));
  for (const s of KET_QUA_CUOI_SUAT) assert.ok((TRANG_THAI_SUAT as readonly string[]).includes(s));
});

test("tệp kiểu là luật thuần: không import module, import kèm đuôi .ts", () => {
  const src = readFileSync(new URL("./dieu-phoi-kieu.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /from\s+["'][^"']*modules\//);
  for (const m of src.matchAll(/from\s+["'](\.[^"']+)["']/g)) assert.match(m[1]!, /\.ts$/, `import ${m[1]} phải kèm đuôi .ts`);
});
