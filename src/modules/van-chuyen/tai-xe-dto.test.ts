// DTO TÀI XẾ (ADR-0049 D3; kế hoạch mục 1.8; TC-39; ruling R-P11, R-P17 — Task A15): bài LIỆT KÊ KHOÁ. Ngoài ngày chạy các khoá `hoTen`, `namSinh`, `lienHe`
// VẮNG MẶT; trong ngày chạy có; chuyến đang chạy qua nửa đêm vẫn có; xuất bến SỚM tối hôm trước vẫn vắng (Q-L3-B). MỌI lúc không có tiền, ghi chú, người lập, người phụ trách, số giấy tờ, nơi cấp, hạn GPLX,
// khoá so sánh nơi. Mốc văn phòng khai giờ có `nguoiBam` là CHUỖI tên; không khai → không có khoá `nguoiBam`. Đồng hồ giả — tests/audit/dieu-phoi-khung.mjs.
// NỚI có tên (Hiến pháp Điều 9.4) — ADR-0105 mục 5, phán quyết G12 (2026-10-08): GET chi tiết TRONG ngày chạy có thêm đúng một khoá `diaChiChiDuong` ở MỌI
// điểm (chuỗi đích nút "Chỉ đường"); mọi ca khác (ngoài ngày chạy, xuất bến sớm Q-L3-B, phản hồi lệnh tiến độ kể cả trong ngày — tự áp G18-B) giữ đúng 10 khoá.
// Giá trị chuỗi đích (đã che, khác khoá nơi) và việc không lan sang route khác: chi-duong-dto.test.ts, src/hanh-khach-khong-lo-ten.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ADM, DRIVER, NGAY, NGAY_SAU, batDongHo, chiTiet, chuyenSan, denGio, setup, tienDo, xe } from "../../../tests/audit/dieu-phoi-khung.mjs";

const KHOA_CHUYEN = ["bienSo", "gioBatDau", "gioKetThuc", "id", "ketThucThat", "ma", "soCho", "trangThai", "trangThaiNhan", "xuatBen"];
// Đợt 5 (ADR-0052 D5.1, D5.2): themKhiChay (cờ điểm thêm khi xe chạy), vanPhongBaoHuy (giờ + lý do — KHÔNG người bấm; bài khoá con ở xe-dang-chay-route.test.ts).
const KHOA_DIEM = ["daToi", "gioHen", "gioXeToi", "id", "loai", "soNguoi", "tenNoi", "themKhiChay", "thuTu", "trangThai"];
// ADR-0105 (nới có tên, G12): đúng MỘT khoá thêm, CHỈ GET chi tiết trong ngày chạy.
const KHOA_DIEM_CHI_DUONG = [...KHOA_DIEM, "diaChiChiDuong"].sort();
const KHOA_SUAT = ["daDon", "daTra", "diemLen", "diemXuong", "id", "loai", "maDon", "soHieuChuyenBay", "trangThai", "vanPhongBaoHuy"];
const KHOA_GOC = ["chuyen", "diem", "dieuKienConThieu", "lyDo", "suat", "trongNgayChay"];
/** Chuỗi KHÔNG BAO GIỜ được thấy trong DTO tài xế: tiền, ghi chú đơn, ghi chú thanh toán, người lập (tên Bán hàng), số / nơi cấp GPLX, khoá nơi, SĐT người bấm. */
const CAM = /777000|Ghi chú đơn Dò Tìm|Thanh toán Dò Tìm|"An"|7911000000|Nơi cấp Dò Tìm|2030-12-31|\b[LT]:[0-9a-f-]{8,}|0900000001/;
// ADR-0055 A4 + kế hoạch Đợt 3 Review Focus 4: DTO tài xế KHÔNG có khung bận (của xe hay của tài xế) — khoá khungBan*, unavailab*, lyDoBan.
const CAM_KHOA = /"(tongTien|total|price|gia|ghiChu|customerNote|paymentNote|nguoiLap|staffName|nguoiPhuTrach|handler|soGiayTo|documentNumber|issuedPlace|hetHan|expiryDate|placeKey|khoaNoi\w*|staffId|sdt(?!LienHe)\w*|khungBan\w*|unavailab\w*|lyDoBan)"\s*:/;

/** `lienHe`: khoá liên hệ có mặt không; `ten`: suất có họ tên + năm sinh không (tên gắn vào suất lúc XẾP — thân gửi hoặc máy tự chọn, I19a — hoặc lúc XUẤT BẾN — I19b);
 *  `chiDuong`: mọi điểm có `diaChiChiDuong` (ADR-0105 — chỉ GET chi tiết trong ngày chạy). */
