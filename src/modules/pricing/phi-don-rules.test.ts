// Luật thuần của phí đưa đón (ADR-0147 Đ2, ADR-0203 ĐB1–ĐB2; kế hoạch Đợt B, Task 6). Bảng mẫu tự dựng, trừ bài «canhBaoCapCaoHon» và «vungThieuDongChung» dùng bảng của sổ vàng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  BO_TINH, KHOA_PHI_DON, canhBaoCapCaoHon, capCuaHoSoNgay, chonMucPhiDon, chuKyDieuKien, kiemThanMucPhiDon, tinhPhiChang, tinhPhiDonThuan, TRAN_MUC_PHI_DON, vungThieuDongChung,
  type ChangTinhPhi, type DieuKienPhiDon, type MucPhiDon,
} from "./phi-don-rules.ts";

const m = (id: string, dieuKien: DieuKienPhiDon, amount: number, o: { kind?: "PER_PAX" | "PER_TRIP"; tu?: string; den?: string | null } = {}): MucPhiDon => ({
  id, kind: o.kind ?? (dieuKien.EXCLUSIVE ? "PER_TRIP" : "PER_PAX"), amount, validFrom: o.tu ?? "2026-12-01", validTo: o.den === undefined ? null : o.den, dieuKien,
});
const chang = (o: Partial<ChangTinhPhi> = {}): ChangTinhPhi => ({ zoneCode: "CR", direction: "OUT", exclusive: false, catalogCode: null, groupCode: null, tierCode: null, ...o });
const NGAY = "2026-12-10";
const id = (r: ReturnType<typeof chonMucPhiDon>): string => (r.trangThai === "CO_MUC" ? r.muc.id : `${r.trangThai}/${r.lyDo}`);

test("thiếu mức không bao giờ là 0", () => {
  assert.deepEqual(chonMucPhiDon({ chang: chang(), ngay: NGAY, muc: [] }), { trangThai: "THIEU_MUC", lyDo: "KHONG_CO_MUC" });
  // vùng khác, hoặc cần cấp mà chặng không có cấp ⇒ vẫn thiếu, không bao giờ rơi về 0
  assert.equal(id(chonMucPhiDon({ chang: chang({ zoneCode: "TT" }), ngay: NGAY, muc: [m("A", { ZONE: "CR" }, 0)] })), "THIEU_MUC/KHONG_CO_MUC");
  assert.equal(id(chonMucPhiDon({ chang: chang(), ngay: NGAY, muc: [m("A", { ZONE: "CR", TIER: "C1" }, 0)] })), "THIEU_MUC/KHONG_CO_MUC");
});

test("dịch vụ thắng cấp, cấp thắng nhóm, nhóm thắng chiều, chiều thắng dòng chung", () => {
  const c = chang({ tierCode: "C1", catalogCode: "S1", groupCode: "G1" });
  const dv = m("DV", { ZONE: "CR", SERVICE: "S1" }, 1);
  const cap = m("CAP", { ZONE: "CR", TIER: "C1" }, 2);
  const nhom = m("NHOM", { ZONE: "CR", SERVICE_GROUP: "G1" }, 3);
  const chieu = m("CHIEU", { ZONE: "CR", DIRECTION: "OUT" }, 4);
  const chung = m("CHUNG", { ZONE: "CR" }, 5);
  const chon = (...muc: MucPhiDon[]) => id(chonMucPhiDon({ chang: c, ngay: NGAY, muc }));
  assert.equal(chon(cap, dv, nhom, chieu, chung), "DV");
  assert.equal(chon(chung, chieu, nhom, cap), "CAP");
  assert.equal(chon(chung, chieu, nhom), "NHOM");
  assert.equal(chon(chung, chieu), "CHIEU");
  assert.equal(chon(chung), "CHUNG");
});

test("dòng nêu cấp + nhóm thắng dòng chỉ nêu cấp", () => {
  const c = chang({ tierCode: "C1", groupCode: "G1" });
  const r = chonMucPhiDon({ chang: c, ngay: NGAY, muc: [m("CAP", { ZONE: "CR", TIER: "C1" }, 50), m("CAP_NHOM", { ZONE: "CR", TIER: "C1", SERVICE_GROUP: "G1" }, 40)] });
  assert.equal(id(r), "CAP_NHOM");
  assert.ok(r.trangThai === "CO_MUC" && r.thua.length === 1 && r.thua[0]!.muc.id === "CAP" && /thua vì/.test(r.thua[0]!.viSao) && /nhóm/.test(r.thua[0]!.viSao));
});

