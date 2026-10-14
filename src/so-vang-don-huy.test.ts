// Sổ vàng golden/don-huy-coc.json (Hiến chương 5.17; ADR-0089; kế hoạch Đợt 1 Task 1–2). Bài riêng như src/so-vang-chi-phi-xe.test.ts (khuôn khác sổ công nợ
// lượt 1): LỚP 1 tự cân mọi ca (bắt CA MẪU viết sai); LỚP 2 chạy chuỗi sự kiện qua CHÍNH luật thuần `src/modules/billing/rules.ts` + `src/shared/ly-do-huy.ts`
// + `src/shared/nhan-tien.ts` — CHỈ ca "da_xac_nhan" được tính đạt (chưa có ca nào ⇒ `todo`, không "xanh vì rỗng"); ca chờ xác nhận chỉ in chẩn đoán
// "khớp / lệch mã" để người soạn thấy sớm, KHÔNG được đếm. Ca chỉ đổi sang "da_xac_nhan" khi Kế toán / chủ dự án xác nhận (Hiến pháp N8).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isISODate } from "./shared/vn-date.ts";
import { docLyDoHuy } from "./shared/ly-do-huy.ts";
import { nhanTienDaTra } from "./shared/nhan-tien.ts";
import {
  canDoiChieu, conLai, conLaiCuaKhoan, hanHoanCoc, hieuLuc, kiemBatBien, kiemChi, kiemDuyet, kiemGhiHoanNgoai, kiemHuyDuyet, kiemXacNhanHoanNgoai, hoanNgoaiTrangThai,
  sinhDongDao, sinhDongHoanKhach, sinhDongLanThu, sinhDongXacNhanCongTy, soDuTheoBen, soTienCoc, type DoiChieuRow, type DuyetRow, type HoanNgoaiRow, type KiemCoc, type LineRow,
  type NhomHuy, type ReceiptRow,
} from "./modules/billing/rules.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const CONG_TY = "Tour Đảo";
/** Người giữ ô `order.cancel.classify` / `deposit.refund.approve` trong ca mẫu (Quản trị, Toàn quyền, tài khoản kiêm Quản trị + Kế toán). */
const CO_O_QUAN_TRI = new Set(["Quản Trị", "Toàn Quyền", "Kiêm Hai Việc"]);

type SuKien = { loai: string; ky_vong_loi?: string; [k: string]: unknown };
type DapAn = {
  da_tra: number; dang_doi_chieu: number; con_lai: number; cho_hoan_mac_dinh: number; hoan_truoc_huy: number; da_duyet: number; da_chi: number; da_chuyen: number;
  hoan_ngoai: number; con_giu: number; cho_chi: number; han: string; nhan: string; nhan_phu: string | null; so_du: Record<string, number>;
  don_nhan?: { da_tra: number; so_du: Record<string, number> };
};
type Ca = {
  ma: string;
  xac_nhan: { trang_thai: string; nguoi: string | null; ngay: string | null };
  dau_vao: { phai_thu: number; ngay_di: (string | null)[]; hom_nay: string; su_kien: SuKien[] };
  dap_an: DapAn;
};
const LOAI = new Set(["thu", "xac_nhan_cong_ty", "hoan_tu_do", "huy", "phan_loai", "duyet", "huy_duyet", "chi", "chuyen", "ghi_hoan_ngoai", "xac_nhan_hoan_ngoai", "dao_thu", "chup"]);
const LOI = new Set(["coc_deadline", "coc_exceeds_paid", "coc_exceeds_approved", "coc_same_person", "coc_unclassified", "coc_outside_once", "coc_paid_below_approved", "forbidden"]);
const dongTien = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;
const cong60 = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) + 60 * 86_400_000).toISOString().slice(0, 10);
const load = (): Ca[] => (JSON.parse(readFileSync(join(ROOT, "golden/don-huy-coc.json"), "utf8")) as { cac_ca: Ca[] }).cac_ca;

