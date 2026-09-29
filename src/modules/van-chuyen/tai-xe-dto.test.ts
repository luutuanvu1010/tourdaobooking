// DTO TÀI XẾ (ADR-0049 D3; kế hoạch mục 1.8; TC-39; ruling R-P11, R-P17 — Task A15): bài LIỆT KÊ KHOÁ. Ngoài ngày chạy các khoá `hoTen`, `namSinh`, `lienHe`
// VẮNG MẶT; trong ngày chạy có; chuyến đang chạy qua nửa đêm vẫn có. MỌI lúc không có tiền, ghi chú, người lập, người phụ trách, số giấy tờ, nơi cấp, hạn GPLX,
// khoá so sánh nơi. Mốc văn phòng khai giờ có `nguoiBam` là CHUỖI tên; không khai → không có khoá `nguoiBam`. Đồng hồ giả — tests/audit/dieu-phoi-khung.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { DRIVER, NGAY, NGAY_SAU, batDongHo, chuyenSan, denGio, setup, tienDo } from "../../../tests/audit/dieu-phoi-khung.mjs";

const KHOA_CHUYEN = ["bienSo", "gioBatDau", "gioKetThuc", "id", "ketThucThat", "ma", "soCho", "trangThai", "trangThaiNhan", "xuatBen"];
const KHOA_DIEM = ["daToi", "gioHen", "gioXeToi", "id", "loai", "soNguoi", "tenNoi", "thuTu", "trangThai"];
const KHOA_SUAT = ["daDon", "daTra", "diemLen", "diemXuong", "id", "maDon", "trangThai"];
const KHOA_GOC = ["chuyen", "diem", "dieuKienConThieu", "lyDo", "suat", "trongNgayChay"];
/** Chuỗi KHÔNG BAO GIỜ được thấy trong DTO tài xế: tiền, ghi chú đơn, ghi chú thanh toán, người lập (tên Bán hàng), số / nơi cấp GPLX, khoá nơi, SĐT người bấm. */
const CAM = /777000|Ghi chú đơn Dò Tìm|Thanh toán Dò Tìm|"An"|7911000000|Nơi cấp Dò Tìm|2030-12-31|\b[LT]:[0-9a-f-]{8,}|0900000001/;
const CAM_KHOA = /"(tongTien|total|price|gia|ghiChu|customerNote|paymentNote|nguoiLap|staffName|nguoiPhuTrach|handler|soGiayTo|documentNumber|issuedPlace|hetHan|expiryDate|placeKey|khoaNoi\w*|staffId|sdt(?!LienHe)\w*)"\s*:/;

/** `lienHe`: khoá liên hệ có mặt không; `ten`: suất có họ tên + năm sinh không (tên gắn vào suất lúc XẾP có chọn người, hoặc lúc XUẤT BẾN — I19b). */
const ghim = (j: any, v: { lienHe: boolean; ten: boolean }) => {
  assert.deepEqual(Object.keys(j).sort(), v.lienHe ? [...KHOA_GOC, "lienHe"].sort() : KHOA_GOC);
  assert.deepEqual(Object.keys(j.chuyen).sort(), KHOA_CHUYEN);
  for (const d of j.diem) assert.deepEqual(Object.keys(d).sort(), KHOA_DIEM);
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
    ghim(r.json, { lienHe: false, ten: false });
    assert.doesNotMatch(r.text, /Dò Tìm \d|0912345678|Khách Liên Hệ/, "không tên khách, không liên hệ");
    assert.doesNotMatch(r.text, CAM);
    assert.doesNotMatch(r.text, CAM_KHOA);
  } finally {
    tat();
  }
});

test("TC-39: TRONG ngày chạy — GET chi tiết có lienHe (maDon, tenLienHe, sdtLienHe) và hoTen / namSinh của suất đã gắn tên (sau xuất bến — I19b); vẫn không tiền / ghi chú / số giấy tờ; phản hồi LỆNH TIẾN ĐỘ không kèm lienHe, không kèm tên (chỉ hai GET trả tên)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    const r = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER });
    assert.equal(r.json.trongNgayChay, true);
    ghim(r.json, { lienHe: true, ten: false }); // xếp theo số người: suất CHƯA gắn tên tới lúc xuất bến
    assert.deepEqual(r.json.lienHe, [{ maDon: a.don.code, tenLienHe: "Khách Liên Hệ Dò Tìm", sdtLienHe: "0912345678" }]);
    for (const x of r.json.lienHe) assert.deepEqual(Object.keys(x).sort(), ["maDon", "sdtLienHe", "tenLienHe"]);
    assert.doesNotMatch(r.text, CAM);
    assert.doesNotMatch(r.text, CAM_KHOA);
    denGio("12:40");
    const x = await tienDo(w, "tai-xe", a.id, "xuat-ben");
    assert.equal(x.status, 200);
    assert.equal("lienHe" in x.json, false, "lienHe CHỈ ở GET chi tiết (kế hoạch mục 1.6)");
    ghim(x.json, { lienHe: false, ten: false }); // tên CHỈ ở GET /cuoc-cua-toi/:id (TC-39)
    const sau = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER });
    ghim(sau.json, { lienHe: true, ten: true });
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
    ghim(r.json, { lienHe: true, ten: true });
    await tienDo(w, "tai-xe", a.id, "ket-thuc-gian-doan", { lyDo: "GIAN_DOAN_KHAC" });
    const sau = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER });
    assert.equal(sau.json.trongNgayChay, false);
    assert.equal("lienHe" in sau.json, false);
    void NGAY;
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
