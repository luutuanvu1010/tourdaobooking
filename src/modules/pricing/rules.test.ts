// Luật thuần sổ đại lý đợt 1 (đặc tả §4, §12 tiêu chí 1–2). Số của ví dụ đã duyệt trong ADR-0077 / ADR-0078 — không phụ thuộc trạng thái sổ vàng.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chonDieuKhoan, chonMuc, chupDon, giaVonDong, hoaHongDong, kiemNgayDong, kiemThanDieuKhoan, kiemThanMuc, lamTronNuaLen, moTaMuc, nguoiHuongCua, soKhachTinhHoaHong, tinhDongDoiTac,
  type DongDieuKhoan, type DongMuc, type NguoiHuong,
} from "./rules.ts";

const VAI = new Set(["TRAVEL_AGENCY", "GUIDE_FREELANCE", "HOTEL_RECEPTION", "TAXI_DRIVER", "COLLABORATOR"]);
const DL_A: NguoiHuong = { loai: "HUONG", partyId: "dl-a", vai: ["TRAVEL_AGENCY"] };
let k = 0;
const muc = (o: Partial<DongMuc>): DongMuc => ({
  id: `m${++k}`, targetPartyId: null, targetRoleCode: "TRAVEL_AGENCY", targetTierCode: null, scope: "ALL", catalogCode: null, groupCode: null, kind: "RATE", rateBp: 1000, perPaxAmount: null,
  validFrom: "2026-01-01", validTo: null, ...o,
});
const dk = (o: Partial<DongDieuKhoan>): DongDieuKhoan => ({
  id: `d${++k}`, scope: "ALL", catalogCode: null, groupCode: null, sellerPartyId: "ct", supplierPartyId: null, costRateBp: null, validFrom: "2025-01-01", validTo: null, ...o,
});

test("người hưởng: bên đặt mang vai được hưởng ⇒ HUONG; vai bên ngoài khác ⇒ KHONG_HUONG; khách lẻ, nội bộ, công ty chủ, trống ⇒ NONE", () => {
  const g = (vai: { roleTypeCode: string; roleGroup: string }[], id: string | null = "p") => nguoiHuongCua({ bookerPartyId: id, vaiMo: vai, vaiDuocHuong: VAI, congTyChuId: "ct" });
  assert.deepEqual(g([{ roleTypeCode: "TRAVEL_AGENCY", roleGroup: "EXTERNAL" }]), { loai: "HUONG", partyId: "p", vai: ["TRAVEL_AGENCY"] });
  assert.deepEqual(g([{ roleTypeCode: "DRIVER_EXTERNAL", roleGroup: "EXTERNAL" }]), { loai: "KHONG_HUONG", partyId: "p" });
  assert.deepEqual(g([{ roleTypeCode: "CUSTOMER", roleGroup: "OTHER" }]), { loai: "NONE" });
  assert.deepEqual(g([{ roleTypeCode: "SALES", roleGroup: "INTERNAL" }]), { loai: "NONE" });
  assert.deepEqual(g([{ roleTypeCode: "TRAVEL_AGENCY", roleGroup: "EXTERNAL" }], "ct"), { loai: "NONE" });
  assert.deepEqual(g([], null), { loai: "NONE" });
  // Mang cả vai được hưởng lẫn vai bên ngoài không được hưởng: vẫn HUONG, và `vai` chỉ giữ vai được hưởng.
  assert.deepEqual(g([{ roleTypeCode: "TRAVEL_AGENCY", roleGroup: "EXTERNAL" }, { roleTypeCode: "DRIVER_EXTERNAL", roleGroup: "EXTERNAL" }]),
    { loai: "HUONG", partyId: "p", vai: ["TRAVEL_AGENCY"] });
});