test("sổ vàng golden/don-huy-coc.json LỚP 1: đủ 13 ca, mã không trùng, số nguyên đồng, sự kiện đúng loại, mỗi ca tự cân (còn lại 0, còn giữ, chờ chi, bất biến đ15, hạn)", () => {
  const cases = load();
  assert.ok(cases.length >= 13, "chống rỗng: ≥ 13 ca (kế hoạch §1.8)");
  const seen = new Set<string>();
  for (const c of cases) {
    assert.ok(!seen.has(c.ma), `mã trùng: ${c.ma}`);
    seen.add(c.ma);
    assert.ok(["cho_xac_nhan", "da_xac_nhan"].includes(c.xac_nhan.trang_thai), c.ma);
    if (c.xac_nhan.trang_thai === "da_xac_nhan") assert.ok(c.xac_nhan.nguoi && c.xac_nhan.ngay && isISODate(c.xac_nhan.ngay), `${c.ma}: ca đã xác nhận phải ghi người + ngày`);
    assert.ok(dongTien(c.dau_vao.phai_thu) && isISODate(c.dau_vao.hom_nay), c.ma);
    const huy = c.dau_vao.su_kien.filter((e) => e.loai === "huy" && !e.ky_vong_loi);
    assert.equal(huy.length, 1, `${c.ma}: đúng một lần huỷ thành công`);
    for (const e of c.dau_vao.su_kien) {
      assert.ok(LOAI.has(e.loai), `${c.ma}: loại sự kiện lạ ${e.loai}`);
      if ("so" in e) assert.ok(dongTien(e.so) && (e.so as number) > 0, `${c.ma}: số tiền sự kiện`);
      if (e.ky_vong_loi) assert.ok(LOI.has(e.ky_vong_loi), `${c.ma}: mã lỗi lạ ${e.ky_vong_loi}`);
    }
    const a = c.dap_an;
    for (const k of ["da_tra", "dang_doi_chieu", "hoan_truoc_huy", "da_duyet", "da_chi", "da_chuyen", "hoan_ngoai", "con_giu", "cho_chi"] as const) assert.ok(dongTien(a[k]), `${c.ma}: ${k}`);
    assert.equal(a.con_lai, 0, `${c.ma}: đơn huỷ — còn lại luôn 0 (đ1)`);
    assert.equal(a.cho_hoan_mac_dinh, 0, `${c.ma}: chờ hoàn mặc định 0 (đ1)`);
    assert.equal(a.con_giu, a.da_tra - a.hoan_truoc_huy - a.da_chi - a.da_chuyen, `${c.ma}: còn giữ = đã trả − hoàn trước huỷ − đã chi − đã chuyển`);
    assert.equal(a.cho_chi, a.da_duyet - a.da_chi - a.da_chuyen, `${c.ma}: chờ chi = đã duyệt − đã chi − đã chuyển`);
    assert.ok(a.da_chi + a.da_chuyen <= a.da_duyet && a.da_duyet <= a.da_tra - a.hoan_truoc_huy, `${c.ma}: đ15 chi + chuyển ≤ duyệt ≤ tiền còn giữ lúc huỷ`);
    assert.ok(a.hoan_ngoai <= a.da_chi && a.hoan_ngoai <= a.da_duyet, `${c.ma}: hoàn ngoài đã xác nhận tính trong cả duyệt lẫn chi (X-4)`);
    const ngay = c.dau_vao.ngay_di.filter((d): d is string => d !== null).sort();
    assert.equal(a.han, cong60(ngay.at(-1) ?? (huy[0]!.ngay as string)), `${c.ma}: hạn = ngày đi muộn nhất (không có thì ngày huỷ) + 60`);
  }
});

