// Sổ vàng golden/sua-so-khach-van-phong.json (Hiến chương 5.17; ADR-0063 D1 — gói A2). Khuôn src/so-vang-don-huy.test.ts:
//  LỚP 1 tự cân MỌI ca bằng số học viết tay (bắt CA MẪU viết sai — không gọi mã).
//  LỚP 2 chạy từng ca qua CHÍNH luật thật: bộ đọc thân văn phòng `docThanSuaSoKhach` (mã lý do → nhãn), `planMoneyEdit` (luật tiền chung HDV + văn phòng),
//  `effectiveSubtotal` / `effectiveMoney` (phải thu), `billing/rules.ts:conLai` (còn lại, dư chờ hoàn), `canhBaoGiamGiaVuot`, `doanSoKhach` + `ghepLyDo` (dòng nhật ký —
//  cùng cách `orders/index.ts:soanSuaSoKhach` ghép). CHỈ ca "da_xac_nhan" được tính đạt (chưa có ⇒ `todo`, không "xanh vì rỗng"); ca chờ xác nhận chỉ in chẩn đoán
//  "khớp / lệch mã". Hoa hồng PER_PAX (ADR-0077) CHỈ TRÊN GIẤY: mã `hoaHongDong` chưa thi công ⇒ lớp 2 bỏ qua phần đó, in "chưa chạy trên mã".
// Hành vi QUA ROUTE THẬT (cùng các con số SV-SK-02, 03, 04) đã khoá ở src/modules/orders/so-khach-van-phong-route.test.ts (TC4, TC8).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isISODate } from "./shared/vn-date.ts";
import { PAX_ORDER, type PaxCode, type PaxCounts } from "./shared/order-lines.ts";
import { MA_LY_DO_SUA_SO_KHACH, LY_DO_SUA_SO_KHACH, canhBaoGiamGiaVuot, docThanSuaSoKhach, type MaLyDoSuaSoKhach } from "./shared/so-khach-van-phong.ts";
import { doanSoKhach, ghepLyDo } from "./shared/tin-doi-don.ts";
import { effectiveMoney, effectiveSubtotal, planMoneyEdit, type SubtotalServiceInput } from "./modules/orders/money-adjustment.ts";
import { conLai, type ReceiptRow } from "./modules/billing/rules.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

type DichVu =
  | { id: string; ten: string; nguon: "danh_muc"; don_gia: Partial<Record<PaxCode, number>>; khach_truoc: PaxCounts }
  | { id: string; ten: string; nguon: "nhap_tay"; thanh_tien: number };
type Tien = { tam_tinh: number; phai_thu: number; con_lai: number; du: number };
type DapAn = {
  ghi_dong_dieu_chinh: boolean; truoc: Tien; sau: Tien; canh_bao_tong_am: boolean; nhat_ky: string | null;
  hoa_hong?: { truoc: number; sau: number; chay_tren_ma: boolean };
};
type Ca = {
  ma: string;
  xac_nhan: { trang_thai: string; nguoi: string | null; ngay: string | null };
  dau_vao: {
    dich_vu: DichVu[]; lan_sua_truoc: Record<string, PaxCounts> | null; giam_gia: number; da_thu: number;
    hoa_hong_chup?: { kieu: "PER_PAX"; muc: number };
    sua: { ly_do: MaLyDoSuaSoKhach; khach_sau: Record<string, PaxCounts> };
  };
  dap_an: DapAn;
};
const load = (): Ca[] => (JSON.parse(readFileSync(join(ROOT, "golden/sua-so-khach-van-phong.json"), "utf8")) as { cac_ca: Ca[] }).cac_ca;
const dong = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;
const laPax = (p: unknown): p is PaxCounts => !!p && typeof p === "object" && PAX_ORDER.every((c) => dong((p as Record<string, unknown>)[c]));
const nhanKhach = (c: PaxCode) => ({ adult: "người lớn", child: "trẻ em", senior: "người cao tuổi", infant: "em bé" })[c];