// ADR-0117 lần 1, Q1 = A (chủ chọn 2026-10-14): loại đối tác do người dùng thêm (nhóm OTHER, có nhãn) đã TẮT khỏi danh sách được hưởng ⇒ đơn mới của hồ sơ mang nhãn bị giữ như vai bên ngoài
// (KHONG_HUONG ⇒ MISSING BOOKER_NOT_BENEFICIARY), không bao giờ tự lấy 0 hay NONE.
test("Q1 (A): hồ sơ mang loại đối tác (nhóm OTHER, nhãn) — loại ĐANG BẬT ⇒ HUONG; loại ĐÃ TẮT ⇒ KHONG_HUONG; vai OTHER không nhãn ⇒ NONE", () => {
  const g = (vai: { roleTypeCode: string; roleGroup: string; nhanDoiTac?: boolean }[], duocHuong: ReadonlySet<string>) =>
    nguoiHuongCua({ bookerPartyId: "p", vaiMo: vai, vaiDuocHuong: duocHuong, congTyChuId: "ct" });
  const nhan = { roleTypeCode: "LD_ABCDEFGH", roleGroup: "OTHER", nhanDoiTac: true };
  assert.deepEqual(g([nhan], new Set([...VAI, "LD_ABCDEFGH"])), { loai: "HUONG", partyId: "p", vai: ["LD_ABCDEFGH"] }, "loại bật");
  assert.deepEqual(g([nhan], VAI), { loai: "KHONG_HUONG", partyId: "p" }, "loại tắt (không còn trong danh sách được hưởng) ⇒ giữ đơn, không NONE");
  assert.deepEqual(g([{ roleTypeCode: "CUSTOMER", roleGroup: "OTHER", nhanDoiTac: false }], VAI), { loai: "NONE" }, "OTHER không nhãn");
  assert.deepEqual(g([{ roleTypeCode: "CUSTOMER", roleGroup: "OTHER" }], VAI), { loai: "NONE" }, "thiếu cờ nhãn coi như không nhãn");
  // Mang cả loại tắt lẫn vai được hưởng khác: vẫn HUONG (vai được hưởng thắng), `vai` chỉ giữ vai đang được hưởng.
  assert.deepEqual(g([nhan, { roleTypeCode: "TRAVEL_AGENCY", roleGroup: "EXTERNAL" }], VAI), { loai: "HUONG", partyId: "p", vai: ["TRAVEL_AGENCY"] });
  // Công ty chủ mang nhãn đã tắt vẫn NONE (không bao giờ là người hưởng của chính mình).
  assert.deepEqual(nguoiHuongCua({ bookerPartyId: "ct", vaiMo: [nhan], vaiDuocHuong: VAI, congTyChuId: "ct" }), { loai: "NONE" });
});

test("chonMuc: đủ sáu bậc, bậc cụ thể nhất thắng", () => {
  const ds = [
    muc({ targetPartyId: "dl-a", targetRoleCode: null, scope: "SERVICE", catalogCode: "HONTAM", rateBp: 1200 }),
    muc({ targetPartyId: "dl-a", targetRoleCode: null, scope: "GROUP", groupCode: "DTH", rateBp: 1300 }),
    muc({ targetPartyId: "dl-a", targetRoleCode: null, scope: "ALL", rateBp: 1100 }),
    muc({ scope: "SERVICE", catalogCode: "VINW", rateBp: 900 }),
    muc({ scope: "GROUP", groupCode: "TOUR", rateBp: 800 }),
    muc({ scope: "ALL", rateBp: 700 }),
  ];
  const c = (code: string, group: string | null, nh: NguoiHuong = DL_A) => chonMuc({ nguoiHuong: nh, catalogCode: code, groupCode: group, ngay: "2026-10-10", dong: ds });
  const bac = (r: ReturnType<typeof c>) => (r.trangThai === "SET" ? [r.bac, r.dong.rateBp] : r);
  assert.deepEqual(bac(c("HONTAM", "VE")), [1, 1200]);
  assert.deepEqual(bac(c("DUTHUYEN", "DTH")), [2, 1300]);
  assert.deepEqual(bac(c("KHAC", "VE")), [3, 1100]);
  // Mức riêng của đối tác (bậc 3, mọi dịch vụ) thắng mức theo vai ở bậc dịch vụ (bậc 4): thứ tự là "đối tác trước, vai sau", không phải "phạm vi trước".
  assert.deepEqual(bac(c("VINW", "VE")), [3, 1100]);
  const B: NguoiHuong = { loai: "HUONG", partyId: "dl-b", vai: ["TRAVEL_AGENCY"] };
  assert.deepEqual(bac(c("VINW", "VE", B)), [4, 900]);
  assert.deepEqual(bac(c("TOURDAO", "TOUR", B)), [5, 800]);
  assert.deepEqual(bac(c("KHAC", "VE", B)), [6, 700]);
});

test("chonMuc: ranh ngày (= ngày bắt đầu, = ngày kết thúc), mức 0 hợp lệ, không khớp ⇒ NO_RULE", () => {
  const ds = [muc({ rateBp: 0, validFrom: "2026-10-01", validTo: "2026-10-31" })];
  const c = (ngay: string) => chonMuc({ nguoiHuong: DL_A, catalogCode: "X", groupCode: null, ngay, dong: ds });
  assert.equal(c("2026-10-01").trangThai, "SET");
  assert.equal(c("2026-10-31").trangThai, "SET");
  const r = c("2026-10-15");
  assert.ok(r.trangThai === "SET" && r.dong.rateBp === 0, "mức 0 là mức hợp lệ, không phải thiếu");
  assert.deepEqual(c("2026-11-01"), { trangThai: "MISSING", lyDo: "NO_RULE" });
  assert.deepEqual(c("2026-09-30"), { trangThai: "MISSING", lyDo: "NO_RULE" });
});