/** Chạy chuỗi sự kiện qua luật thuần thật. Trả đáp án tính được + danh sách lệch kỳ vọng lỗi từng bước (để LỚP 2 so). */
function chayTrenMa(c: Ca): { dap: DapAn; lech: string[] } {
  const receipts: ReceiptRow[] = [];
  const lines: LineRow[] = [];
  const duyet: DuyetRow[] = [];
  const hoanNgoai: HoanNgoaiRow[] = [];
  // ADR-0118 Điều 1: khoản "Công ty thu" do người không phải Kế toán khai ⇒ dấu DECLARED (không dòng giữ hộ); xác nhận ⇒ CONFIRMED.
  const doiChieu: DoiChieuRow[] = [];
  const thu: { receipt: ReceiptRow; dong: LineRow[] }[] = [];
  const nhan: { receipts: ReceiptRow[]; lines: LineRow[] } = { receipts: [], lines: [] };
  const lech: string[] = [];
  let k = 0;
  let nhom: NhomHuy | null = null;
  let ngayHuy = "";
  let legacy = false;
  const ghiDong = (ds: Omit<LineRow, "id" | "orderId" | "receiptId">[], receiptId: string | null = null, vao = lines) => {
    const moi = ds.map((d) => ({ ...d, id: `l${++k}`, orderId: "A", receiptId }));
    vao.push(...moi);
    return moi;
  };
  const coc = () => soTienCoc({ receipts, lines, duyet, hoanNgoai, doiChieu });
  const han = () => hanHoanCoc({ ngayDi: c.dau_vao.ngay_di, ngayHuy });
  const duyetGoc = () => duyet.filter((d) => d.voidsId === null);
  const soSanh = (e: SuKien, kq: KiemCoc): boolean => {
    const ma = kq.ok ? null : kq.ma;
    if ((e.ky_vong_loi ?? null) !== ma) lech.push(`${e.loai}: kỳ vọng ${e.ky_vong_loi ?? "được"}, mã trả ${ma ?? "được"}`);
    return kq.ok;
  };
  for (const e of c.dau_vao.su_kien) {
    if (e.loai === "thu") {
      const role = e.vai_nguoi_thu === "cong_ty" ? "COMPANY" : "STAFF";
      const r: ReceiptRow = { id: `r${++k}`, kind: "CUSTOMER_PAYMENT", amount: e.so as number, collectorRole: role, collectorPartyId: role === "COMPANY" ? CONG_TY : (e.nguoi_thu as string), reversesId: null };
      receipts.push(r);
      if (canDoiChieu({ kind: r.kind, collectorRole: role, nguoiGhiPartyId: e.nguoi_ghi as string, nguoiGhiLaKeToan: e.nguoi_ghi_la_ke_toan as boolean, congTyId: CONG_TY })) doiChieu.push({ receiptId: r.id, kind: "DECLARED" });
      thu.push({ receipt: r, dong: ghiDong(sinhDongLanThu({ kind: r.kind, amount: r.amount, collectorRole: role, collectorPartyId: r.collectorPartyId, nguoiGhiPartyId: e.nguoi_ghi as string, nguoiGhiLaKeToan: e.nguoi_ghi_la_ke_toan as boolean, congTyId: CONG_TY }), r.id) });
    } else if (e.loai === "xac_nhan_cong_ty") {
      const t = thu[(e.thu_so as number) - 1]!;
      if (t.dong.length === 0) doiChieu.push({ receiptId: t.receipt.id, kind: "CONFIRMED" }); // khoản mới: không dòng nợ nào
      for (const d of t.dong) ghiDong([sinhDongXacNhanCongTy(d)], d.receiptId); // khoản cũ: đảo dòng giữ hộ
    } else if (e.loai === "hoan_tu_do") {
      const tra = e.nguoi_tra as string;
      const r: ReceiptRow = { id: `r${++k}`, kind: "CUSTOMER_REFUND", amount: e.so as number, collectorRole: tra === CONG_TY ? "COMPANY" : "STAFF", collectorPartyId: tra, reversesId: null, approvalId: null };
      receipts.push(r);
      ghiDong(sinhDongHoanKhach({ nguoiTraPartyId: tra, congTyId: CONG_TY, so: r.amount }), r.id);
    } else if (e.loai === "huy") {
      const d = docLyDoHuy({ lyDo: e.ma === "LEGACY" ? "OTHER" : e.ma, ghiChu: "ghi chú ca mẫu" }, { coTheChonCongTy: CO_O_QUAN_TRI.has(e.nguoi as string) || e.nguoi === "he-thong" });
      if (soSanh(e, d.ok ? { ok: true } : { ok: false, ma: d.status === 403 ? "forbidden" : "invalid_input", cau: d.message })) {
        nhom = e.nhom as NhomHuy;
        ngayHuy = e.ngay as string;
        legacy = e.legacy === true;
      }
    } else if (e.loai === "phan_loai") {
      if (nhom === "CHUA_KET_LUAN" && CO_O_QUAN_TRI.has(e.nguoi as string)) nhom = e.nhom as NhomHuy;
      else lech.push("phan_loai: không phân loại được");
    } else if (e.loai === "duyet") {
      if (soSanh(e, kiemDuyet({ coc: coc(), nhom: nhom!, han: han(), homNay: e.ngay as string, soTien: e.so as number }))) {
        duyet.push({ id: `d${++k}`, kind: e.loai_duyet === "chuyen" ? "TRANSFER" : "REFUND", amount: e.so as number, voidsId: null, targetOrderId: (e.don_nhan as string) ?? null, createdBy: e.nguoi as string, approvedDate: e.ngay as string });
      }
    } else if (e.loai === "huy_duyet") {
      const g = duyetGoc()[(e.duyet_so as number) - 1]!;
      if (soSanh(e, kiemHuyDuyet({ conLaiKhoan: conLaiCuaKhoan(g.id, duyet, receipts), soTien: e.so as number }))) {
        duyet.push({ ...g, id: `d${++k}`, amount: e.so as number, voidsId: g.id, createdBy: e.nguoi as string });
      }
    } else if (e.loai === "chi" || e.loai === "chuyen") {
      const g = duyetGoc()[(e.duyet_so as number) - 1]!;
      const tra = (e.loai === "chi" ? e.nguoi_tra : e.nguoi_giu) as string;
      const dangGiu = tra === CONG_TY ? null : Math.max(0, soDuTheoBen(lines, CONG_TY).get(tra) ?? 0);
      if (soSanh(e, kiemChi({ conLaiKhoan: conLaiCuaKhoan(g.id, duyet, receipts), soTien: e.so as number, nguoiChi: e.nguoi as string, nguoiDuyet: g.createdBy, nguoiTraDangGiu: dangGiu }))) {
        const r: ReceiptRow = { id: `r${++k}`, kind: "CUSTOMER_REFUND", amount: e.so as number, collectorRole: tra === CONG_TY ? "COMPANY" : "STAFF", collectorPartyId: tra, reversesId: null, approvalId: g.id };
        receipts.push(r);
        ghiDong(sinhDongHoanKhach({ nguoiTraPartyId: tra, congTyId: CONG_TY, so: r.amount }), r.id);
        if (e.loai === "chuyen") {
          const vao: ReceiptRow = { id: `r${++k}`, kind: "CUSTOMER_PAYMENT", amount: r.amount, collectorRole: r.collectorRole, collectorPartyId: tra, reversesId: null };
          nhan.receipts.push(vao);
          ghiDong(sinhDongLanThu({ kind: "CUSTOMER_PAYMENT", amount: vao.amount, collectorRole: vao.collectorRole, collectorPartyId: tra, nguoiGhiPartyId: e.nguoi as string, nguoiGhiLaKeToan: true, congTyId: CONG_TY }), vao.id, nhan.lines);
        }
      }
    } else if (e.loai === "ghi_hoan_ngoai") {
      const dangHieuLuc = hoanNgoaiTrangThai(hoanNgoai).dangHieuLuc.length > 0;
      if (soSanh(e, kiemGhiHoanNgoai({ legacy, coDongHieuLuc: dangHieuLuc, coc: coc(), soTien: e.so as number }))) {
        hoanNgoai.push({ id: `h${++k}`, kind: "RECORD", amount: e.so as number, targetId: null, createdBy: e.nguoi as string });
      }
    } else if (e.loai === "xac_nhan_hoan_ngoai") {
      const ghi = hoanNgoaiTrangThai(hoanNgoai).dangHieuLuc.find((r) => !hoanNgoai.some((x) => x.kind === "CONFIRM" && x.targetId === r.id))!;
      if (soSanh(e, kiemXacNhanHoanNgoai({ nguoiXacNhan: e.nguoi as string, nguoiGhi: ghi.createdBy, xacNhan: true, coc: coc(), soTien: ghi.amount ?? 0 }))) {
        hoanNgoai.push({ id: `h${++k}`, kind: "CONFIRM", amount: null, targetId: ghi.id, createdBy: e.nguoi as string });
      }
    } else if (e.loai === "dao_thu") {
      const goc = thu[(e.thu_so as number) - 1]!;
      const dao: ReceiptRow = { ...goc.receipt, id: `r${++k}`, reversesId: goc.receipt.id };
      const sau = soTienCoc({ receipts: [...receipts, dao], lines, duyet, hoanNgoai, doiChieu });
      if (soSanh(e, kiemBatBien(sau))) {
        receipts.push(dao);
        const conHieuLuc = goc.dong.filter((d) => !lines.some((x) => x.reversesLineId === d.id));
        ghiDong(conHieuLuc.map((d) => sinhDongDao(d)), dao.id);
      }
    } else if (e.loai === "chup") {
      const s = coc();
      const map: Record<string, number> = { da_tra: s.daTra, dang_doi_chieu: s.dangDoiChieu, con_giu: s.conGiu, da_duyet: s.daDuyet, da_chi: s.daChi };
      for (const [kk, v] of Object.entries(e)) if (kk !== "loai" && map[kk] !== v) lech.push(`chup.${kk}: kỳ vọng ${String(v)}, mã ${map[kk]}`);
    }
  }
  const s = coc();
  const so = conLai(receipts, c.dau_vao.phai_thu, "cancelled");
  const nh = nhanTienDaTra({ status: "cancelled", deliveredAt: null, nhom, han: han(), homNay: c.dau_vao.hom_nay });
  const soDu = soDuTheoBen(lines, CONG_TY);
  const dap: DapAn = {
    da_tra: s.daTra, dang_doi_chieu: s.dangDoiChieu, con_lai: so.conLai, cho_hoan_mac_dinh: so.du, hoan_truoc_huy: s.hoanTruocHuy, da_duyet: s.daDuyet, da_chi: s.daChi,
    da_chuyen: s.daChuyen, hoan_ngoai: s.hoanNgoai, con_giu: s.conGiu, cho_chi: s.choChi, han: han(), nhan: nh.nhan, nhan_phu: nh.phu,
    so_du: Object.fromEntries(Object.keys(c.dap_an.so_du).map((b) => [b, soDu.get(b) ?? 0])),
  };
  if (c.dap_an.don_nhan) {
    const sdB = soDuTheoBen(nhan.lines, CONG_TY);
    dap.don_nhan = { da_tra: hieuLuc(nhan.receipts).reduce((t, r) => t + r.amount, 0), so_du: Object.fromEntries(Object.keys(c.dap_an.don_nhan.so_du).map((b) => [b, sdB.get(b) ?? 0])) };
  }
  return { dap, lech };
}