const ghim = (j: any, v: { lienHe: boolean; ten: boolean; chiDuong: boolean }) => {
  assert.deepEqual(Object.keys(j).sort(), v.lienHe ? [...KHOA_GOC, "lienHe"].sort() : KHOA_GOC);
  assert.deepEqual(Object.keys(j.chuyen).sort(), KHOA_CHUYEN);
  for (const d of j.diem) assert.deepEqual(Object.keys(d).sort(), v.chiDuong ? KHOA_DIEM_CHI_DUONG : KHOA_DIEM);
  for (const s of j.suat) assert.deepEqual(Object.keys(s).sort(), v.ten ? [...KHOA_SUAT, "hoTen", "namSinh"].sort() : KHOA_SUAT);
};

test("TC-39: NGOÀI ngày chạy (chuyến ngày mai, chưa chạy) — khoá hoTen, namSinh, lienHe VẮNG MẶT; không tiền, ghi chú, người lập, số / nơi cấp / hạn giấy tờ, khoá nơi", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { ngay: NGAY_SAU });
    const r = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.trongNgayChay, false);
    ghim(r.json, { lienHe: false, ten: false, chiDuong: false });
    assert.doesNotMatch(r.text, /Dò Tìm \d|0912345678|Khách Liên Hệ/, "không tên khách, không liên hệ");
    assert.doesNotMatch(r.text, CAM);
    assert.doesNotMatch(r.text, CAM_KHOA);
  } finally {
    tat();
  }
});

test("TC-39: TRONG ngày chạy — GET chi tiết có lienHe (maDon, tenLienHe, sdtLienHe) và hoTen / namSinh của suất đã gắn tên (ngay lúc xếp — I19a; bù lúc xuất bến — I19b); vẫn không tiền / ghi chú / số giấy tờ; phản hồi LỆNH TIẾN ĐỘ không kèm lienHe, không kèm tên (chỉ hai GET trả tên)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    const r = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER });
    assert.equal(r.json.trongNgayChay, true);
    ghim(r.json, { lienHe: true, ten: true, chiDuong: true }); // I19(a) (K2c VỪA-1): xếp theo số người → máy gắn tên theo thứ tự khoá người NGAY lúc xếp
    assert.deepEqual(r.json.lienHe, [{ maDon: a.don.code, tenLienHe: "Khách Liên Hệ Dò Tìm", sdtLienHe: "0912345678" }]);
    for (const x of r.json.lienHe) assert.deepEqual(Object.keys(x).sort(), ["maDon", "sdtLienHe", "tenLienHe"]);
    assert.doesNotMatch(r.text, CAM);
    assert.doesNotMatch(r.text, CAM_KHOA);
    denGio("12:40");
    const x = await tienDo(w, "tai-xe", a.id, "xuat-ben");
    assert.equal(x.status, 200);
    assert.equal("lienHe" in x.json, false, "lienHe CHỈ ở GET chi tiết (kế hoạch mục 1.6)");
    ghim(x.json, { lienHe: false, ten: false, chiDuong: false }); // tên CHỈ ở GET /cuoc-cua-toi/:id (TC-39)
    const sau = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER });
    ghim(sau.json, { lienHe: true, ten: true, chiDuong: true });
    assert.deepEqual(sau.json.suat.map((s: any) => [s.hoTen, s.namSinh]).sort(), [["Khách Dò Tìm 1", 1990], ["Khách Dò Tìm 2", 1991]]);
    assert.doesNotMatch(sau.text, CAM);
    assert.doesNotMatch(sau.text, CAM_KHOA);
  } finally {
    tat();
  }
});

test("TC-39: chuyến ĐANG CHẠY qua nửa đêm (ngày chạy hôm qua) vẫn trong ngày chạy — có tên + liên hệ; kết thúc xong ngày hôm sau → vắng", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { bd: "22:00", kt: "23:50", gio: "22:30" });
    denGio("21:55");
    await tienDo(w, "tai-xe", a.id, "xuat-ben");
    denGio("00:30", NGAY_SAU);
    const r = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER });
    assert.equal(r.json.trongNgayChay, true);
    ghim(r.json, { lienHe: true, ten: true, chiDuong: true });
    await tienDo(w, "tai-xe", a.id, "ket-thuc-gian-doan", { lyDo: "GIAN_DOAN_KHAC" });
    const sau = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER });
    assert.equal(sau.json.trongNgayChay, false);
    assert.equal("lienHe" in sau.json, false);
    assert.ok(sau.json.diem.every((d: any) => !("diaChiChiDuong" in d)), "kết thúc xong ngày hôm sau → không chuỗi đích chỉ đường (ADR-0105)");
    void NGAY;
  } finally {
    tat();
  }
});

