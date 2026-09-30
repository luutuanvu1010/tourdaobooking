// Sổ vàng (Hiến chương kiến trúc lõi điều 5.17, chủ dự án duyệt 2026-09-26): kiểm NHẤT QUÁN NỘI TẠI của từng ca tiền mẫu trong `golden/*.json` —
// mỗi ca phải tự cân đến từng đồng trước khi dùng để chấm mã thật. Test này bắt CA MẪU VIẾT SAI, không kiểm mã tính tiền (sổ công nợ chưa có —
// khi thi công ADR-0026, thêm lớp chạy chính các ca này qua hàm sinh dòng sổ thật, chỉ tính ca "da_xac_nhan"). Ca chỉ được đổi sang "da_xac_nhan"
// khi chủ dự án hoặc Kế toán đã xem con số (Hiến pháp N8: AI không tự xác nhận) — test đòi ghi người + ngày.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isISODate } from "./shared/vn-date.ts";
import {
  conLai, lyDoChuaGiaoDuoc, sinhDongDao, sinhDongHoanKhach, sinhDongLanThu, sinhDongQuyetToan, sinhDongXacNhanCongTy, soDuTheoBen, type CollectorRole, type LineRow,
  type ReceiptRow,
} from "./modules/billing/rules.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const FILES = ["golden/hoan-tat-cong-no.json"];
const VAI = new Set(["hdv_noi_bo", "nguoi_huong", "nha_cung_cap"]);
const TRANG_THAI = new Set(["cho_xac_nhan", "da_xac_nhan"]);

type Ben = { ben: string; vai: string; da_thu: number; duoc_huong: number };
type Ca = {
  ma: string;
  xac_nhan: { trang_thai: string; nguoi: string | null; ngay: string | null };
  dau_vao: { gia_ban: number; gia_von: number; hoa_hong: number; cong_ty_thu: number; cac_ben: Ben[] };
  dap_an: { no_tour_dao: Record<string, number>; tour_dao_giu: number };
};

const dong = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function loadCases(file: string): Ca[] {
  const raw = JSON.parse(readFileSync(join(ROOT, file), "utf8")) as { cac_ca?: unknown };
  assert.ok(Array.isArray(raw.cac_ca) && raw.cac_ca.length > 0, `${file} phải có mảng "cac_ca" không rỗng`);
  return raw.cac_ca as Ca[];
}