test("sổ vàng golden/sua-so-khach-van-phong.json LỚP 1: đủ ca bắt buộc, mã không trùng, số nguyên đồng, mỗi ca tự cân (tạm tính, phải thu, còn lại, dư, cảnh báo, nhật ký, hoa hồng)", () => {
  const cases = load();
  assert.ok(cases.length >= 7, "chống rỗng: ≥ 7 ca");
  const seen = new Set<string>();
  // Bộ ca bắt buộc của gói A2: giảm sau đã thu (dư), tăng khách, có nhập tay, tổng âm có cảnh báo, hoa hồng PER_PAX, y nguyên, sửa lần hai.
  const co = { du: false, tang: false, nhapTay: false, am: false, hoaHong: false, yNguyen: false, lanHai: false };
  for (const c of cases) {
    assert.ok(!seen.has(c.ma), `mã trùng: ${c.ma}`);
    seen.add(c.ma);
    assert.ok(["cho_xac_nhan", "da_xac_nhan"].includes(c.xac_nhan.trang_thai), c.ma);
    if (c.xac_nhan.trang_thai === "da_xac_nhan") assert.ok(c.xac_nhan.nguoi && c.xac_nhan.ngay && isISODate(c.xac_nhan.ngay), `${c.ma}: ca đã xác nhận phải ghi người + ngày`);
    const v = c.dau_vao, a = c.dap_an;
    assert.ok(MA_LY_DO_SUA_SO_KHACH.includes(v.sua.ly_do), `${c.ma}: mã lý do ngoài danh sách đóng`);
    assert.ok(dong(v.giam_gia) && dong(v.da_thu), `${c.ma}: giảm giá, đã thu`);
    const danhMuc = v.dich_vu.filter((d): d is Extract<DichVu, { nguon: "danh_muc" }> => d.nguon === "danh_muc");
    const nhapTay = v.dich_vu.filter((d): d is Extract<DichVu, { nguon: "nhap_tay" }> => d.nguon === "nhap_tay");
    assert.ok(danhMuc.length >= 1, `${c.ma}: có ít nhất một dịch vụ danh mục`);
    for (const d of danhMuc) {
      assert.ok(laPax(d.khach_truoc), `${c.ma}: khach_truoc`);
      for (const k of PAX_ORDER) {
        const gia = d.don_gia[k];
        if (gia === undefined) assert.equal(d.khach_truoc[k], 0, `${c.ma}: loại khách không có giá thì số lưu = 0`);
        else assert.ok(dong(gia) && gia > 0 && d.khach_truoc[k] > 0, `${c.ma}: loại khách có giá đã lưu ⇒ lúc xác nhận có khách (dòng giá tồn tại)`);
      }
      assert.ok(laPax(v.sua.khach_sau[d.id]), `${c.ma}: thân gửi đủ mọi dịch vụ danh mục`);
      for (const k of PAX_ORDER) if (d.don_gia[k] === undefined) assert.equal(v.sua.khach_sau[d.id]![k], 0, `${c.ma}: không thêm loại khách chưa có giá`);
    }
    for (const d of nhapTay) {
      assert.ok(dong(d.thanh_tien), `${c.ma}: thành tiền nhập tay`);
      assert.equal(v.sua.khach_sau[d.id], undefined, `${c.ma}: thân KHÔNG gửi dịch vụ nhập tay`);
    }
    const hienHanh = (id: string, goc: PaxCounts) => v.lan_sua_truoc?.[id] ?? goc;
    const tamTinh = (khach: (d: (typeof danhMuc)[number]) => PaxCounts) =>
      danhMuc.reduce((s, d) => s + PAX_ORDER.reduce((n, k) => n + (d.don_gia[k] ?? 0) * khach(d)[k], 0), 0) + nhapTay.reduce((s, d) => s + d.thanh_tien, 0);
    const tien = (tt: number): Tien => {
      const phaiThu = tt - v.giam_gia;
      return { tam_tinh: tt, phai_thu: phaiThu, con_lai: Math.max(0, phaiThu - v.da_thu), du: Math.max(0, v.da_thu - phaiThu) };
    };
    const ghi = danhMuc.some((d) => PAX_ORDER.some((k) => hienHanh(d.id, d.khach_truoc)[k] !== v.sua.khach_sau[d.id]![k]));
    assert.equal(a.ghi_dong_dieu_chinh, ghi, `${c.ma}: ghi dòng điều chỉnh ⇔ có số khách đổi so với HIỆN HÀNH`);
    assert.deepEqual(a.truoc, tien(tamTinh((d) => hienHanh(d.id, d.khach_truoc))), `${c.ma}: tiền TRƯỚC`);
    assert.deepEqual(a.sau, ghi ? tien(tamTinh((d) => v.sua.khach_sau[d.id]!)) : a.truoc, `${c.ma}: tiền SAU`);
    assert.equal(a.canh_bao_tong_am, a.sau.phai_thu < 0, `${c.ma}: cảnh báo ⇔ phải thu sau < 0`);
    if (!ghi) assert.equal(a.nhat_ky, null, `${c.ma}: không ghi thì không nhật ký`);
    else {
      const doan = danhMuc.flatMap((d) => {
        const t = hienHanh(d.id, d.khach_truoc), s = v.sua.khach_sau[d.id]!;
        const doi = PAX_ORDER.filter((k) => t[k] !== s[k]).map((k) => `${nhanKhach(k)} ${t[k]} → ${s[k]}`);
        return doi.length ? [`${d.ten}: ${doi.join(", ")}`] : [];
      });
      assert.equal(a.nhat_ky, `số khách: ${doan.join(" | ")} · lý do: ${LY_DO_SUA_SO_KHACH[v.sua.ly_do]}`, `${c.ma}: dòng nhật ký`);
      for (const d of nhapTay) assert.ok(!a.nhat_ky!.includes(d.ten), `${c.ma}: tên dịch vụ nhập tay không vào nhật ký`);
      assert.doesNotMatch(a.nhat_ky!, /\d{6,}/, `${c.ma}: nhật ký không chứa số tiền / dãy số dài`);
    }
    if (v.hoa_hong_chup) {
      assert.ok(a.hoa_hong && dong(v.hoa_hong_chup.muc), `${c.ma}: có mức chụp thì có đáp án hoa hồng`);
      const tinh = (p: PaxCounts) => v.hoa_hong_chup!.muc * (p.adult + p.child + p.senior);
      const d0 = danhMuc[0]!;
      assert.equal(a.hoa_hong!.truoc, tinh(hienHanh(d0.id, d0.khach_truoc)), `${c.ma}: hoa hồng trước = mức × (NL + TE + NCT), không đếm em bé`);
      assert.equal(a.hoa_hong!.sau, tinh(v.sua.khach_sau[d0.id]!), `${c.ma}: hoa hồng sau theo số khách MỚI, mức đã chụp`);
      co.hoaHong = true;
    }
    if (ghi && a.sau.du > 0 && v.da_thu > 0 && !a.canh_bao_tong_am) co.du = true;
    if (ghi && a.sau.tam_tinh > a.truoc.tam_tinh) co.tang = true;
    if (nhapTay.length) co.nhapTay = true;
    if (a.canh_bao_tong_am) co.am = true;
    if (!ghi) co.yNguyen = true;
    if (v.lan_sua_truoc) co.lanHai = true;
  }
  assert.deepEqual(co, { du: true, tang: true, nhapTay: true, am: true, hoaHong: true, yNguyen: true, lanHai: true }, "đủ bộ ca bắt buộc của gói A2");
});