test("chonMuc: hai vai cùng bậc khác mức ⇒ RULE_CONFLICT; cùng mức ⇒ SET; dòng nhập tay ⇒ MANUAL_LINE; bên đặt không hưởng ⇒ BOOKER_NOT_BENEFICIARY; khách lẻ ⇒ NONE", () => {
  const hai: NguoiHuong = { loai: "HUONG", partyId: "p", vai: ["COLLABORATOR", "GUIDE_FREELANCE"] };
  const khac = [muc({ targetRoleCode: "COLLABORATOR", rateBp: 1000 }), muc({ targetRoleCode: "GUIDE_FREELANCE", rateBp: 1500 })];
  const giong = [muc({ targetRoleCode: "COLLABORATOR", rateBp: 1000 }), muc({ targetRoleCode: "GUIDE_FREELANCE", rateBp: 1000 })];
  const c = (nh: NguoiHuong, ds: DongMuc[], code: string | null = "X") => chonMuc({ nguoiHuong: nh, catalogCode: code, groupCode: null, ngay: "2026-10-10", dong: ds });
  assert.deepEqual(c(hai, khac), { trangThai: "MISSING", lyDo: "RULE_CONFLICT" });
  assert.equal(c(hai, giong).trangThai, "SET");
  assert.deepEqual(c(DL_A, giong, null), { trangThai: "MISSING", lyDo: "MANUAL_LINE" });
  assert.deepEqual(c({ loai: "KHONG_HUONG", partyId: "tx" }, giong), { trangThai: "MISSING", lyDo: "BOOKER_NOT_BENEFICIARY" });
  assert.deepEqual(c({ loai: "NONE" }, giong), { trangThai: "NONE" });
});

test("chonMuc: hai vai cùng bậc, cùng giá trị 1000 nhưng khác kiểu (tỷ lệ so với đ/khách) ⇒ RULE_CONFLICT", () => {
  const hai: NguoiHuong = { loai: "HUONG", partyId: "p", vai: ["COLLABORATOR", "TRAVEL_AGENCY"] };
  const ds = [muc({ targetRoleCode: "TRAVEL_AGENCY", kind: "RATE", rateBp: 1000, perPaxAmount: null }),
    muc({ targetRoleCode: "COLLABORATOR", kind: "PER_PAX", rateBp: null, perPaxAmount: 1000 })];
  assert.deepEqual(chonMuc({ nguoiHuong: hai, catalogCode: "X", groupCode: null, ngay: "2026-10-10", dong: ds }), { trangThai: "MISSING", lyDo: "RULE_CONFLICT" });
});

test("chonMuc: dịch vụ Chưa phân loại chỉ khớp bậc dịch vụ hoặc mọi dịch vụ", () => {
  const ds = [muc({ scope: "GROUP", groupCode: "VE", rateBp: 500 })];
  assert.deepEqual(chonMuc({ nguoiHuong: DL_A, catalogCode: "MOI", groupCode: null, ngay: "2026-10-10", dong: ds }), { trangThai: "MISSING", lyDo: "NO_RULE" });
});

// ===== ADR-0117 lần 2: chín bậc — bậc 7–9 là mức TA (dòng đích mức) của các mức mà loại hồ sơ đang mang được GẮN ở ngày tra. =====
const DICH_MUC = { targetPartyId: null, targetRoleCode: null } as const;
const mucTa = (tier: string, o: Partial<DongMuc>): DongMuc => muc({ ...DICH_MUC, targetTierCode: tier, ...o });
const gan = (roleTypeCode: string, tierCode: string, validFrom = "2026-01-01", validTo: string | null = null) => ({ roleTypeCode, tierCode, validFrom, validTo });
const NGAY = "2026-10-10";
const chon = (nh: NguoiHuong, ds: DongMuc[], g: ReturnType<typeof gan>[], code: string | null = "KHAC", group: string | null = "VE", ngay = NGAY) =>
  chonMuc({ nguoiHuong: nh, catalogCode: code, groupCode: group, ngay, dong: ds, gan: g });
const tomTat = (r: ReturnType<typeof chonMuc>) => (r.trangThai === "SET" ? { bac: r.bac, id: r.dong.id, bp: r.dong.rateBp } : r);