test("sổ vàng golden/don-huy-coc.json LỚP 2 (mã thật): ca ĐÃ XÁC NHẬN khớp từng đồng + đúng mã lỗi từng bước; ca chờ xác nhận chỉ chẩn đoán, không tính đạt", (t) => {
  let daChay = 0;
  const cho: string[] = [];
  const chanDoan: string[] = [];
  for (const c of load()) {
    const { dap, lech } = chayTrenMa(c);
    if (c.xac_nhan.trang_thai !== "da_xac_nhan") {
      cho.push(c.ma);
      const khac = Object.keys(c.dap_an).filter((k) => JSON.stringify((dap as Record<string, unknown>)[k]) !== JSON.stringify((c.dap_an as Record<string, unknown>)[k]));
      chanDoan.push(`${c.ma}: ${khac.length || lech.length ? `LỆCH mã (${[...khac, ...lech].join("; ")})` : "khớp mã"}`);
      continue;
    }
    assert.deepEqual(lech, [], `${c.ma}: mã lỗi từng bước (mã thật)`);
    assert.deepEqual(dap, c.dap_an, `${c.ma}: đáp án (mã thật)`);
    daChay++;
  }
  t.diagnostic(`đơn huỷ — đã chạy trên mã thật: ${daChay} ca đã xác nhận; chờ xác nhận: ${cho.length} (${chanDoan.join(" | ")})`);
  console.log(`sổ vàng đơn huỷ lớp 2: đã chạy ${daChay}; chờ xác nhận ${cho.length}: ${chanDoan.join(" | ")}`);
  if (daChay === 0) t.todo("chưa có ca đơn huỷ nào được Kế toán / chủ dự án xác nhận — mã tiền đơn huỷ CHƯA được phát hành theo sổ vàng (kế hoạch Task 1)");
});