/** Chạy một ca qua luật thật — đúng thứ tự route văn phòng: đọc thân (mã → nhãn) → planMoneyEdit → nhật ký; tiền đơn qua effectiveMoney + conLai. */
function chayTrenMa(c: Ca): DapAn | string {
  const v = c.dau_vao;
  const services: SubtotalServiceInput[] = v.dich_vu.map((d) =>
    d.nguon === "nhap_tay"
      ? { id: d.id, catalogCode: null, name: d.ten, unit: "manual", items: [{ paxCode: null, catalogPrice: null, unitPrice: d.thanh_tien, lineTotal: d.thanh_tien }] }
      : {
          id: d.id, catalogCode: "ZA1", name: d.ten, unit: "perPax",
          items: PAX_ORDER.filter((k) => d.don_gia[k] !== undefined).map((k) => ({ paxCode: k, catalogPrice: d.don_gia[k]!, unitPrice: d.don_gia[k]!, lineTotal: d.don_gia[k]! * d.khach_truoc[k] })),
        });
  const zero: PaxCounts = { adult: 0, child: 0, senior: 0, infant: 0 };
  const storedPax = new Map(v.dich_vu.map((d) => [d.id, d.nguon === "danh_muc" ? d.khach_truoc : zero] as const));
  const latestAfter = v.lan_sua_truoc ? Object.entries(v.lan_sua_truoc).map(([serviceId, pax]) => ({ serviceId, pax })) : null;
  const than = docThanSuaSoKhach({ lyDo: v.sua.ly_do, services: Object.entries(v.sua.khach_sau).map(([id, pax]) => ({ id, pax })) });
  if (!than.ok) return `thân bị từ chối: ${than.message}`;
  const plan = planMoneyEdit({ services, storedPax, latestAfter, body: { reason: than.nhan, services: than.services } });
  if (!plan.ok) return `planMoneyEdit từ chối: ${plan.message}`;
  const receipts: ReceiptRow[] = v.da_thu > 0 ? [{ id: "r1", kind: "CUSTOMER_PAYMENT", amount: v.da_thu, collectorRole: "COMPANY", collectorPartyId: "cong-ty", reversesId: null }] : [];
  const tien = (tt: number): Tien => {
    const phaiThu = effectiveMoney(tt, v.giam_gia).total;
    const s = conLai(receipts, phaiThu, "confirmed");
    return { tam_tinh: tt, phai_thu: phaiThu, con_lai: s.conLai, du: s.du };
  };
  const hienHanh = effectiveSubtotal(services, latestAfter ?? []);
  const truoc = tien(plan.write ? plan.subtotalBefore : hienHanh);
  const sau = plan.write ? tien(plan.subtotalAfter) : truoc;
  const dap: DapAn = {
    ghi_dong_dieu_chinh: plan.write,
    truoc,
    sau,
    canh_bao_tong_am: canhBaoGiamGiaVuot({ subtotal: sau.tam_tinh, discount: v.giam_gia }) !== null,
    nhat_ky: plan.write ? ghepLyDo(doanSoKhach(plan.before, plan.after, services), plan.reason) : null,
  };
  if (plan.write && plan.subtotalBefore !== hienHanh) return `subtotalBefore ${plan.subtotalBefore} ≠ tạm tính hiện hành ${hienHanh}`;
  // Hoa hồng (ADR-0077) chưa có mã — mang nguyên đáp án giấy sang để so phần TIỀN ĐƠN; lớp 2 không tính đạt phần này.
  if (c.dap_an.hoa_hong) dap.hoa_hong = c.dap_an.hoa_hong;
  return dap;
}