test("chonMuc chín bậc (bảng ca): mỗi bậc thắng đúng khi các bậc dưới nó vắng", () => {
  const g = [gan("TRAVEL_AGENCY", "TA1")];
  const dongTa = [
    mucTa("TA1", { id: "ta-dv", scope: "SERVICE", catalogCode: "HONTAM", rateBp: 1500 }),
    mucTa("TA1", { id: "ta-nhom", scope: "GROUP", groupCode: "DTH", rateBp: 1400 }),
    mucTa("TA1", { id: "ta-all", scope: "ALL", rateBp: 1300 }),
  ];
  const dongDt = muc({ id: "dt-dv", targetPartyId: "dl-a", targetRoleCode: null, scope: "SERVICE", catalogCode: "DT", rateBp: 2000 });
  const dongDtNhom = muc({ id: "dt-nhom", targetPartyId: "dl-a", targetRoleCode: null, scope: "GROUP", groupCode: "G1", rateBp: 2100 });
  const dongDtAll = muc({ id: "dt-all", targetPartyId: "dl-a", targetRoleCode: null, scope: "ALL", rateBp: 2200 });
  const dongVaiDv = muc({ id: "vai-dv", scope: "SERVICE", catalogCode: "VV", rateBp: 900 });
  const dongVaiNhom = muc({ id: "vai-nhom", scope: "GROUP", groupCode: "G2", rateBp: 800 });
  const dongVaiAll = muc({ id: "vai-all", scope: "ALL", rateBp: 700 });
  const cat = [...dongTa, dongDt, dongDtNhom, dongDtAll, dongVaiDv, dongVaiNhom, dongVaiAll];
  const hang: [string, DongMuc[], string, string | null, number, string][] = [
    ["bậc 1", cat, "DT", null, 1, "dt-dv"],
    ["bậc 2", cat, "X1", "G1", 2, "dt-nhom"],
    ["bậc 3", cat, "X2", "ZZ", 3, "dt-all"],
    ["bậc 4", [...dongTa, dongVaiDv, dongVaiNhom, dongVaiAll], "VV", null, 4, "vai-dv"],
    ["bậc 5", [...dongTa, dongVaiNhom, dongVaiAll], "X1", "G2", 5, "vai-nhom"],
    ["bậc 6", [...dongTa, dongVaiAll], "X2", "ZZ", 6, "vai-all"],
    ["bậc 7", dongTa, "HONTAM", "VE", 7, "ta-dv"],
    ["bậc 8", dongTa, "X1", "DTH", 8, "ta-nhom"],
    ["bậc 9", dongTa, "X2", "ZZ", 9, "ta-all"],
  ];
  for (const [ten, ds, code, group, bac, id] of hang) assert.deepEqual(tomTat(chon(DL_A, ds, g, code, group)).valueOf(), { bac, id, bp: (ds.find((d) => d.id === id) as DongMuc).rateBp }, ten);
  // Nhóm trống (Chưa phân loại) không khớp bậc nhóm ở bậc 8.
  assert.deepEqual(chon(DL_A, dongTa, g, "X1", null), { trangThai: "SET", bac: 9, dong: dongTa[2] });
});

test("chonMuc bậc 7–9: ranh ngày của gắn loại↔mức (= ngày bắt đầu, = ngày kết thúc, ngoài khoảng), mức TA không được gắn thì không áp", () => {
  const ds = [mucTa("TA1", { id: "ta1", scope: "ALL", rateBp: 1500 })];
  const g = [gan("TRAVEL_AGENCY", "TA1", "2026-10-01", "2026-10-31")];
  assert.equal(chon(DL_A, ds, g, "X", null, "2026-10-01").trangThai, "SET");
  assert.equal(chon(DL_A, ds, g, "X", null, "2026-10-31").trangThai, "SET");
  assert.deepEqual(chon(DL_A, ds, g, "X", null, "2026-11-01"), { trangThai: "MISSING", lyDo: "NO_RULE" });
  assert.deepEqual(chon(DL_A, ds, g, "X", null, "2026-09-30"), { trangThai: "MISSING", lyDo: "NO_RULE" });
  // Gắn của loại KHÁC (hồ sơ không mang loại ấy), mức khác, và không có gắn nào ⇒ không áp.
  assert.deepEqual(chon(DL_A, ds, [gan("GUIDE_FREELANCE", "TA1")], "X", null), { trangThai: "MISSING", lyDo: "NO_RULE" });
  assert.deepEqual(chon(DL_A, ds, [gan("TRAVEL_AGENCY", "TA2")], "X", null), { trangThai: "MISSING", lyDo: "NO_RULE" });
  assert.deepEqual(chon(DL_A, ds, [], "X", null), { trangThai: "MISSING", lyDo: "NO_RULE" });
  // Dòng đích mức hết hiệu lực ở ngày tra thì không áp dù gắn còn.
  const het = [mucTa("TA1", { scope: "ALL", rateBp: 1500, validTo: "2026-09-30" })];
  assert.deepEqual(chon(DL_A, het, [gan("TRAVEL_AGENCY", "TA1")], "X", null), { trangThai: "MISSING", lyDo: "NO_RULE" });
});

test("chonMuc bậc 7–9: hai loại → hai mức KHÁC số cùng bậc ⇒ RULE_CONFLICT; hai mức CÙNG số thì không xung đột; cùng một mức qua hai loại thì không xung đột", () => {
  const hai: NguoiHuong = { loai: "HUONG", partyId: "p", vai: ["COLLABORATOR", "TRAVEL_AGENCY"] };
  const g = [gan("TRAVEL_AGENCY", "TA1"), gan("COLLABORATOR", "TA2")];
  for (const pv of [{ scope: "SERVICE", catalogCode: "X" }, { scope: "GROUP", groupCode: "VE" }, { scope: "ALL" }] as Partial<DongMuc>[]) {
    const khac = [mucTa("TA1", { ...pv, rateBp: 1500 }), mucTa("TA2", { ...pv, rateBp: 1000 })];
    assert.deepEqual(chon(hai, khac, g, "X", "VE"), { trangThai: "MISSING", lyDo: "RULE_CONFLICT" }, `${pv.scope} khác số`);
    const cung = [mucTa("TA1", { ...pv, id: "b-id", rateBp: 1000 }), mucTa("TA2", { ...pv, id: "a-id", rateBp: 1000 })];
    assert.equal(chon(hai, cung, g, "X", "VE").trangThai, "SET", `${pv.scope} cùng số`);
  }
  // Khác KIỂU cùng giá trị 1000 ⇒ xung đột (đúng nghĩa cungMuc).
  const kieu = [mucTa("TA1", { scope: "ALL", kind: "RATE", rateBp: 1000 }), mucTa("TA2", { scope: "ALL", kind: "PER_PAX", rateBp: null, perPaxAmount: 1000 })];
  assert.deepEqual(chon(hai, kieu, g, "X", null), { trangThai: "MISSING", lyDo: "RULE_CONFLICT" });
  // Hai loại cùng gắn MỘT mức ⇒ một dòng, không xung đột.
  const mot = [mucTa("TA1", { scope: "ALL", rateBp: 1500 })];
  assert.equal(chon(hai, mot, [gan("TRAVEL_AGENCY", "TA1"), gan("COLLABORATOR", "TA1")], "X", null).trangThai, "SET");
});