test("ngang bậc khác tiền là xung đột; cùng tiền lấy id nhỏ", () => {
  assert.deepEqual(chonMucPhiDon({ chang: chang(), ngay: NGAY, muc: [m("A", { ZONE: "CR", DIRECTION: "OUT" }, 1), m("B", { ZONE: "CR", DIRECTION: "OUT" }, 2)] }), { trangThai: "THIEU_MUC", lyDo: "XUNG_DOT" });
  // cấp (4) + chiều (1) = 5 ngang cấp (4) + chiều (1)? dùng cặp bậc bằng nhau khác khoá: nhóm (2) + chiều (1) = 3 với … không có; ép bằng hai dòng cùng khoá
  assert.equal(id(chonMucPhiDon({ chang: chang(), ngay: NGAY, muc: [m("B", { ZONE: "CR" }, 7), m("A", { ZONE: "CR" }, 7)] })), "A");
});

test("xe riêng chỉ khớp theo chuyến, đi chung chỉ khớp theo khách", () => {
  const pax = m("PAX", { ZONE: "CR", TIER: "C3" }, 50_000);
  const trip = m("TRIP", { ZONE: "CR", EXCLUSIVE: "1" }, 500_000);
  const c = chang({ tierCode: "C3", exclusive: true });
  assert.equal(id(chonMucPhiDon({ chang: c, ngay: NGAY, muc: [pax, trip] })), "TRIP");
  assert.equal(id(chonMucPhiDon({ chang: c, ngay: NGAY, muc: [pax] })), "THIEU_MUC/KHONG_CO_MUC");
  assert.equal(id(chonMucPhiDon({ chang: chang({ tierCode: "C3" }), ngay: NGAY, muc: [pax, trip] })), "PAX");
  assert.equal(id(chonMucPhiDon({ chang: chang({ tierCode: "C3" }), ngay: NGAY, muc: [trip] })), "THIEU_MUC/KHONG_CO_MUC");
});

test("hết hiệu lực thì không khớp (đúng ngày cuối còn khớp, hôm sau không)", () => {
  const muc = [m("A", { ZONE: "CR" }, 1, { tu: "2026-12-01", den: "2026-12-31" })];
  assert.equal(id(chonMucPhiDon({ chang: chang(), ngay: "2026-12-31", muc })), "A");
  assert.equal(id(chonMucPhiDon({ chang: chang(), ngay: "2027-01-01", muc })), "THIEU_MUC/KHONG_CO_MUC");
  assert.equal(id(chonMucPhiDon({ chang: chang(), ngay: "2026-11-30", muc })), "THIEU_MUC/KHONG_CO_MUC");
});

test("khoá lạ không có bộ tính thì dòng không bao giờ khớp; khoá giả truyền vào được tính", () => {
  const la = m("LA", { ZONE: "CR", MUA: "he" } as DieuKienPhiDon, 1);
  assert.equal(id(chonMucPhiDon({ chang: chang(), ngay: NGAY, muc: [la] })), "THIEU_MUC/KHONG_CO_MUC");
  const boTinh = { ...BO_TINH, MUA: { khop: (g: string) => g === "he", bac: 16 } };
  assert.equal(id(chonMucPhiDon({ chang: chang(), ngay: NGAY, muc: [la, m("C", { ZONE: "CR" }, 9)], boTinh })), "LA");
});