test("TC-39 / Q-L3-B (ADR-0053 D7.2, kẽ G3-9): tài xế công ty bấm Xuất bến TỐI HÔM TRƯỚC (chuyến 06:00 ngày mai thành RUNNING) — GET chi tiết VẪN không có tên, năm sinh, liên hệ tới 00:00 ngày chạy; từ 00:05 ngày chạy → có", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { ngay: NGAY_SAU, bd: "06:00", kt: "08:00", gio: "06:30" });
    denGio("18:30");
    const x = await tienDo(w, "tai-xe", a.id, "xuat-ben");
    assert.equal(x.status, 200, x.text);
    assert.equal(x.json.chuyen.trangThai, "RUNNING", "chống bài rỗng: chuyến ĐÃ chạy (xuất bến sớm được máy chủ nhận)");
    assert.equal(x.json.trongNgayChay, false, "phản hồi lệnh: chưa tới ngày chạy");
    denGio("23:00");
    const r = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.trongNgayChay, false, "xuất bến sớm không mở tên khách");
    ghim(r.json, { lienHe: false, ten: false, chiDuong: false });
    assert.doesNotMatch(r.text, /Dò Tìm \d|0912345678|Khách Liên Hệ/, "không tên khách, không liên hệ");
    denGio("00:05", NGAY_SAU);
    const sau = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER });
    assert.equal(sau.json.trongNgayChay, true, "tới ngày chạy → có");
    ghim(sau.json, { lienHe: true, ten: true, chiDuong: true });
  } finally {
    tat();
  }
});

test("TC-39 (R-P11): mốc văn phòng KHAI giờ → vanPhongKhai true + nguoiBam là CHUỖI tên; mốc tài xế bấm / văn phòng không khai → KHÔNG có khoá nguoiBam; không id, không SĐT người bấm", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    denGio("12:40");
    await tienDo(w, "tai-xe", a.id, "xuat-ben");
    denGio("12:58");
    await tienDo(w, "van-phong", a.id, `diem/${a.diemDon}/da-toi`);
    denGio("13:05");
    await tienDo(w, "van-phong", a.id, `phan-bo/${a.suat[0]}/don`, { xayRaLuc: `${NGAY}T13:00:00+07:00` });
    const r = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER });
    const moc = [r.json.chuyen.xuatBen, ...r.json.diem.map((d: any) => d.daToi), ...r.json.suat.map((s: any) => s.daDon)].filter((m: any) => m !== null);
    assert.equal(moc.length, 3);
    for (const m of moc) {
      if (m.vanPhongKhai) {
        assert.deepEqual(Object.keys(m).sort(), ["gioGhiNhan", "gioXayRa", "nguoiBam", "vanPhongKhai"]);
        assert.equal(typeof m.nguoiBam, "string");
      } else assert.deepEqual(Object.keys(m).sort(), ["gioGhiNhan", "gioXayRa", "vanPhongKhai"]);
    }
    assert.equal(moc.filter((m: any) => m.vanPhongKhai).length, 1);
    assert.doesNotMatch(r.text, /0900000001|11111111-1111/, "không SĐT, không id người bấm");
  } finally {
    tat();
  }
});

test("kế hoạch ô mới TC-F7 (ADR-0055 C3, G-C1): số hiệu chuyến bay của chặng có trên SUẤT của DTO tài xế CẢ NGOÀI ngày chạy (tên khách vẫn vắng); chi tiết chuyến văn phòng cũng có", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { ngay: NGAY_SAU });
    w.sqlite.prepare("UPDATE ord_transfer_leg SET flight_code = 'VN1553' WHERE id = ?").run(a.don.legId);
    const r = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.trongNgayChay, false);
    ghim(r.json, { lienHe: false, ten: false, chiDuong: false });
    assert.ok(r.json.suat.length > 0);
    for (const s of r.json.suat) assert.equal(s.soHieuChuyenBay, "VN1553");
    assert.doesNotMatch(r.text, /Dò Tìm \d|0912345678|Khách Liên Hệ/, "không tên khách, không liên hệ");
    const vp = await chiTiet(w, a.id);
    for (const s of vp.suat.filter((x: any) => x.loai === "PASSENGER")) assert.equal(s.soHieuChuyenBay, "VN1553");
  } finally {
    tat();
  }
});

test("ADR-0055 A4 (Review Focus 4): xe của chuyến có khung bận (ngoài giờ chuyến) — DTO tài xế KHÔNG mang khung bận, không lý do bận", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x = xe(w);
    const a = await chuyenSan(w, { xe: x });
    const k = await w.call("POST", `/api/van-chuyen/xe/${x}/ban`, { as: ADM, body: { batDau: { ngay: NGAY, gio: "16:00" }, ketThuc: { ngay: NGAY, gio: "18:00" }, lyDo: "BAN_XE_DANG_KIEM" } });
    assert.equal(k.status, 201, k.text);
    const r = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER });
    assert.equal(r.status, 200, r.text);
    assert.doesNotMatch(r.text, CAM_KHOA);
    assert.doesNotMatch(r.text, /Đăng kiểm|BAN_XE/);
    const ds = await w.call("GET", "/api/van-chuyen/cuoc-cua-toi", { as: DRIVER });
    assert.doesNotMatch(ds.text, CAM_KHOA);
    assert.doesNotMatch(ds.text, /Đăng kiểm|BAN_XE/);
  } finally {
    tat();
  }
});