test("chonMuc bậc 7–9: hai dòng TA cùng số ⇒ kết quả xác định theo id (dòng id nhỏ nhất), không phụ thuộc thứ tự đầu vào", () => {
  const hai: NguoiHuong = { loai: "HUONG", partyId: "p", vai: ["COLLABORATOR", "TRAVEL_AGENCY"] };
  const g = [gan("TRAVEL_AGENCY", "TA1"), gan("COLLABORATOR", "TA2")];
  const a = mucTa("TA2", { id: "a-id", scope: "ALL", rateBp: 1000 });
  const b = mucTa("TA1", { id: "b-id", scope: "ALL", rateBp: 1000 });
  for (const ds of [[a, b], [b, a]]) {
    const r = chon(hai, ds, g, "X", null);
    assert.ok(r.trangThai === "SET" && r.bac === 9 && r.dong.id === "a-id");
  }
});

test("SV-TA-04b: dòng riêng bậc 6 (loại, mọi dịch vụ 10%) thắng dòng TA bậc 8 (Du thuyền 15%): 300.000đ, KHÔNG phải 450.000đ; đóng dòng cũ ⇒ bậc 8, 450.000đ", () => {
  const g = [gan("TRAVEL_AGENCY", "TA1")];
  const ta = mucTa("TA1", { id: "ta-dt", scope: "GROUP", groupCode: "DTH", rateBp: 1500 });
  const cu = muc({ id: "vai-cu", scope: "ALL", rateBp: 1000 });
  const r = chon(DL_A, [cu, ta], g, "DUTHUYEN", "DTH");
  assert.ok(r.trangThai === "SET" && r.bac === 6 && r.dong.id === "vai-cu");
  assert.equal(r.trangThai === "SET" && hoaHongDong({ kind: r.dong.kind, rateBp: r.dong.rateBp, perPaxAmount: r.dong.perPaxAmount, thanhTien: 3_000_000, soKhachTinh: 1 }), 300_000);
  const sau = chon(DL_A, [{ ...cu, validTo: "2026-10-09" }, ta], g, "DUTHUYEN", "DTH");
  assert.ok(sau.trangThai === "SET" && sau.bac === 8);
  assert.equal(sau.trangThai === "SET" && hoaHongDong({ kind: sau.dong.kind, rateBp: sau.dong.rateBp, perPaxAmount: sau.dong.perPaxAmount, thanhTien: 3_000_000, soKhachTinh: 1 }), 450_000);
});

test("SV-TA-04a: dòng riêng bậc 5 (loại, nhóm Du thuyền 8%) thắng dòng TA bậc 8 (15%): 240.000đ", () => {
  const g = [gan("TRAVEL_AGENCY", "TA1")];
  const ds = [muc({ id: "vai-nhom", scope: "GROUP", groupCode: "DTH", rateBp: 800 }), mucTa("TA1", { id: "ta-dt", scope: "GROUP", groupCode: "DTH", rateBp: 1500 })];
  const r = chon(DL_A, ds, g, "DUTHUYEN", "DTH");
  assert.ok(r.trangThai === "SET" && r.bac === 5 && r.dong.id === "vai-nhom");
  assert.equal(r.trangThai === "SET" && hoaHongDong({ kind: r.dong.kind, rateBp: r.dong.rateBp, perPaxAmount: r.dong.perPaxAmount, thanhTien: 3_000_000, soKhachTinh: 1 }), 240_000);
});

test("SV-TA-05: mức riêng của đối tác (bậc 1–3, 12%) thắng mức TA 15% cùng dịch vụ: 240.000đ", () => {
  const g = [gan("TRAVEL_AGENCY", "TA1")];
  const ds = [mucTa("TA1", { id: "ta", scope: "SERVICE", catalogCode: "HONTAM", rateBp: 1500 }),
    muc({ id: "dt", targetPartyId: "dl-a", targetRoleCode: null, scope: "ALL", rateBp: 1200 })];
  const r = chon(DL_A, ds, g, "HONTAM", "VE");
  assert.ok(r.trangThai === "SET" && r.bac === 3 && r.dong.id === "dt");
  assert.equal(r.trangThai === "SET" && hoaHongDong({ kind: r.dong.kind, rateBp: r.dong.rateBp, perPaxAmount: r.dong.perPaxAmount, thanhTien: 2_000_000, soKhachTinh: 1 }), 240_000);
});