test("capCuaHoSoNgay", () => {
  const gan = [
    { roleTypeCode: "V1", tierCode: "C1", validFrom: "2026-01-01", validTo: null },
    { roleTypeCode: "V2", tierCode: "C3", validFrom: "2026-01-01", validTo: null },
  ];
  const base = { ngay: NGAY, gan, ganRieng: [] };
  assert.deepEqual(capCuaHoSoNgay({ ...base, partyId: null, vai: ["V1"] }), { loai: "KHONG_CAP" });
  assert.deepEqual(capCuaHoSoNgay({ ...base, partyId: "p", vai: ["V9"] }), { loai: "KHONG_CAP" });
  assert.deepEqual(capCuaHoSoNgay({ ...base, partyId: "p", vai: ["V1"] }), { loai: "CO_CAP", tierCode: "C1" });
  assert.deepEqual(capCuaHoSoNgay({ ...base, partyId: "p", vai: ["V1", "V2"] }), { loai: "HAI_CAP" });
  const rieng = { partyId: "p", tierCode: "C3", validFrom: "2026-06-01", validTo: null };
  assert.deepEqual(capCuaHoSoNgay({ ...base, partyId: "p", vai: ["V1", "V2"], ganRieng: [rieng] }), { loai: "CO_CAP", tierCode: "C3" });
  assert.deepEqual(capCuaHoSoNgay({ ...base, partyId: "p", vai: ["V1", "V2"], ganRieng: [{ ...rieng, validTo: "2026-12-09" }] }), { loai: "HAI_CAP" }, "cấp riêng hết hạn thì về cấp của vai");
  assert.deepEqual(capCuaHoSoNgay({ ...base, partyId: "p", vai: ["V1"], ganRieng: [{ ...rieng, partyId: "q" }] }), { loai: "CO_CAP", tierCode: "C1" }, "cấp riêng của hồ sơ khác không tính");
  assert.deepEqual(capCuaHoSoNgay({ ...base, partyId: "p", vai: ["V1", "V2"], gan: gan.map((g) => ({ ...g, tierCode: "C1" })) }), { loai: "CO_CAP", tierCode: "C1" }, "hai vai cùng một mã cấp là một cấp");
});

test("tinhPhiChang", () => {
  const pax = m("P", { ZONE: "CR" }, 30_000);
  assert.deepEqual(tinhPhiChang({ muc: pax, direction: "OUT", soKhachTinhTien: 2, paxOverride: null }), { donGia: 30_000, soLuong: 2, tien: 60_000 });
  assert.equal(tinhPhiChang({ muc: pax, direction: "RETURN", soKhachTinhTien: 2, paxOverride: 3 })!.soLuong, 2);
  assert.equal(tinhPhiChang({ muc: pax, direction: "RETURN", soKhachTinhTien: 3, paxOverride: 1 })!.soLuong, 1);
  assert.equal(tinhPhiChang({ muc: pax, direction: "OUT", soKhachTinhTien: 3, paxOverride: 1 })!.soLuong, 3, "paxOverride chỉ áp chiều về");
  assert.equal(tinhPhiChang({ muc: pax, direction: "OUT", soKhachTinhTien: 0, paxOverride: null }), null);
  assert.deepEqual(tinhPhiChang({ muc: m("T", { ZONE: "CR", EXCLUSIVE: "1" }, 500_000), direction: "OUT", soKhachTinhTien: 4, paxOverride: null }), { donGia: 500_000, soLuong: 1, tien: 500_000 });
  assert.deepEqual(tinhPhiChang({ muc: m("Z", { ZONE: "TT" }, 0), direction: "OUT", soKhachTinhTien: 2, paxOverride: null }), { donGia: 0, soLuong: 2, tien: 0 }, "miễn phí là dòng 0 đồng, vẫn ra dòng");
});

test("chuKyDieuKien", () => {
  assert.equal(chuKyDieuKien({ ZONE: "CR", TIER: "C1" }), "TIER=C1|ZONE=CR");
  assert.equal(chuKyDieuKien({ TIER: "C1", ZONE: "CR" }), "TIER=C1|ZONE=CR");
  assert.equal(chuKyDieuKien({ ZONE: "CR", SERVICE: "S", SERVICE_GROUP: undefined }), "SERVICE=S|ZONE=CR");
});

