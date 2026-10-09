// KHUNG XEM KHÁCH (ADR-0053 D7.2; kế hoạch A4 T1, NT-3; G-A4-1 biên nghiêm, G-A4-2 vế hạn) — bảng ca của tiêu chí 3 (ADR-0053 :217-222), hạn 12 giờ.
// MỘT hàm `trongKhungXemKhach` cho mọi tài xế: `hanTuChoiMs` undefined = không có vế hạn (tài xế công ty); null = người có vế hạn mà thiếu dòng hạn → ngoài
// khung (đóng mặc định); số = hạn của cặp (tài xế, chuyến) — trong khung khi và chỉ khi bây giờ > hạn VÀ (ngày chạy HOẶC đang chạy đã xuất bến từ ngày chạy).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mocMoKhung, trongKhungXemKhach } from "./dieu-phoi-kiem.ts";
import type { TrangThaiChuyen } from "./dieu-phoi-kieu.ts";

const vn = (s: string) => Date.parse(`${s}+07:00`);
const HAN_12_GIO = 720 * 60_000;
const chuyen = (ngayChay: string, trangThai: TrangThaiChuyen = "PLANNED", xuatBen: string | null = null) => ({ ngayChay, trangThai, xuatBenMs: xuatBen === null ? null : vn(xuatBen) });
const hanCua = (gioChay: string) => vn(gioChay) - HAN_12_GIO;

test("tài xế ĐỐI TÁC (có vế hạn) — đủ ca của tiêu chí 3 ADR-0053", () => {
  // chuyến 06:00 ngày D: 18:30 D−1 (đã qua hạn, chưa tới ngày chạy) → vắng; 00:05 D → có
  const c6 = chuyen("2026-10-20");
  const h6 = hanCua("2026-10-20T06:00:00");
  assert.equal(trongKhungXemKhach(c6, h6, vn("2026-10-19T18:30:00")), false);
  assert.equal(trongKhungXemKhach(c6, h6, vn("2026-10-20T00:05:00")), true);
  // chuyến 14:00 ngày D (hạn 02:00): 01:00 → vắng; 02:05 → có
  const c14 = chuyen("2026-10-20");
  const h14 = hanCua("2026-10-20T14:00:00");
  assert.equal(trongKhungXemKhach(c14, h14, vn("2026-10-20T01:00:00")), false);
  assert.equal(trongKhungXemKhach(c14, h14, vn("2026-10-20T02:05:00")), true);
  // chuyến 23:30 ngày D qua nửa đêm (hạn 11:30): 11:00 → vắng; 12:00 → có; 00:30 D+1 RUNNING (xuất bến 23:20 D) → có; 00:30 D+1 ENDED → vắng
  const h23 = hanCua("2026-10-20T23:30:00");
  assert.equal(trongKhungXemKhach(chuyen("2026-10-20"), h23, vn("2026-10-20T11:00:00")), false);
  assert.equal(trongKhungXemKhach(chuyen("2026-10-20"), h23, vn("2026-10-20T12:00:00")), true);
  assert.equal(trongKhungXemKhach(chuyen("2026-10-20", "RUNNING", "2026-10-20T23:20:00"), h23, vn("2026-10-21T00:30:00")), true);
  assert.equal(trongKhungXemKhach(chuyen("2026-10-20", "ENDED", "2026-10-20T23:20:00"), h23, vn("2026-10-21T00:30:00")), false);
  // xuất bến SỚM: chuyến 06:00 ngày D, bấm Xuất bến 18:30 D−1 (RUNNING) → vắng tới 00:00 D
  const som = chuyen("2026-10-20", "RUNNING", "2026-10-19T18:30:00");
  assert.equal(trongKhungXemKhach(som, h6, vn("2026-10-19T23:59:00")), false);
  assert.equal(trongKhungXemKhach(som, h6, vn("2026-10-20T00:00:00")), true);
  // xuất bến trong ngày chạy nhưng TRƯỚC hạn: chuyến 14:00 (hạn 02:00), bấm 00:05 → vắng tới 02:00 (biên nghiêm: đúng 02:00 vẫn vắng — G-A4-1)
  const truocHan = chuyen("2026-10-20", "RUNNING", "2026-10-20T00:05:00");
  assert.equal(trongKhungXemKhach(truocHan, h14, vn("2026-10-20T00:05:00")), false);
  assert.equal(trongKhungXemKhach(truocHan, h14, h14), false, "biên nghiêm: bây giờ = hạn → còn trong hạn Từ chối, chưa thấy khách");
  assert.equal(trongKhungXemKhach(truocHan, h14, h14 + 1), true);
});

test("tài xế CÔNG TY (không vế hạn — undefined): chỉ khung ngày chạy, xuất bến sớm không mở tên", () => {
  assert.equal(trongKhungXemKhach(chuyen("2026-10-20", "RUNNING", "2026-10-19T18:30:00"), undefined, vn("2026-10-19T23:00:00")), false);
  assert.equal(trongKhungXemKhach(chuyen("2026-10-20", "RUNNING", "2026-10-19T18:30:00"), undefined, vn("2026-10-20T00:00:00")), true);
  assert.equal(trongKhungXemKhach(chuyen("2026-10-20", "RUNNING", "2026-10-20T23:20:00"), undefined, vn("2026-10-21T00:30:00")), true);
  assert.equal(trongKhungXemKhach(chuyen("2026-10-20"), undefined, vn("2026-10-20T00:05:00")), true, "không có vế hạn: 00:05 ngày chạy đã thấy (chuyến 14:00)");
  assert.equal(trongKhungXemKhach(chuyen("2026-10-21"), undefined, vn("2026-10-20T23:00:00")), false);
});

test("người có vế hạn mà THIẾU dòng hạn (null) → luôn ngoài khung (đóng mặc định — G-A4-2)", () => {
  assert.equal(trongKhungXemKhach(chuyen("2026-10-20"), null, vn("2026-10-20T12:00:00")), false);
  assert.equal(trongKhungXemKhach(chuyen("2026-10-20", "RUNNING", "2026-10-20T06:00:00"), null, vn("2026-10-20T12:00:00")), false);
});

test("mocMoKhung: lúc khung bắt đầu mở = max(00:00 ngày chạy, ngay sau hạn) — khớp trongKhungXemKhach tại mốc và ngay trước mốc", () => {
  const c = chuyen("2026-10-20");
  for (const [gio, ky] of [["2026-10-20T06:00:00", vn("2026-10-20T00:00:00")], ["2026-10-20T14:00:00", hanCua("2026-10-20T14:00:00") + 1]] as const) {
    const han = hanCua(gio);
    const m = mocMoKhung(c, han);
    assert.equal(m, ky, gio);
    assert.equal(trongKhungXemKhach(c, han, m), true, `${gio}: tại mốc mở → trong khung`);
    assert.equal(trongKhungXemKhach(c, han, m - 1), false, `${gio}: ngay trước mốc → ngoài khung`);
  }
  assert.equal(mocMoKhung(c, undefined), vn("2026-10-20T00:00:00"), "không vế hạn: 00:00 ngày chạy");
});