test("sổ vàng golden/sua-so-khach-van-phong.json LỚP 2 (mã thật): ca ĐÃ XÁC NHẬN khớp từng đồng; ca chờ xác nhận chỉ chẩn đoán; hoa hồng PER_PAX chưa chạy trên mã", (t) => {
  let daChay = 0;
  const cho: string[] = [];
  const chanDoan: string[] = [];
  const giay: string[] = [];
  for (const c of load()) {
    const dap = chayTrenMa(c);
    if (c.dap_an.hoa_hong && !c.dap_an.hoa_hong.chay_tren_ma) giay.push(c.ma);
    if (c.xac_nhan.trang_thai !== "da_xac_nhan") {
      cho.push(c.ma);
      if (typeof dap === "string") chanDoan.push(`${c.ma}: LỆCH mã (${dap})`);
      else {
        const khac = (Object.keys(c.dap_an) as (keyof DapAn)[]).filter((k) => JSON.stringify(dap[k]) !== JSON.stringify(c.dap_an[k]));
        chanDoan.push(`${c.ma}: ${khac.length ? `LỆCH mã (${khac.join(", ")})` : "khớp mã"}`);
      }
      continue;
    }
    assert.equal(typeof dap, "object", `${c.ma}: ${String(dap)}`);
    assert.deepEqual(dap, c.dap_an, `${c.ma}: đáp án (mã thật)`);
    daChay++;
  }
  t.diagnostic(`sửa số khách — đã chạy trên mã thật: ${daChay} ca đã xác nhận; chờ xác nhận: ${cho.length} (${chanDoan.join(" | ")}); hoa hồng chỉ trên giấy: ${giay.join(", ") || "không"}`);
  console.log(`sổ vàng sửa số khách lớp 2: đã chạy ${daChay}; chờ xác nhận ${cho.length}: ${chanDoan.join(" | ")}; hoa hồng chỉ trên giấy: ${giay.join(", ") || "không"}`);
  if (daChay === 0) t.todo("chưa có ca sửa số khách nào được Kế toán / chủ dự án xác nhận — đường văn phòng sửa số khách CHƯA được phát hành theo sổ vàng (Hiến chương 5.17)");
});