test("kiemThanMucPhiDon", () => {
  const biet = { vung: new Set(["TT", "CR"]), cap: new Set(["C1", "C3"]), nhom: new Set(["HT"]), dichVu: new Set(["S1"]) };
  const dung = { kind: "PER_PAX", amount: 30_000, validFrom: "2026-12-01", validTo: null, note: null, dieuKien: { ZONE: "CR", TIER: "C3", SERVICE_GROUP: "HT", DIRECTION: "OUT" } };
  const r = kiemThanMucPhiDon(dung, biet);
  assert.ok(r.ok && r.value.kind === "PER_PAX" && r.value.dieuKien.TIER === "C3" && r.value.validTo === null);
  const trip = kiemThanMucPhiDon({ ...dung, kind: "PER_TRIP", dieuKien: { ZONE: "CR", EXCLUSIVE: "1", SERVICE: "S1" } }, biet);
  assert.ok(trip.ok && trip.value.kind === "PER_TRIP");
  const sai = (b: unknown): boolean => !kiemThanMucPhiDon(b, biet).ok;
  const dk = (d: unknown) => ({ ...dung, dieuKien: d });
  assert.ok(sai(dk({ ZONE: "XX" })), "vùng không có");
  assert.ok(sai(dk({ ZONE: "CR", TIER: "C9" })), "cấp không có hoặc đã khoá");
  assert.ok(sai({ ...dung, kind: "PER_TRIP", dieuKien: { ZONE: "CR", EXCLUSIVE: "0" } }), "EXCLUSIVE=0");
  assert.ok(sai(dk({ ZONE: "CR", DIRECTION: "out" })), "chiều chữ thường");
  assert.ok(sai(dk([{ khoa: "ZONE", giaTri: "CR" }, { khoa: "ZONE", giaTri: "TT" }])), "khoá lặp hai lần");
  assert.ok(sai(dk({ ZONE: "CR", MUA: "he" })), "khoá lạ");
  assert.ok(sai(dk({ TIER: "C1" })), "thiếu ZONE");
  assert.ok(sai(dk({ ZONE: "CR", SERVICE: "S1", SERVICE_GROUP: "HT" })), "vừa dịch vụ vừa nhóm");
  assert.ok(sai({ ...dung, kind: "PER_TRIP" }), "theo chuyến mà không xe riêng");
  assert.ok(sai(dk({ ZONE: "CR", EXCLUSIVE: "1" })), "xe riêng mà kiểu theo khách");
  assert.ok(sai({ ...dung, amount: -1 }) && sai({ ...dung, amount: 1.5 }) && sai({ ...dung, amount: "5" }), "tiền âm / lẻ / chữ");
  assert.ok(sai({ ...dung, validFrom: "2026-13-40" }) && sai({ ...dung, validTo: "2026-11-30" }), "ngày sai, đến trước từ");
  assert.ok(sai(null) && sai([]) && sai("x") && sai({ ...dung, dieuKien: null }), "thân rỗng");
  assert.ok(sai(dk({ ZONE: "CR", SERVICE: "S9" })) && sai(dk({ ZONE: "CR", SERVICE_GROUP: "XX" })));
});

// Tiêu chí «khoá giả» (ADR-0147 Đ2 tiêu chí 6): thêm một khoá điều kiện = thêm MỘT mục vào danh sách đăng ký, không sửa hàm chọn mức, không sửa nơi gọi.
test("khoá giả: dòng mang khoá giả khớp qua boTinh và thắng đúng theo bậc đã khai, hàm chọn mức không đổi", () => {
  const c = chang({ tierCode: "C1", groupCode: "G1" });
  const mua = (bac: number) => ({ ...BO_TINH, MUA: { khop: (g: string) => g === "he", bac } });
  const la = m("LA", { ZONE: "CR", MUA: "he" } as DieuKienPhiDon, 1);
  const nhom = m("NHOM", { ZONE: "CR", SERVICE_GROUP: "G1" }, 2); // bậc 2
  const chieu = m("CHIEU", { ZONE: "CR", DIRECTION: "OUT" }, 3); // bậc 1
  const cap = m("CAP", { ZONE: "CR", TIER: "C1" }, 4); // bậc 4
  const chon = (bac: number, ...muc: MucPhiDon[]) => chonMucPhiDon({ chang: c, ngay: NGAY, muc, boTinh: mua(bac) });
  // bậc 3 > nhóm (2) và chiều (1) ⇒ khoá giả thắng; nhưng < cấp (4) ⇒ cấp thắng
  assert.equal(id(chon(3, la, nhom, chieu)), "LA");
  assert.equal(id(chon(3, la, nhom, chieu, cap)), "CAP");
  // bậc 1 (ngang chiều, thấp hơn nhóm) ⇒ thua nhóm
  assert.equal(id(chon(1, la, nhom)), "NHOM");
  // dòng thua có lý do bằng chữ, không văng lỗi dù khoá giả không có tên trong bảng tên khoá
  const r = chon(3, la, nhom);
  assert.ok(r.trangThai === "CO_MUC" && r.thua.length === 1 && /thua vì/.test(r.thua[0]!.viSao));
  // giá trị không khớp ⇒ dòng mang khoá giả KHÔNG áp; không truyền boTinh ⇒ khoá giả không bao giờ khớp (mặc định là BO_TINH thật)
  assert.equal(id(chonMucPhiDon({ chang: c, ngay: NGAY, muc: [m("LA2", { ZONE: "CR", MUA: "dong" } as DieuKienPhiDon, 1), cap], boTinh: mua(3) })), "CAP");
  assert.equal(id(chonMucPhiDon({ chang: c, ngay: NGAY, muc: [la] })), "THIEU_MUC/KHONG_CO_MUC");
});

