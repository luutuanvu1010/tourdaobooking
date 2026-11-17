// ADR-0135 Đ1–Đ2: luật thuần «ai đọc / ghi được đơn». Đơn NHÁP chỉ người lập đọc và ghi; người khác (kể cả Toàn quyền, người phụ trách chọn sẵn) → 404.
// Bảng chân trị đủ 2×2×2 cho `draft` (coQuyenXem × laNguoiLap × (dangCho, xetDuyetDuoc) ghép) + hai ca `confirmed` / `cancelled` đi theo `coQuyenXem`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chiNguoiLapGhiNhap, ketQuaXemDon, xemDuocDon } from "./xem-don-nhap.ts";

const TRANG_THAI = ["draft", "confirmed", "cancelled"] as const;
const BOOL = [false, true] as const;

test("đơn nháp: bảng chân trị đủ coQuyenXem × laNguoiLap × dangCho × xetDuyetDuoc", () => {
  for (const coQuyenXem of BOOL) for (const laNguoiLap of BOOL) for (const dangCho of BOOL) for (const xetDuyetDuoc of BOOL) {
    const mong = (laNguoiLap && coQuyenXem) || (dangCho && xetDuyetDuoc);
    assert.equal(xemDuocDon({ coQuyenXem, status: "draft", laNguoiLap, dangCho, xetDuyetDuoc }), mong, JSON.stringify({ coQuyenXem, laNguoiLap, dangCho, xetDuyetDuoc }));
  }
});

test("Đợt 2 (chưa có bước chờ): nháp của người khác KHÔNG xem được dù có quyền xem mọi đơn", () => {
  assert.equal(xemDuocDon({ coQuyenXem: true, status: "draft", laNguoiLap: false, dangCho: false, xetDuyetDuoc: false }), false);
  assert.equal(xemDuocDon({ coQuyenXem: true, status: "draft", laNguoiLap: true, dangCho: false, xetDuyetDuoc: false }), true);
  assert.equal(xemDuocDon({ coQuyenXem: false, status: "draft", laNguoiLap: true, dangCho: false, xetDuyetDuoc: false }), false, "người lập mà bảng quyền không cho xem vẫn không xem");
});

test("đơn đã xác nhận / đã huỷ: đi theo coQuyenXem, bất kể người lập, bước chờ", () => {
  for (const status of ["confirmed", "cancelled"] as const) for (const laNguoiLap of BOOL) for (const dangCho of BOOL) for (const xetDuyetDuoc of BOOL) {
    assert.equal(xemDuocDon({ coQuyenXem: true, status, laNguoiLap, dangCho, xetDuyetDuoc }), true);
    assert.equal(xemDuocDon({ coQuyenXem: false, status, laNguoiLap, dangCho, xetDuyetDuoc }), false);
  }
});

test("ketQuaXemDon: nháp của người khác LUÔN 404 (kể cả chỉ-HDV hay có ô xem mọi đơn); đơn khác giữ luật cũ (chỉ-HDV 404, còn lại 403)", () => {
  const co = { dangCho: false, xetDuyetDuoc: false };
  for (const coQuyenXem of BOOL) for (const chiXemDonDuocGiao of BOOL) {
    assert.equal(ketQuaXemDon({ ...co, coQuyenXem, status: "draft", laNguoiLap: false, chiXemDonDuocGiao }), "404");
  }
  assert.equal(ketQuaXemDon({ ...co, coQuyenXem: true, status: "draft", laNguoiLap: true, chiXemDonDuocGiao: false }), "ok");
  assert.equal(ketQuaXemDon({ ...co, coQuyenXem: false, status: "draft", laNguoiLap: true, chiXemDonDuocGiao: false }), "403", "người lập mà bảng quyền không cho xem: như cũ 403");
  assert.equal(ketQuaXemDon({ ...co, coQuyenXem: true, status: "confirmed", laNguoiLap: false, chiXemDonDuocGiao: true }), "ok");
  assert.equal(ketQuaXemDon({ ...co, coQuyenXem: false, status: "confirmed", laNguoiLap: false, chiXemDonDuocGiao: true }), "404");
  assert.equal(ketQuaXemDon({ ...co, coQuyenXem: false, status: "cancelled", laNguoiLap: false, chiXemDonDuocGiao: false }), "403");
});

test("chiNguoiLapGhiNhap: nháp chỉ người lập; đơn khác trạng thái không bị luật này chặn", () => {
  for (const status of TRANG_THAI) for (const laNguoiLap of BOOL) {
    assert.equal(chiNguoiLapGhiNhap({ status, laNguoiLap }), status !== "draft" || laNguoiLap, `${status}/${laNguoiLap}`);
  }
});

// ADR-0213 Đ5 (mốc B1 Task 12): cờ chỉ mở đơn ĐÃ GỬI LÊN Tour Đảo — đã xác nhận, đã huỷ, hoặc nháp đang chờ văn phòng. Nháp khác giữ nguyên ADR-0135.
test("ADR-0213 Đ5: donDaGuiLen + `quanLyBenDat` chỉ mở nháp ĐANG CHỜ (và chỉ khi coQuyenXem đã gồm cờ)", async () => {
  const { donDaGuiLen } = await import("./xem-don-nhap.ts");
  assert.equal(donDaGuiLen({ status: "confirmed", coYeuCauMo: false }), true);
  assert.equal(donDaGuiLen({ status: "cancelled", coYeuCauMo: false }), true);
  assert.equal(donDaGuiLen({ status: "draft", coYeuCauMo: true }), true);
  assert.equal(donDaGuiLen({ status: "draft", coYeuCauMo: false }), false);
  for (const coQuyenXem of BOOL) for (const dangCho of BOOL) for (const quanLyBenDat of BOOL) {
    const mong = dangCho && quanLyBenDat && coQuyenXem;
    assert.equal(xemDuocDon({ coQuyenXem, status: "draft", laNguoiLap: false, dangCho, xetDuyetDuoc: false, quanLyBenDat }), mong, JSON.stringify({ coQuyenXem, dangCho, quanLyBenDat }));
    assert.equal(ketQuaXemDon({ coQuyenXem, status: "draft", laNguoiLap: false, dangCho, xetDuyetDuoc: false, quanLyBenDat, chiXemDonDuocGiao: false }), mong ? "ok" : "404");
  }
});

