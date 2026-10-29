import { test } from "node:test";
import assert from "node:assert/strict";
import type { CocListResponse } from "./contracts.ts";
import { NGAY_NHAC_DUYET_HIEN_THI, NGAY_NHAC_HAN_HIEN_THI, coKhoiThuTruoc, danhSachThuTruoc, dongThuTruoc } from "./thu-truoc-hien-thi.ts";
import type { PermissionCode } from "./permissions.ts";
import { addDays } from "./vn-date.ts";
import { nhacCoc, type SoTienCoc } from "../modules/billing/rules.ts";

const who = (...permissions: PermissionCode[]) => ({ id: "w", permissions });

test("số ngày nhắc của chữ giao diện khớp luật nhắc của máy chủ (nhacCoc): hạn ≤ 10 ngày, duyệt quá 7 ngày", () => {
  const homNay = "2026-11-01";
  const coc = { conGiu: 500_000 } as SoTienCoc;
  const sap = (han: string) => nhacCoc({ nhom: "KHACH_HUY", han, homNay, coc, khoanChuaChi: [] }).sapHetHan;
  assert.equal(sap(addDays(homNay, NGAY_NHAC_HAN_HIEN_THI)), true);
  assert.equal(sap(addDays(homNay, NGAY_NHAC_HAN_HIEN_THI + 1)), false);
  const qua = (ngayDuyet: string) => nhacCoc({ nhom: "KHACH_HUY", han: "2027-01-09", homNay, coc, khoanChuaChi: [{ approvedDate: ngayDuyet, conLai: 1 }] }).duyetQua7Ngay;
  assert.equal(qua(addDays(homNay, -NGAY_NHAC_DUYET_HIEN_THI)), 0, "đúng 7 ngày chưa nhắc");
  assert.equal(qua(addDays(homNay, -NGAY_NHAC_DUYET_HIEN_THI - 1)), 1);
});

test("dongThuTruoc: mỗi số > 0 một dòng, thứ tự chờ chi → sắp hết hạn → người chưa nộp; dùng chữ «thu trước», không «cọc»", () => {
  const rows = dongThuTruoc({ canChi: 2, qua7Ngay: 1, sapHetHan: 1, conNguoiGiu: 3 });
  assert.deepEqual(rows, [
    { khoa: "canChi", tieuDe: "2 khoản thu trước đã duyệt, chờ chi", phu: "1 khoản đã duyệt quá 7 ngày · Mở đơn rồi bấm “Ghi chi hoàn” hoặc “Chuyển tiền sang đơn mới”" },
    { khoa: "sapHetHan", tieuDe: "1 đơn huỷ sắp hết hạn hoàn thu trước", phu: "Còn 10 ngày trở xuống · công ty định hoàn thì báo Quản trị duyệt trước hạn" },
    { khoa: "conNguoiGiu", tieuDe: "3 đơn huỷ còn người chưa nộp tiền", phu: "Thu trước của đơn huỷ là tiền công ty · nhắc người giữ nộp về" },
  ]);
  assert.deepEqual(dongThuTruoc({ canChi: 1, qua7Ngay: 0, sapHetHan: 0, conNguoiGiu: 0 }), [
    { khoa: "canChi", tieuDe: "1 khoản thu trước đã duyệt, chờ chi", phu: "Mở đơn rồi bấm “Ghi chi hoàn” hoặc “Chuyển tiền sang đơn mới”" },
  ]);
  assert.deepEqual(dongThuTruoc({ canChi: 0, qua7Ngay: 0, sapHetHan: 0, conNguoiGiu: 0 }), []);
  for (const r of rows) assert.ok(!/cọc/i.test(r.tieuDe + r.phu), r.tieuDe);
});

const ds = (o: Partial<CocListResponse> = {}): CocListResponse => ({ canChi: [], donHuyGiuCoc: [], conNguoiGiu: [], doiChieu: [], ...o });
const FMT = { tien: (n: number) => `${n}đ`, ngay: (iso: string) => `[${iso}]` };

test("danhSachThuTruoc: chờ chi (hoàn / chuyển) → đơn sắp hết hạn → người chưa nộp; đơn giữ tiền CHƯA sắp hết hạn không vào; khoản quá 7 ngày có cảnh báo", () => {
  const out = danhSachThuTruoc(ds({
    canChi: [
      { duyetId: "d1", orderId: "o1", maDon: "TD-1", loai: "hoan", conLai: 200_000, ngayDuyet: "2026-10-25", qua7Ngay: false, donNhan: null },
      { duyetId: "d2", orderId: "o2", maDon: "TD-2", loai: "chuyen", conLai: 300_000, ngayDuyet: "2026-10-01", qua7Ngay: true, donNhan: "TD-9" },
    ],
    donHuyGiuCoc: [
      { orderId: "o3", maDon: "TD-3", nhom: "KHACH_HUY", nhomNhan: "Khách huỷ", conGiu: 500_000, han: "2026-11-05", sapHetHan: true, legacy: false },
      { orderId: "o4", maDon: "TD-4", nhom: "KHACH_HUY", nhomNhan: "Khách huỷ", conGiu: 100_000, han: "2027-01-09", sapHetHan: false, legacy: false },
    ],
    conNguoiGiu: [{ orderId: "o5", maDon: "TD-5", nguoi: "Nam HDV", soTien: 500_000 }],
    doiChieu: [{ receiptId: "r1", orderId: "o6", maDon: "TD-6", soTien: 1, ngayKhai: "2026-10-01", qua3Ngay: true, loai: "cong_ty", benKia: null }],
  }), FMT);
  assert.deepEqual(out, [
    { orderId: "o1", maDon: "TD-1", chu: "chờ chi hoàn 200000đ · duyệt ngày [2026-10-25]", canhBao: null },
    { orderId: "o2", maDon: "TD-2", chu: "chờ chuyển 300000đ sang TD-9 · duyệt ngày [2026-10-01]", canhBao: "quá 7 ngày" },
    { orderId: "o3", maDon: "TD-3", chu: "công ty còn giữ 500000đ · hạn hoàn [2026-11-05]", canhBao: "sắp hết hạn" },
    { orderId: "o5", maDon: "TD-5", chu: "Nam HDV chưa nộp 500000đ", canhBao: null },
  ], "khoản đang đối chiếu thuộc khối «Chờ đối chiếu», không lặp ở đây");
  assert.deepEqual(danhSachThuTruoc(ds(), FMT), []);
});

test("coKhoiThuTruoc: chỉ ô ledger.view any (Kế toán, Toàn quyền), không tài khoản giữ quyền Đối tác (khối có tên người giữ tiền — R-91)", () => {
  assert.equal(coKhoiThuTruoc(who("ACCOUNTING")), true);
  assert.equal(coKhoiThuTruoc(who("SUPER_ADMIN")), true);
  for (const w of [who("ADMIN"), who("SALES"), who("FIELD"), who("PARTNER"), who("HR"), who("ACCOUNTING", "PARTNER")]) assert.equal(coKhoiThuTruoc(w), false, w.permissions.join("+"));
  assert.equal(coKhoiThuTruoc(null), false);
});