test("khoá điều kiện chỉ được biết ở pricing: orders, van-chuyen, ve-dien-tu không chứa tên khoá, bảng khoá hay bộ tính", () => {
  const goc = new URL("../../modules/", import.meta.url);
  const tep = (dir: URL): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const u = new URL(e.name + (e.isDirectory() ? "/" : ""), dir);
    return e.isDirectory() ? tep(u) : /\.ts$/.test(e.name) && !/\.test\.ts$/.test(e.name) ? [u.pathname] : [];
  });
  const boChuThich = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  // Tên chỉ dùng cho điều kiện phí (không bao giờ có nghĩa khác): quét theo từ. SERVICE / TIER / DIRECTION có nghĩa khác ở chỗ khác (phạm vi xác nhận, chiều chặng): chỉ bắt khi dùng làm TÊN thuộc tính của bộ điều kiện.
  const rieng = /\b(ZONE|EXCLUSIVE|SERVICE_GROUP|KHOA_PHI_DON|BO_TINH|prc_transfer_fee\w*|loc_zone\w*|zone_code)\b/;
  const thuocTinh = /(?:\.|\{\s*|,\s*)(SERVICE|TIER|DIRECTION)\s*[:,}]|\b(SERVICE|TIER|DIRECTION)\s*:/;
  const loi: string[] = [];
  let soTep = 0;
  for (const mod of ["orders", "van-chuyen", "ve-dien-tu"]) {
    for (const f of tep(new URL(`${mod}/`, goc))) {
      soTep++;
      const src = boChuThich(readFileSync(f, "utf8"));
      const t = rieng.exec(src);
      if (t) loi.push(`${f.split("/modules/")[1]}: «${t[0]}»`);
      const p = thuocTinh.exec(src);
      if (p) loi.push(`${f.split("/modules/")[1]}: tên thuộc tính «${p[0].trim()}»`);
      // import vào pricing chỉ qua index (không chạm phi-don-rules / phi-don-repo)
      for (const im of src.matchAll(/from\s+["']([^"']*pricing[^"']*)["']/g)) if (!/\/pricing(\/index(\.ts)?)?$/.test(im[1]!)) loi.push(`${f.split("/modules/")[1]}: import «${im[1]}» không qua pricing/index`);
    }
  }
  assert.ok(soTep > 20, `quét thấy ${soTep} tệp — đường dẫn sai?`);
  assert.deepEqual(loi, []);
});

test("BO_TINH và KHOA_PHI_DON khớp bảng khoá của CSDL", () => {
  const db = new DatabaseSync(":memory:");
  const dir = new URL("../../../migrations/", import.meta.url);
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
  const codes = (db.prepare("SELECT code FROM prc_transfer_fee_key ORDER BY code").all() as { code: string }[]).map((r) => r.code);
  assert.deepEqual(Object.keys(BO_TINH).sort(), codes);
  assert.deepEqual([...KHOA_PHI_DON].sort(), codes);
});

// ---- bảng mẫu từ sổ vàng ----
type Muc = { id: string; kieu: "PER_PAX" | "PER_TRIP"; vung: string; cap: string | null; dich_vu: string | null; nhom: string | null; chieu: string | null; xe_rieng: boolean; tien: number; tu: string; den: string | null };
const vang = JSON.parse(readFileSync(new URL("../../../golden/phi-dua-don.json", import.meta.url), "utf8")) as { vung: Record<string, string>; dich_vu: Record<string, { nhom: string }>; bang_phi: Muc[] };
const bangVang = (): MucPhiDon[] => vang.bang_phi.map((x) => {
  const dieuKien: DieuKienPhiDon = { ZONE: x.vung };
  if (x.cap) dieuKien.TIER = x.cap;
  if (x.dich_vu) dieuKien.SERVICE = x.dich_vu;
  if (x.nhom) dieuKien.SERVICE_GROUP = x.nhom;
  if (x.chieu) dieuKien.DIRECTION = x.chieu;
  if (x.xe_rieng) dieuKien.EXCLUSIVE = "1";
  return { id: x.id, kind: x.kieu, amount: x.tien, validFrom: x.tu, validTo: x.den, dieuKien };
});
const nhomCuaDichVu = new Map(Object.entries(vang.dich_vu).map(([k, v]) => [k, v.nhom] as const));