// ADR-0213 «Sửa ADR cũ» (nới ADR-0135 Đ1–Đ2) + Đ8 (mốc B2 Task 16): NGOẠI LỆ CÓ TÊN — người quản lý có hiệu lực của tổ chức bên đặt đọc / ghi nháp của người lập là THÀNH VIÊN
// lúc lập (`acting_link_kind = 'MEMBER'`, Ruling R10) khi chế độ «Chỉ soạn», hoặc khi nháp đang chờ người quản lý («Soạn và gửi»). Không ai khác được thêm. Thành viên không ghi khi đang chờ.
test("ADR-0213 Đ8: bảng chân trị ngoại lệ có tên — đọc và ghi nháp của thành viên", async () => {
  const { quanLyThayNhapThanhVien } = await import("./xem-don-nhap.ts");
  for (const laQuanLyCoHieuLuc of BOOL) for (const nguoiLapLaThanhVienLucLap of BOOL) for (const cheDo of ["CHI_SOAN", "SOAN_VA_GUI"] as const) for (const dangChoQuanLy of BOOL) {
    const n = { laQuanLyCoHieuLuc, nguoiLapLaThanhVienLucLap, cheDo, dangChoQuanLy };
    const mong = laQuanLyCoHieuLuc && nguoiLapLaThanhVienLucLap && (cheDo === "CHI_SOAN" || dangChoQuanLy);
    const k = JSON.stringify(n);
    assert.equal(quanLyThayNhapThanhVien(n), mong, k);
    // Người quản lý (không phải người lập): đọc khi ngoại lệ đúng VÀ bảng quyền (đã tính với cờ quanLyBenDat) cho xem; ghi khi ngoại lệ đúng.
    assert.equal(xemDuocDon({ coQuyenXem: true, status: "draft", laNguoiLap: false, dangCho: false, xetDuyetDuoc: false, quanLyBenDat: true, ngoaiLeToChuc: n }), mong, `đọc ${k}`);
    assert.equal(xemDuocDon({ coQuyenXem: false, status: "draft", laNguoiLap: false, dangCho: false, xetDuyetDuoc: false, quanLyBenDat: true, ngoaiLeToChuc: n }), false, `bảng quyền không cho ⇒ không đọc ${k}`);
    assert.equal(ketQuaXemDon({ coQuyenXem: true, status: "draft", laNguoiLap: false, dangCho: false, xetDuyetDuoc: false, quanLyBenDat: true, ngoaiLeToChuc: n, chiXemDonDuocGiao: false }), mong ? "ok" : "404", k);
    assert.equal(chiNguoiLapGhiNhap({ status: "draft", laNguoiLap: false, ngoaiLeToChuc: n }), mong, `ghi ${k}`);
    // Người lập (thành viên): ghi khi KHÔNG đang chờ người quản lý; đọc như ADR-0135 (ngoại lệ không bớt quyền đọc của người lập).
    assert.equal(chiNguoiLapGhiNhap({ status: "draft", laNguoiLap: true, ngoaiLeToChuc: n }), !dangChoQuanLy, `người lập ghi ${k}`);
    assert.equal(xemDuocDon({ coQuyenXem: true, status: "draft", laNguoiLap: true, dangCho: false, xetDuyetDuoc: false, ngoaiLeToChuc: n }), true);
    // Đơn đã gửi lên: ngoại lệ không đổi gì.
    for (const status of ["confirmed", "cancelled"] as const) {
      assert.equal(chiNguoiLapGhiNhap({ status, laNguoiLap: false, ngoaiLeToChuc: n }), true);
      assert.equal(xemDuocDon({ coQuyenXem: false, status, laNguoiLap: false, dangCho: false, xetDuyetDuoc: false, ngoaiLeToChuc: n }), false);
    }
  }
});

test("ADR-0213 Đ8: «đang chờ người quản lý» KHÔNG mở cửa của người xét duyệt (khác `dangCho` = yêu cầu xác nhận mở); vắng ngoại lệ = luật ADR-0135 nguyên vẹn", () => {
  const n = { laQuanLyCoHieuLuc: false, nguoiLapLaThanhVienLucLap: true, cheDo: "SOAN_VA_GUI" as const, dangChoQuanLy: true };
  assert.equal(xemDuocDon({ coQuyenXem: true, status: "draft", laNguoiLap: false, dangCho: false, xetDuyetDuoc: true, ngoaiLeToChuc: n }), false, "Toàn quyền / văn phòng có ô xét duyệt vẫn không thấy nháp chờ người quản lý");
  assert.equal(chiNguoiLapGhiNhap({ status: "draft", laNguoiLap: false }), false);
  assert.equal(chiNguoiLapGhiNhap({ status: "draft", laNguoiLap: true }), true);
});