for (const file of FILES) {
  test(`sổ vàng ${file}: mỗi ca đủ trường, tiền là số nguyên đồng không âm, mã không trùng, xác nhận có người + ngày`, () => {
    const seen = new Set<string>();
    for (const c of loadCases(file)) {
      assert.ok(typeof c.ma === "string" && c.ma !== "" && !seen.has(c.ma), `mã ca trống hoặc trùng: ${String(c.ma)}`);
      seen.add(c.ma);
      assert.ok(TRANG_THAI.has(c.xac_nhan?.trang_thai), `${c.ma}: xac_nhan.trang_thai phải là cho_xac_nhan | da_xac_nhan`);
      if (c.xac_nhan.trang_thai === "da_xac_nhan") {
        assert.ok(typeof c.xac_nhan.nguoi === "string" && c.xac_nhan.nguoi.trim() !== "", `${c.ma}: ca đã xác nhận phải ghi người xác nhận (chủ dự án / Kế toán)`);
        assert.ok(typeof c.xac_nhan.ngay === "string" && isISODate(c.xac_nhan.ngay), `${c.ma}: ca đã xác nhận phải ghi ngày YYYY-MM-DD`);
      }
      const v = c.dau_vao;
      for (const k of ["gia_ban", "gia_von", "hoa_hong", "cong_ty_thu"] as const) assert.ok(dong(v[k]), `${c.ma}: dau_vao.${k} phải là số nguyên đồng ≥ 0`);
      assert.ok(Array.isArray(v.cac_ben) && v.cac_ben.length > 0, `${c.ma}: cần ít nhất một bên`);
      for (const b of v.cac_ben) {
        assert.ok(VAI.has(b.vai), `${c.ma}/${b.ben}: vai "${b.vai}" không hợp lệ`);
        assert.ok(dong(b.da_thu) && dong(b.duoc_huong), `${c.ma}/${b.ben}: da_thu, duoc_huong phải là số nguyên đồng ≥ 0`);
        if (b.vai === "hdv_noi_bo") assert.equal(b.duoc_huong, 0, `${c.ma}/${b.ben}: HDV nội bộ không hưởng hoa hồng/giá vốn`);
      }
      assert.ok(Number.isInteger(c.dap_an?.tour_dao_giu), `${c.ma}: dap_an.tour_dao_giu phải là số nguyên đồng`);
    }
  });

  test(`sổ vàng ${file}: mỗi ca tự cân đến từng đồng`, () => {
    for (const c of loadCases(file)) {
      const v = c.dau_vao;
      const ben = v.cac_ben;
      assert.equal(v.cong_ty_thu + sum(ben.map((b) => b.da_thu)), v.gia_ban, `${c.ma}: tổng tiền đã thu (công ty + các bên) phải bằng giá bán`);
      assert.equal(sum(ben.filter((b) => b.vai === "nguoi_huong").map((b) => b.duoc_huong)), v.hoa_hong, `${c.ma}: tổng phần người hưởng được hưởng phải bằng hoa_hong`);
      assert.equal(sum(ben.filter((b) => b.vai === "nha_cung_cap").map((b) => b.duoc_huong)), v.gia_von, `${c.ma}: tổng phần nhà cung cấp được hưởng phải bằng gia_von`);
      assert.deepEqual(Object.keys(c.dap_an.no_tour_dao).sort(), ben.map((b) => b.ben).sort(), `${c.ma}: dap_an.no_tour_dao phải có đúng các bên của đầu vào`);
      for (const b of ben) {
        assert.equal(c.dap_an.no_tour_dao[b.ben], b.da_thu - b.duoc_huong, `${c.ma}/${b.ben}: nợ Tour Đảo phải = đã thu − được hưởng (${b.da_thu} − ${b.duoc_huong})`);
      }
      const giu = v.cong_ty_thu + sum(Object.values(c.dap_an.no_tour_dao));
      assert.equal(c.dap_an.tour_dao_giu, giu, `${c.ma}: phần Tour Đảo giữ phải = công ty tự thu + tổng nợ các bên (${giu})`);
      assert.equal(c.dap_an.tour_dao_giu, v.gia_ban - v.gia_von - v.hoa_hong, `${c.ma}: phần Tour Đảo giữ phải = giá bán − giá vốn − hoa hồng`);
    }
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// LỚP 2 — CHẠY TRÊN MÃ THẬT (sổ tiền lượt 1, kế hoạch Task 5; NT-S7): ca tiền mẫu đi qua CHÍNH luật sinh dòng của `src/modules/billing/rules.ts`.
// CHỈ ca `da_xac_nhan` được tính "đạt"; ca `cho_xac_nhan` in "chưa áp dụng" và KHÔNG được đếm (R11 — không "xanh vì rỗng": đòi ≥ 2 ca đã xác nhận chạy).
// ---------------------------------------------------------------------------------------------------------------------
const CONG_TY = "Tour Đảo";
type SuKien =
  | { loai: "thu"; vai_nguoi_thu: "nhan_vien" | "cong_ty" | "chua_ro"; nguoi_thu: string | null; nguoi_ghi: string; nguoi_ghi_la_ke_toan: boolean; so: number }
  | { loai: "xac_nhan_cong_ty"; thu_so: number }
  | { loai: "nop"; ben: string; so: number }
  | { loai: "hoan"; nguoi_tra: string; so: number }
  | { loai: "dao_thu"; thu_so: number };
type CaSoCongNo = {
  ma: string;
  xac_nhan: { trang_thai: string; nguoi: string | null; ngay: string | null };
  dau_vao: { phai_thu: number; su_kien: SuKien[] };
  dap_an: { da_thu: number; con_lai: number; du: number; chua_ro: number; no_tour_dao: Record<string, number>; giao_duoc: boolean };
};

/** Chạy chuỗi sự kiện qua luật thật → đã thu / còn lại / dư / chưa rõ / số dư từng bên / đủ điều kiện tiền để Đã giao. */
function chayTrenMa(phaiThu: number, suKien: readonly SuKien[]) {
  const receipts: ReceiptRow[] = [];
  const lines: LineRow[] = [];
  const thu: { receipt: ReceiptRow; dong: LineRow[] }[] = [];
  let k = 0;
  const ghiDong = (ds: { debtorPartyId: string; creditorPartyId: string; amount: number; kind: LineRow["kind"]; reversesLineId: string | null }[], receiptId: string | null = null) => {
    const moi = ds.map((d) => ({ ...d, id: `l${++k}`, orderId: "o", receiptId }));
    lines.push(...moi);
    return moi;
  };
  const VAI: Record<string, CollectorRole> = { nhan_vien: "STAFF", cong_ty: "COMPANY", chua_ro: "UNKNOWN" };
  for (const e of suKien) {
    if (e.loai === "thu") {
      const role = VAI[e.vai_nguoi_thu]!;
      const r: ReceiptRow = { id: `r${++k}`, kind: "CUSTOMER_PAYMENT", amount: e.so, collectorRole: role, collectorPartyId: role === "UNKNOWN" ? null : role === "COMPANY" ? CONG_TY : e.nguoi_thu, reversesId: null };
      receipts.push(r);
      const dongMoi = ghiDong(sinhDongLanThu({ kind: r.kind, amount: r.amount, collectorRole: role, collectorPartyId: r.collectorPartyId, nguoiGhiPartyId: e.nguoi_ghi, nguoiGhiLaKeToan: e.nguoi_ghi_la_ke_toan, congTyId: CONG_TY }), r.id);
      thu.push({ receipt: r, dong: dongMoi });
    } else if (e.loai === "xac_nhan_cong_ty") {
      for (const d of thu[e.thu_so - 1]!.dong) ghiDong([sinhDongXacNhanCongTy(d)]);
    } else if (e.loai === "nop") {
      ghiDong(sinhDongQuyetToan({ nguoiNopPartyId: e.ben, congTyId: CONG_TY, phanBo: [{ orderId: "o", amount: e.so }] }));
    } else if (e.loai === "hoan") {
      receipts.push({ id: `r${++k}`, kind: "CUSTOMER_REFUND", amount: e.so, collectorRole: e.nguoi_tra === CONG_TY ? "COMPANY" : "STAFF", collectorPartyId: e.nguoi_tra, reversesId: null });
      ghiDong(sinhDongHoanKhach({ nguoiTraPartyId: e.nguoi_tra, congTyId: CONG_TY, so: e.so }));
    } else {
      const goc = thu[e.thu_so - 1]!;
      receipts.push({ ...goc.receipt, id: `r${++k}`, reversesId: goc.receipt.id });
      for (const d of goc.dong) ghiDong([sinhDongDao(d)]);
    }
  }
  const so = conLai(receipts, phaiThu);
  const ly = lyDoChuaGiaoDuoc({ status: "confirmed", deliveredAt: null, homNay: "2026-10-10", ngayDi: ["2026-10-10"], dichVuThieuNgay: [], coNguoiHuong: false, so });
  return { so, soDu: soDuTheoBen(lines, CONG_TY), giaoDuoc: ly === null };
}

const loadSoCongNo = (): CaSoCongNo[] => (JSON.parse(readFileSync(join(ROOT, "golden/so-cong-no-luot-1.json"), "utf8")) as { cac_ca: CaSoCongNo[] }).cac_ca;

test("sổ vàng golden/so-cong-no-luot-1.json: đủ trường, số nguyên đồng, mã không trùng, xác nhận có người + ngày; mỗi ca tự cân (còn lại / dư / Đã giao được)", () => {
  const seen = new Set<string>();
  const cases = loadSoCongNo();
  assert.ok(cases.length >= 4, "chống rỗng: ≥ 4 ca lượt 1");
  for (const c of cases) {
    assert.ok(!seen.has(c.ma), `mã trùng: ${c.ma}`);
    seen.add(c.ma);
    assert.ok(TRANG_THAI.has(c.xac_nhan.trang_thai), c.ma);
    if (c.xac_nhan.trang_thai === "da_xac_nhan") assert.ok(c.xac_nhan.nguoi && c.xac_nhan.ngay && isISODate(c.xac_nhan.ngay), `${c.ma}: ca đã xác nhận phải ghi người + ngày`);
    assert.ok(dong(c.dau_vao.phai_thu), c.ma);
    for (const e of c.dau_vao.su_kien) if ("so" in e) assert.ok(dong(e.so) && e.so > 0, `${c.ma}: số tiền sự kiện`);
    const a = c.dap_an;
    assert.equal(a.con_lai, Math.max(0, c.dau_vao.phai_thu - a.da_thu), `${c.ma}: còn lại = max(0, phải thu − đã thu)`);
    assert.equal(a.du, Math.max(0, a.da_thu - c.dau_vao.phai_thu), `${c.ma}: dư = max(0, đã thu − phải thu)`);
    assert.equal(a.giao_duoc, a.con_lai === 0 && a.du === 0 && a.chua_ro === 0, `${c.ma}: Đã giao được ⇔ không thiếu, không dư, không chưa rõ`);
  }
});

test("sổ vàng LỚP 2 (mã thật, src/modules/billing/rules.ts): ca ĐÃ XÁC NHẬN khớp đến từng đồng; ca chờ xác nhận 'chưa áp dụng' (không tính đạt)", (t) => {
  let daChay = 0;
  const choXacNhan: string[] = [];
  // (a) Ca lượt 1 của hoan-tat-cong-no.json: chỉ bên HDV nội bộ + công ty tự thu (người hưởng / nhà cung cấp là lượt 2 — bỏ qua).
  for (const c of loadCases("golden/hoan-tat-cong-no.json")) {
    const luot1 = c.dau_vao.cac_ben.every((b) => b.vai === "hdv_noi_bo") && c.dau_vao.hoa_hong === 0 && c.dau_vao.gia_von === 0;
    if (!luot1) continue;
    if (c.xac_nhan.trang_thai !== "da_xac_nhan") {
      choXacNhan.push(c.ma);
      continue;
    }
    const suKien: SuKien[] = [];
    if (c.dau_vao.cong_ty_thu > 0) suKien.push({ loai: "thu", vai_nguoi_thu: "cong_ty", nguoi_thu: CONG_TY, nguoi_ghi: "Kế toán", nguoi_ghi_la_ke_toan: true, so: c.dau_vao.cong_ty_thu });
    for (const b of c.dau_vao.cac_ben) if (b.da_thu > 0) suKien.push({ loai: "thu", vai_nguoi_thu: "nhan_vien", nguoi_thu: b.ben, nguoi_ghi: b.ben, nguoi_ghi_la_ke_toan: false, so: b.da_thu });
    const kq = chayTrenMa(c.dau_vao.gia_ban, suKien);
    for (const b of c.dau_vao.cac_ben) assert.equal(kq.soDu.get(b.ben) ?? 0, c.dap_an.no_tour_dao[b.ben], `${c.ma}/${b.ben}: nợ Tour Đảo (mã thật)`);
    assert.equal(kq.so.daThu, c.dau_vao.gia_ban, `${c.ma}: đã thu = giá bán`);
    assert.equal(c.dau_vao.cong_ty_thu + [...kq.soDu.values()].reduce((s, x) => s + x, 0), c.dap_an.tour_dao_giu, `${c.ma}: phần Tour Đảo giữ (mã thật)`);
    assert.ok(kq.giaoDuoc, `${c.ma}: đủ tiền để Đã giao`);
    daChay++;
  }
  // (b) Ca chuỗi sự kiện lượt 1.
  for (const c of loadSoCongNo()) {
    if (c.xac_nhan.trang_thai !== "da_xac_nhan") {
      choXacNhan.push(c.ma);
      continue;
    }
    const kq = chayTrenMa(c.dau_vao.phai_thu, c.dau_vao.su_kien);
    assert.deepEqual([kq.so.daThu, kq.so.conLai, kq.so.du, kq.so.chuaRo], [c.dap_an.da_thu, c.dap_an.con_lai, c.dap_an.du, c.dap_an.chua_ro], `${c.ma}: số tiền đơn (mã thật)`);
    for (const [ben, so] of Object.entries(c.dap_an.no_tour_dao)) assert.equal(kq.soDu.get(ben) ?? 0, so, `${c.ma}/${ben}: số dư (mã thật)`);
    assert.equal(kq.giaoDuoc, c.dap_an.giao_duoc, `${c.ma}: Đã giao được (mã thật)`);
    daChay++;
  }
  t.diagnostic(`đã chạy trên mã thật: ${daChay} ca đã xác nhận; chưa áp dụng: ${choXacNhan.length} ca chờ xác nhận (${choXacNhan.join(", ")})`);
  console.log(`sổ vàng lớp 2: đã chạy ${daChay} ca đã xác nhận; chưa áp dụng ${choXacNhan.length} ca chờ xác nhận (${choXacNhan.join(", ")})`);
  assert.ok(daChay >= 2, "chống 'xanh vì rỗng': phải có ≥ 2 ca đã xác nhận chạy trên mã thật (SV-HT-06, SV-HT-07)");
});