test("canhBaoCapCaoHon", () => {
  const bang = bangVang();
  const cb = canhBaoCapCaoHon({ muc: bang, ngay: "2026-12-10", nhomCuaDichVu });
  const co = (xs: typeof cb) => xs.find((c) => c.tierCode === "C3" && c.zoneCode === "CR" && c.groupCode === "HT" && c.catalogCode === null && c.direction === "OUT" && !c.exclusive);
  assert.deepEqual(co(cb), { tierCode: "C3", zoneCode: "CR", direction: "OUT", exclusive: false, catalogCode: null, groupCode: "HT", tienCap: 80_000, tienKhongCap: 70_000 });
  const them = [...bang, m("P06HT", { ZONE: "CR", TIER: "C3", SERVICE_GROUP: "HT" }, 70_000)];
  assert.equal(co(canhBaoCapCaoHon({ muc: them, ngay: "2026-12-10", nhomCuaDichVu })), undefined, "thêm dòng C3 + HT 70.000 thì cảnh báo biến mất");
  // cấp trả thấp hơn hoặc bằng thì không cảnh báo
  assert.deepEqual(canhBaoCapCaoHon({ muc: [m("A", { ZONE: "CR" }, 100), m("B", { ZONE: "CR", TIER: "C1" }, 100), m("C", { ZONE: "CR", TIER: "C3" }, 50)], ngay: NGAY, nhomCuaDichVu }), []);
});

test("vungThieuDongChung", () => {
  const vung = Object.keys(vang.vung);
  const bang = bangVang();
  assert.deepEqual(vungThieuDongChung({ vung, muc: bang, ngay: "2026-12-01" }), []);
  assert.deepEqual(vungThieuDongChung({ vung, muc: bang.filter((x) => x.id !== "P02"), ngay: "2026-12-01" }), ["BAC"]);
  assert.deepEqual(vungThieuDongChung({ vung, muc: bang, ngay: "2026-11-30" }), vung, "chưa có dòng nào còn hiệu lực");
  // dòng có thêm điều kiện (cấp, nhóm, chiều) hoặc theo chuyến không phải dòng chung
  assert.deepEqual(vungThieuDongChung({ vung: ["CR"], muc: [m("A", { ZONE: "CR", TIER: "C1" }, 0), m("B", { ZONE: "CR", EXCLUSIVE: "1" }, 0)], ngay: NGAY }), ["CR"]);
});

// ---- Đợt C, Task 2: phí của MỘT đơn ----
const cd = (o: Partial<import("./phi-don-rules.ts").ChangDauVao> = {}) => ({ legKey: "L1", zoneCode: "CR", direction: "OUT" as const, exclusive: false, catalogCode: null, soKhachTinhTien: 2, paxOverride: null, ...o });
const bangDon = (muc: MucPhiDon[], o: { batDauAp?: string | null; cap?: import("./phi-don-rules.ts").CapCuaHoSo } = {}) => ({ batDauAp: o.batDauAp === undefined ? "2026-12-01" : o.batDauAp, muc, cap: o.cap ?? { loai: "KHONG_CAP" as const } });
const KHONG_NHOM = new Map<string, string | null>();

test("tinhPhiDonThuan: chưa bật hoặc ngày trước ngày áp ⇒ không áp dụng", () => {
  const muc = [m("A", { ZONE: "CR" }, 30000)];
  assert.deepEqual(tinhPhiDonThuan({ bang: bangDon(muc, { batDauAp: null }), nhom: KHONG_NHOM, ngay: NGAY, chang: [cd()] }), { apDung: false });
  assert.deepEqual(tinhPhiDonThuan({ bang: bangDon(muc), nhom: KHONG_NHOM, ngay: "2026-11-30", chang: [cd()] }), { apDung: false });
  assert.equal(tinhPhiDonThuan({ bang: bangDon(muc), nhom: KHONG_NHOM, ngay: "2026-12-01", chang: [cd()] }).apDung, true);
});