test("chonMuc chín bậc: không khớp bậc nào ⇒ NO_RULE (không bao giờ 0); dòng nhập tay ⇒ MANUAL_LINE kể cả có mức TA; tham số gan bỏ trống vẫn chạy như sáu bậc", () => {
  const g = [gan("TRAVEL_AGENCY", "TA1")];
  const dongTa = [mucTa("TA1", { scope: "SERVICE", catalogCode: "HONTAM", rateBp: 0 })];
  assert.deepEqual(chon(DL_A, dongTa, g, "KHAC", "VE"), { trangThai: "MISSING", lyDo: "NO_RULE" });
  assert.deepEqual(chon(DL_A, dongTa, g, null, null), { trangThai: "MISSING", lyDo: "MANUAL_LINE" });
  assert.equal(chon(DL_A, dongTa, g, "HONTAM", null).trangThai, "SET", "mức 0 là mức hợp lệ ở bậc 7");
  const khongGan = chonMuc({ nguoiHuong: DL_A, catalogCode: "HONTAM", groupCode: null, ngay: NGAY, dong: dongTa });
  assert.deepEqual(khongGan, { trangThai: "MISSING", lyDo: "NO_RULE" });
});

test("chonDieuKhoan: SERVICE > GROUP > ALL theo ngày; dòng nhập tay ⇒ MISSING", () => {
  const ds = [dk({}), dk({ scope: "GROUP", groupCode: "VE", sellerPartyId: "ncc1", supplierPartyId: "ncc1", costRateBp: 7000 }),
    dk({ scope: "SERVICE", catalogCode: "IRESORT", sellerPartyId: "ncc2", supplierPartyId: "ncc2", costRateBp: 8000, validFrom: "2026-10-01" })];
  const c = (code: string | null, group: string | null, ngay = "2026-10-10") => chonDieuKhoan({ catalogCode: code, groupCode: group, ngay, dong: ds });
  const ai = (r: ReturnType<typeof c>) => (r.trangThai === "SET" ? r.dong.sellerPartyId : "MISSING");
  assert.equal(ai(c("IRESORT", "VE")), "ncc2");
  assert.equal(ai(c("IRESORT", "VE", "2026-09-30")), "ncc1");
  assert.equal(ai(c("HONTAM", "VE")), "ncc1");
  assert.equal(ai(c("TOURDAO", "TOUR")), "ct");
  assert.equal(ai(c(null, null)), "MISSING");
});

test("làm tròn nửa lên theo dòng (điều A1): A-5 ra 125.000; ca đúng nửa đồng 1.000.004 × 12,5% ra 125.001", () => {
  assert.equal(hoaHongDong({ kind: "RATE", rateBp: 1250, perPaxAmount: null, thanhTien: 999_999, soKhachTinh: 1 }), 125_000);
  assert.equal(hoaHongDong({ kind: "RATE", rateBp: 1250, perPaxAmount: null, thanhTien: 1_000_004, soKhachTinh: 1 }), 125_001);
  assert.equal(lamTronNuaLen(5, 10), 1);
  assert.equal(lamTronNuaLen(4, 10), 0);
  assert.equal(lamTronNuaLen(0, 10000), 0);
});

test("A-1: đại lý A — 240.000 + 450.000 + 100.000 = 790.000; giá đại lý 5.210.000", () => {
  const ds = [
    muc({ targetPartyId: "dl-a", targetRoleCode: null, scope: "SERVICE", catalogCode: "HONTAM", rateBp: 1200 }),
    muc({ scope: "GROUP", groupCode: "DTH", rateBp: 1500 }),
    muc({ scope: "ALL", rateBp: 1000 }),
  ];
  const don = [
    { serviceId: "s1", catalogCode: "HONTAM", groupCode: "VE", thanhTien: 2_000_000 },
    { serviceId: "s2", catalogCode: "DUTHUYEN", groupCode: "DTH", thanhTien: 3_000_000 },
    { serviceId: "s3", catalogCode: "TOURDAO", groupCode: "TOUR", thanhTien: 1_000_000 },
  ];
  const chup = chupDon({ nguoiHuong: DL_A, ngay: "2026-10-10", dong: don, muc: ds, dieuKhoan: [dk({})] });
  const dong = chup.map((c, i) => tinhDongDoiTac(c, { thanhTien: don[i]!.thanhTien, soKhachTinh: 1 }));
  assert.deepEqual(dong.map((d) => d.hoaHong), [240_000, 450_000, 100_000]);
  assert.equal(dong.reduce((s, d) => s + (d.hoaHong ?? 0), 0), 790_000);
  assert.equal(dong.reduce((s, d) => s + (d.giaDaiLy ?? 0), 0), 5_210_000);
});