test("tinhPhiDonThuan: dòng đủ trường, cấp được chụp, nhóm tra từ bản đồ, thiếu mức không thành 0, số lượng 0 không sinh dòng", () => {
  const muc = [m("A", { ZONE: "CR" }, 30000), m("N", { ZONE: "CR", SERVICE_GROUP: "G1" }, 20000), m("C", { ZONE: "CR", TIER: "C1" }, 0)];
  const r = tinhPhiDonThuan({
    bang: bangDon(muc, { cap: { loai: "CO_CAP", tierCode: "C1" } }), nhom: new Map([["S1", "G1"]]), ngay: NGAY,
    chang: [cd({ legKey: "a", catalogCode: "S1" }), cd({ legKey: "b", zoneCode: "TT" }), cd({ legKey: "c", soKhachTinhTien: 0 })],
  });
  assert.ok(r.apDung);
  if (!r.apDung) return;
  assert.deepEqual(r.dong, [{ legKey: "a", ruleId: "C", kind: "PER_PAX", zoneCode: "CR", tierCode: "C1", donGia: 0, soLuong: 2, tien: 0, returnPax: null }], "chặng c (0 khách) không sinh dòng");
  assert.deepEqual(r.thieu, [{ legKey: "b", zoneCode: "TT", lyDo: "KHONG_CO_MUC" }], "vùng không có mức ⇒ thiếu, không phải 0");
  // nhóm: không cấp ⇒ dòng nhóm thắng dòng chung
  const k = tinhPhiDonThuan({ bang: bangDon(muc), nhom: new Map([["S1", "G1"]]), ngay: NGAY, chang: [cd({ catalogCode: "S1" })] });
  assert.ok(k.apDung && k.dong[0]!.ruleId === "N" && k.dong[0]!.tierCode === null);
});

test("tinhPhiDonThuan: hai cấp ⇒ mọi chặng thiếu DAI_LY_HAI_CAP (không lùi về mức chung); xung đột ⇒ XUNG_DOT; chiều về có số người riêng ⇒ returnPax", () => {
  const chung = m("A", { ZONE: "CR" }, 30000);
  const h = tinhPhiDonThuan({ bang: bangDon([chung], { cap: { loai: "HAI_CAP" } }), nhom: KHONG_NHOM, ngay: NGAY, chang: [cd({ legKey: "a" }), cd({ legKey: "b", soKhachTinhTien: 0 })] });
  assert.ok(h.apDung && h.dong.length === 0);
  if (h.apDung) assert.deepEqual(h.thieu.map((t) => [t.legKey, t.lyDo]), [["a", "DAI_LY_HAI_CAP"], ["b", "DAI_LY_HAI_CAP"]]);
  const x = tinhPhiDonThuan({ bang: bangDon([m("A", { ZONE: "CR", DIRECTION: "OUT" }, 1), m("B", { ZONE: "CR", DIRECTION: "OUT" }, 2)]), nhom: KHONG_NHOM, ngay: NGAY, chang: [cd()] });
  assert.ok(x.apDung && x.thieu[0]!.lyDo === "XUNG_DOT");
  const ve = tinhPhiDonThuan({ bang: bangDon([chung]), nhom: KHONG_NHOM, ngay: NGAY, chang: [cd({ direction: "RETURN", soKhachTinhTien: 5, paxOverride: 3 })] });
  assert.ok(ve.apDung && ve.dong[0]!.soLuong === 3 && ve.dong[0]!.returnPax === 3 && ve.dong[0]!.tien === 90000);
});

test("điểm 4: tích đơn giá × số lượng không an toàn ⇒ ném lỗi, không cắt; mức vượt trần 5.000.000 đ bị từ chối ở kiemThanMucPhiDon", () => {
  assert.throws(() => tinhPhiDonThuan({ bang: bangDon([m("A", { ZONE: "CR" }, TRAN_MUC_PHI_DON)]), nhom: KHONG_NHOM, ngay: NGAY, chang: [cd({ soKhachTinhTien: Number.MAX_SAFE_INTEGER })] }), RangeError);
  const biet = { vung: new Set(["CR"]), cap: new Set<string>(), nhom: new Set<string>(), dichVu: new Set<string>() };
  const than = (amount: number) => ({ kind: "PER_PAX", amount, validFrom: "2026-12-01", dieuKien: { ZONE: "CR" } });
  assert.equal(TRAN_MUC_PHI_DON, 5_000_000);
  assert.equal(kiemThanMucPhiDon(than(5_000_000), biet).ok, true);
  const qua = kiemThanMucPhiDon(than(5_000_001), biet);
  assert.ok(!qua.ok && qua.message.includes("5.000.000"));
});