test("A-2: 50.000 đ/khách — 3 khách tính (em bé không tính) = 150.000, sau điều chỉnh 4 khách = 200.000 (mức chụp giữ nguyên)", () => {
  const nh: NguoiHuong = { loai: "HUONG", partyId: "huong", vai: ["HOTEL_RECEPTION"] };
  const [c] = chupDon({ nguoiHuong: nh, ngay: "2026-10-10", dong: [{ serviceId: "s", catalogCode: "IRESORT", groupCode: "VE", thanhTien: 0 }],
    muc: [muc({ targetRoleCode: "HOTEL_RECEPTION", scope: "SERVICE", catalogCode: "IRESORT", kind: "PER_PAX", rateBp: null, perPaxAmount: 50_000 })], dieuKhoan: [dk({})] });
  const truoc = soKhachTinhHoaHong({ unit: "perPax", pax: { adult: 2, child: 1, senior: 0, infant: 1 }, items: [] });
  const sau = soKhachTinhHoaHong({ unit: "perPax", pax: { adult: 3, child: 1, senior: 0, infant: 1 }, items: [] });
  assert.equal(tinhDongDoiTac(c!, { thanhTien: 900_000, soKhachTinh: truoc }).hoaHong, 150_000);
  assert.equal(tinhDongDoiTac(c!, { thanhTien: 1_200_000, soKhachTinh: sau }).hoaHong, 200_000);
});

test("H7: dịch vụ tính theo nhóm đếm lượt (tổng quantity), không đếm người", () => {
  assert.equal(soKhachTinhHoaHong({ unit: "per5Pax", pax: { adult: 7, child: 0, senior: 0, infant: 0 }, items: [{ quantity: 2 }] }), 2);
});

test("A-3: đổi bảng sau xác nhận — bản chụp 10% vẫn tính 10%", () => {
  const cu = muc({ scope: "ALL", rateBp: 1000, validTo: "2026-10-14" });
  const moi = muc({ scope: "ALL", rateBp: 1200, validFrom: "2026-10-15" });
  const [c10] = chupDon({ nguoiHuong: DL_A, ngay: "2026-10-10", dong: [{ serviceId: "s", catalogCode: "X", groupCode: null, thanhTien: 1_000_000 }], muc: [cu, moi], dieuKhoan: [dk({})] });
  const [c16] = chupDon({ nguoiHuong: DL_A, ngay: "2026-10-16", dong: [{ serviceId: "s", catalogCode: "X", groupCode: null, thanhTien: 1_000_000 }], muc: [cu, moi], dieuKhoan: [dk({})] });
  assert.equal(tinhDongDoiTac(c10!, { thanhTien: 1_000_000, soKhachTinh: 1 }).hoaHong, 100_000);
  assert.equal(tinhDongDoiTac(c16!, { thanhTien: 1_000_000, soKhachTinh: 1 }).hoaHong, 120_000);
});

test("A-4: thiếu mức ⇒ hoa hồng null (không bao giờ tự lấy 0); ghi tay 15% ⇒ 150.000", () => {
  const ctv: NguoiHuong = { loai: "HUONG", partyId: "lan", vai: ["COLLABORATOR"] };
  const [c] = chupDon({ nguoiHuong: ctv, ngay: "2026-10-10", dong: [{ serviceId: "s", catalogCode: "HONTAM", groupCode: "VE", thanhTien: 1_000_000 }], muc: [muc({})], dieuKhoan: [dk({})] });
  assert.deepEqual(c!.hoaHong, { status: "MISSING", reason: "NO_RULE" });
  const thieu = tinhDongDoiTac(c!, { thanhTien: 1_000_000, soKhachTinh: 1 });
  assert.equal(thieu.hoaHong, null);
  assert.equal(thieu.giaDaiLy, null);
  const tay = { ...c!, hoaHong: { status: "SET" as const, kind: "RATE" as const, rateBp: 1500, perPax: null, ruleId: null } };
  assert.equal(tinhDongDoiTac(tay, { thanhTien: 1_000_000, soKhachTinh: 1 }).hoaHong, 150_000);
});

test("B-3: giá vốn 80% trên thành tiền TRƯỚC giảm = 240.000", () => {
  assert.equal(giaVonDong({ costRateBp: 8000, thanhTien: 300_000 }), 240_000);
  const [c] = chupDon({ nguoiHuong: { loai: "NONE" }, ngay: "2026-10-10", dong: [{ serviceId: "s", catalogCode: "IRESORT", groupCode: "VE", thanhTien: 300_000 }], muc: [],
    dieuKhoan: [dk({}), dk({ scope: "SERVICE", catalogCode: "IRESORT", sellerPartyId: "ncc", supplierPartyId: "ncc", costRateBp: 8000 })] });
  assert.equal(tinhDongDoiTac(c!, { thanhTien: 300_000, soKhachTinh: 1 }).giaVon, 240_000);
});

test("bên đặt cũng là nhà cung cấp của dòng ⇒ hoa hồng dòng đó RULE_CONFLICT", () => {
  const nh: NguoiHuong = { loai: "HUONG", partyId: "ncc", vai: ["TRAVEL_AGENCY"] };
  const [c] = chupDon({ nguoiHuong: nh, ngay: "2026-10-10", dong: [{ serviceId: "s", catalogCode: "IRESORT", groupCode: "VE", thanhTien: 300_000 }], muc: [muc({})],
    dieuKhoan: [dk({}), dk({ scope: "SERVICE", catalogCode: "IRESORT", sellerPartyId: "ncc", supplierPartyId: "ncc", costRateBp: 8000 })] });
  assert.deepEqual(c!.hoaHong, { status: "MISSING", reason: "RULE_CONFLICT" });
});

// ===== Task 3: luật kiểm thân route (đặc tả §6) =====
test("kiemThanMuc: đúng một đối tượng, phạm vi khớp mã, tỷ lệ phần vạn 0…10000 hoặc đ/khách ≥ 0, ngày hợp lệ, ghi chú không chứa dãy số dài", () => {
  const goc = { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "GROUP", groupCode: "DTH", kieu: "RATE", tyLeBp: 1500, tuNgay: "2026-10-10" };
  const ok = kiemThanMuc(goc);
  assert.ok(ok.ok);
  assert.deepEqual(ok.ok && ok.value, { targetPartyId: null, targetRoleCode: "TRAVEL_AGENCY", scope: "GROUP", catalogCode: null, groupCode: "DTH", kind: "RATE", rateBp: 1500, perPaxAmount: null,
    theoLoai: null, validFrom: "2026-10-10", validTo: null, note: null }); // theoLoai: ADR-0133 — không khai ⇒ null
  assert.equal(kiemThanMuc({ ...goc, tyLeBp: 10001 }).ok, false);
  assert.equal(kiemThanMuc({ ...goc, tyLeBp: 12.5 }).ok, false, "phần vạn phải là số nguyên");
  assert.equal(kiemThanMuc({ ...goc, phamVi: "SERVICE" }).ok, false, "phạm vi dịch vụ mà không có mã");
  assert.equal(kiemThanMuc({ ...goc, kieu: "PER_PAX", tyLeBp: undefined, moiKhach: -1 }).ok, false);
  assert.equal(kiemThanMuc({ ...goc, tuNgay: "2026-02-30" }).ok, false);
  assert.equal(kiemThanMuc({ ...goc, denNgay: "2026-10-09" }).ok, false, "ngày kết thúc trước ngày bắt đầu");
  assert.equal(kiemThanMuc({ ...goc, ghiChu: "gọi 0905123456" }).ok, false);
  assert.equal(kiemThanMuc({ ...goc, doiTuong: { loai: "DOI_TAC", partyId: "x y" } }).ok, false);
});

test("kiemThanDieuKhoan: người bán bắt buộc; tỷ lệ mua lại phần vạn khi có", () => {
  assert.ok(kiemThanDieuKhoan({ phamVi: "SERVICE", catalogCode: "IRESORT", nguoiBanPartyId: "pty-1", tyLeMuaBp: 8000, tuNgay: "2026-10-10" }).ok);
  assert.equal(kiemThanDieuKhoan({ phamVi: "SERVICE", catalogCode: "IRESORT", tuNgay: "2026-10-10" }).ok, false);
  assert.equal(kiemThanDieuKhoan({ phamVi: "ALL", nguoiBanPartyId: "pty-1", tyLeMuaBp: -5, tuNgay: "2026-10-10" }).ok, false);
});

test("kiemNgayDong: ngày đóng ≥ ngày bắt đầu của dòng", () => {
  assert.ok(kiemNgayDong({ denNgay: "2026-10-31" }, "2026-10-01").ok);
  assert.equal(kiemNgayDong({ denNgay: "2026-09-30" }, "2026-10-01").ok, false);
  assert.equal(kiemNgayDong({}, "2026-10-01").ok, false);
});

test("moTaMuc: lời thường cho nhật ký, không SĐT, tỷ lệ bỏ số 0 thừa", () => {
  assert.equal(moTaMuc({ doiTuong: "Công ty lữ hành", scope: "GROUP", catalogCode: null, groupCode: "DTH", kind: "RATE", rateBp: 1250, perPaxAmount: null }), "Công ty lữ hành · nhóm DTH · 12,5%");
  assert.equal(moTaMuc({ doiTuong: "đối tác pty-1", scope: "SERVICE", catalogCode: "HONTAM", groupCode: null, kind: "PER_PAX", rateBp: null, perPaxAmount: 50_000 }), "đối tác pty-1 · dịch vụ HONTAM · 50.000đ/khách");
  assert.equal(moTaMuc({ doiTuong: "Cộng tác viên", scope: "ALL", catalogCode: null, groupCode: null, kind: "RATE", rateBp: 1000, perPaxAmount: null }), "Cộng tác viên · mọi dịch vụ · 10%");
});
