import { test } from "node:test";
import assert from "node:assert/strict";
import {
  composePersonName, splitPersonName, validateContact, validateContactList, validateEndDate, validatePartyCreate, validatePartyUpdate,
  ownerCompanyAssignProblem, validatePeriod, validatePersonFullName, validateRelationship, validateRole, PARTY_ID_RE, ROW_ID_RE, hoSoNoiBo, VAI_CU_NOI_BO, kiemTenLoaiDoiTac, maLoaiDoiTac,
} from "./rules.ts";
import { readdirSync, readFileSync } from "node:fs";

const TODAY = "2026-09-20";
const U1 = "11111111-1111-1111-1111-111111111111";
const U2 = "22222222-2222-2222-2222-222222222222";

test("tách họ tên: 1, 2, 3, 4+ từ, khoảng trắng thừa, dấu", () => {
  assert.deepEqual(splitPersonName("Hương"), { family: null, middle: null, given: "Hương" });
  assert.deepEqual(splitPersonName("Trần Bình"), { family: "Trần", middle: null, given: "Bình" });
  assert.deepEqual(splitPersonName("Nguyễn Tuyên Phong"), { family: "Nguyễn", middle: "Tuyên", given: "Phong" });
  assert.deepEqual(splitPersonName("  Nguyễn   Thị  Thu   Hà "), { family: "Nguyễn", middle: "Thị Thu", given: "Hà" });
  assert.equal(splitPersonName("   "), null);
  assert.equal(splitPersonName(""), null);
});

test("ghép tên hiển thị: bỏ phần trống, ngược của tách", () => {
  assert.equal(composePersonName({ family: "Nguyễn", middle: "Tuyên", given: "Phong" }), "Nguyễn Tuyên Phong");
  assert.equal(composePersonName({ family: null, middle: null, given: "Hương" }), "Hương");
  assert.equal(composePersonName({ family: "Trần", given: "Bình" }), "Trần Bình");
  for (const full of ["Hương", "Trần Bình", "Nguyễn Tuyên Phong", "Nguyễn Thị Thu Hà"]) assert.equal(composePersonName(splitPersonName(full)!), full);
});

test("thời hạn: mặc định hôm nay, ngày đúng lịch, to ≥ from", () => {
  assert.deepEqual(validatePeriod(undefined, undefined, TODAY), { ok: true, value: { from: TODAY, to: null } });
  assert.deepEqual(validatePeriod("2026-01-01", "2026-01-31", TODAY), { ok: true, value: { from: "2026-01-01", to: "2026-01-31" } });
  for (const [f, t] of [["2026-02-30", null], ["2026-01-01", "2025-12-31"], ["01/01/2026", null], [5, null], ["2026-01-01", "x"]] as const) assert.equal(validatePeriod(f, t, TODAY).ok, false, `${f} ${t}`);
  assert.deepEqual(validateEndDate(null, TODAY), { ok: true, value: TODAY });
  assert.equal(validateEndDate({ validTo: "2026-13-01" }, TODAY).ok, false);
});

// `""` là "vắng" ở validatePeriod (ô ngày trống của giao diện gửi chuỗi rỗng) — validateEndDate phải hiểu giống hệt, không từ chối.
test("ngày kết thúc: rỗng/vắng = hôm nay, ngày hợp lệ giữ nguyên, sai định dạng bị từ chối", () => {
  for (const empty of [{}, { validTo: "" }, { validTo: null }, { validTo: undefined }]) {
    assert.deepEqual(validateEndDate(empty, TODAY), { ok: true, value: TODAY }, JSON.stringify(empty));
  }
  assert.deepEqual(validateEndDate({ validTo: "2026-10-01" }, TODAY), { ok: true, value: "2026-10-01" });
  for (const bad of [{ validTo: "01/10/2026" }, { validTo: "2026-02-30" }, { validTo: 5 }, { validTo: "   " }]) {
    assert.equal(validateEndDate(bad, TODAY).ok, false, JSON.stringify(bad));
  }
});

test("liên hệ: SĐT chuẩn hoá, email hạ chữ thường, từ chối sai", () => {
  const p = validateContact({ kind: "PHONE", value: " 0901 234 567 ", label: " Zalo " });
  assert.deepEqual(p, { ok: true, value: { kind: "PHONE", value: "0901 234 567", valueNormalized: "0901234567", label: "Zalo", isPrimary: false } });
  const e = validateContact({ kind: "EMAIL", value: "An@Example.COM", isPrimary: true });
  assert.deepEqual(e, { ok: true, value: { kind: "EMAIL", value: "An@Example.COM", valueNormalized: "an@example.com", label: null, isPrimary: true } });
  for (const bad of [null, [], { kind: "FAX", value: "1" }, { kind: "PHONE", value: "123" }, { kind: "EMAIL", value: "khong-co-a-cong" }, { kind: "PHONE", value: "" }, { kind: "PHONE", value: "0901234567", isPrimary: "yes" }, { kind: "PHONE", value: "0901234567", label: "x".repeat(51) }]) {
    assert.equal(validateContact(bad).ok, false, JSON.stringify(bad));
  }
});

test("danh sách liên hệ: chốt cờ chính cuối cùng cho từng loại", () => {
  const a = { kind: "PHONE", value: "0901234567" }, b = { kind: "PHONE", value: "0907654321", isPrimary: true }, c = { kind: "EMAIL", value: "x@y.vn" };
  const r = validateContactList([a, b, c]);
  assert.ok(r.ok);
  assert.deepEqual(r.value.map((x) => [x.kind, x.valueNormalized, x.isPrimary]), [["PHONE", "0901234567", false], ["PHONE", "0907654321", true], ["EMAIL", "x@y.vn", true]]);
  const first = validateContactList([a, { kind: "PHONE", value: "0907654321" }]);
  assert.ok(first.ok && first.value[0]!.isPrimary && !first.value[1]!.isPrimary, "không đánh dấu thì dòng đầu là chính");
  assert.equal(validateContactList([{ ...a, isPrimary: true }, { ...b }]).ok, false, "hai liên hệ chính cùng loại");
  assert.equal(validateContactList(new Array(6).fill(a)).ok, false, "quá 5");
  assert.deepEqual(validateContactList(undefined), { ok: true, value: [] });
});

test("tạo hồ sơ cá nhân: fullName hoặc tên tách rời", () => {
  const r = validatePartyCreate({ kind: "PERSON", fullName: "Nguyễn  Tuyên Phong", contacts: [{ kind: "PHONE", value: "0845256256" }] });
  assert.ok(r.ok && r.value.kind === "PERSON");
  assert.deepEqual(r.value.name, { family: "Nguyễn", middle: "Tuyên", given: "Phong" });
  const split = validatePartyCreate({ kind: "PERSON", familyName: "Trần", givenName: "Bình" });
  assert.ok(split.ok && split.value.kind === "PERSON" && split.value.name.given === "Bình" && split.value.name.middle === null);
  for (const bad of [null, {}, { kind: "ROBOT" }, { kind: "PERSON" }, { kind: "PERSON", fullName: "  " }, { kind: "PERSON", givenName: "x".repeat(61) }]) assert.equal(validatePartyCreate(bad).ok, false, JSON.stringify(bad));
});

test("tạo hồ sơ tổ chức: tên gọi bắt buộc, MST 10/13 số, email hoá đơn", () => {
  const r = validatePartyCreate({ kind: "ORGANIZATION", displayName: " Đại lý  Sao Biển ", legalName: "Công ty TNHH Sao Biển", taxCode: "0312 345 678", invoiceEmail: "KeToan@SaoBien.vn", address: "1 Trần Phú" });
  assert.ok(r.ok && r.value.kind === "ORGANIZATION");
  assert.deepEqual(r.value.org, { displayName: "Đại lý Sao Biển", legalName: "Công ty TNHH Sao Biển", taxCode: "0312345678", address: "1 Trần Phú", invoiceEmail: "ketoan@saobien.vn" });
  assert.ok(validatePartyCreate({ kind: "ORGANIZATION", displayName: "A", taxCode: "0312345678-001" }).ok);
  for (const bad of [{ kind: "ORGANIZATION" }, { kind: "ORGANIZATION", displayName: "A", taxCode: "123" }, { kind: "ORGANIZATION", displayName: "A", invoiceEmail: "sai" }, { kind: "ORGANIZATION", displayName: "x".repeat(201) }]) {
    assert.equal(validatePartyCreate(bad).ok, false, JSON.stringify(bad));
  }
});

test("sửa hồ sơ: bắt buộc expectedUpdatedAt và active; loại lấy từ hồ sơ hiện có", () => {
  const body = { fullName: "Trần Văn Bình", active: true, expectedUpdatedAt: "2026-09-20T00:00:00.000Z", kind: "ORGANIZATION" };
  const r = validatePartyUpdate(body, "PERSON");
  assert.ok(r.ok && r.value.kind === "PERSON", "kind trong body bị bỏ qua");
  assert.equal(validatePartyUpdate({ ...body, expectedUpdatedAt: undefined }, "PERSON").ok, false);
  assert.equal(validatePartyUpdate({ ...body, active: "true" }, "PERSON").ok, false);
  assert.equal(validatePartyUpdate({ displayName: "A", active: false, expectedUpdatedAt: "x" }, "ORGANIZATION").ok, true);
  assert.equal(validatePartyUpdate({ displayName: "", active: false, expectedUpdatedAt: "x" }, "ORGANIZATION").ok, false);
});

test("ADR-0084 Đ1: ô giới tính của hồ sơ người — tạo và sửa nhận NAM / NU / trống; vắng khi sửa = giữ nguyên; giá trị lạ ⇒ lỗi lời thường", () => {
  const sua = { fullName: "Lưu Tuấn Vũ", active: true, expectedUpdatedAt: "2026-10-01T00:00:00.000Z" };
  const g = (r: ReturnType<typeof validatePartyUpdate>) => (r.ok && r.value.kind === "PERSON" ? r.value.gender : "LỖI");
  assert.equal(g(validatePartyUpdate(sua, "PERSON")), undefined, "vắng ⇒ giữ nguyên");
  assert.equal(g(validatePartyUpdate({ ...sua, gender: "NAM" }, "PERSON")), "NAM");
  assert.equal(g(validatePartyUpdate({ ...sua, gender: "NU" }, "PERSON")), "NU");
  assert.equal(g(validatePartyUpdate({ ...sua, gender: "" }, "PERSON")), null);
  assert.equal(g(validatePartyUpdate({ ...sua, gender: null }, "PERSON")), null);
  for (const bad of ["nam", "Nữ", "KHAC", 1]) {
    const r = validatePartyUpdate({ ...sua, gender: bad }, "PERSON");
    assert.deepEqual(r, { ok: false, message: "Giới tính chỉ nhận Nam, Nữ hoặc để trống." }, String(bad));
  }
  const tao = (gender: unknown) => validatePartyCreate({ kind: "PERSON", fullName: "Lưu Tuấn Vũ", gender });
  const gt = (r: ReturnType<typeof validatePartyCreate>) => (r.ok && r.value.kind === "PERSON" ? r.value.gender : "LỖI");
  assert.equal(gt(tao(undefined)), null);
  assert.equal(gt(tao("NU")), "NU");
  assert.equal(gt(tao("")), null);
  assert.equal(tao("X").ok, false);
  // Tổ chức không có giới tính: gửi giá trị ⇒ lỗi; trống / vắng ⇒ bỏ qua.
  assert.equal(validatePartyUpdate({ displayName: "A", active: true, expectedUpdatedAt: "x", gender: "NAM" }, "ORGANIZATION").ok, false);
  assert.equal(validatePartyUpdate({ displayName: "A", active: true, expectedUpdatedAt: "x", gender: "" }, "ORGANIZATION").ok, true);
  assert.equal(validatePartyCreate({ kind: "ORGANIZATION", displayName: "A", gender: "NU" }).ok, false);
});

test("vai trò: mã hợp lệ, nơi tuỳ chọn, thời hạn", () => {
  assert.deepEqual(validateRole({ roleTypeCode: "GUIDE", locationId: U1 }, TODAY), { ok: true, value: { roleTypeCode: "GUIDE", locationId: U1, from: TODAY, to: null } });
  assert.deepEqual(validateRole({ roleTypeCode: "STAFF", validFrom: "2026-01-01", validTo: "2026-12-31" }, TODAY), { ok: true, value: { roleTypeCode: "STAFF", locationId: null, from: "2026-01-01", to: "2026-12-31" } });
  for (const bad of [null, { roleTypeCode: "guide" }, { roleTypeCode: "GUIDE", locationId: "khong-uuid" }, { roleTypeCode: "GUIDE", validFrom: "2026-02-30" }]) assert.equal(validateRole(bad, TODAY).ok, false, JSON.stringify(bad));
});

test("quan hệ: hai đầu hợp lệ, khác nhau, một đầu là hồ sơ đang xem", () => {
  const U3 = "33333333-3333-3333-3333-333333333333";
  const rel = (extra: Record<string, unknown> = {}) => ({ fromPartyId: U1, toPartyId: U2, relationshipTypeCode: "CONTACT_OF", ...extra });
  assert.ok(validateRelationship(rel(), U2, TODAY).ok);
  assert.ok(validateRelationship(rel({ fromPartyId: `pty-${U1}` }), U2, TODAY).ok, "hồ sơ nhân sự có tiền tố pty-");
  const bad: [Record<string, unknown> | null, string, string][] = [
    [null, U2, "thiếu dữ liệu"],
    [rel({ toPartyId: U1 }), U1, "tự quan hệ với chính mình"],
    [rel(), U3, "hồ sơ đang xem không ở đầu nào"],
    [rel({ fromPartyId: "x" }), U2, "id sai dạng"],
    [rel({ relationshipTypeCode: "contact" }), U2, "mã loại sai"],
    [rel({ validFrom: "2026-02-30" }), U2, "ngày sai lịch"],
  ];
  for (const [body, partyId, why] of bad) assert.equal(validateRelationship(body, partyId, TODAY).ok, false, why);
});

test("quan hệ: câu lỗi trung tính — đúng cho cả 'Người liên hệ của' lẫn 'Tài xế của' (ADR-0048, ruling R-B1)", () => {
  const U3 = "33333333-3333-3333-3333-333333333333";
  const rel = (extra: Record<string, unknown> = {}) => ({ fromPartyId: U1, toPartyId: U2, relationshipTypeCode: "DRIVES_FOR", ...extra });
  const loi = (body: Record<string, unknown>, partyId: string): string => {
    const r = validateRelationship(body, partyId, TODAY);
    assert.equal(r.ok, false, JSON.stringify(body));
    return r.ok ? "" : r.message;
  };
  assert.equal(loi(rel(), U3), "Quan hệ phải gắn với hồ sơ đang xem.");
  assert.equal(loi(rel({ toPartyId: U1 }), U1), "Một hồ sơ không thể có quan hệ với chính nó.");
  assert.equal(loi(rel({ fromPartyId: "x" }), U2), "Hồ sơ ở một đầu quan hệ không hợp lệ.");
  assert.equal(loi(rel({ relationshipTypeCode: "contact" }), U2), "Loại quan hệ không hợp lệ.");
});

test("mẫu id: UUID hoặc tiền tố do backfill", () => {
  assert.ok(PARTY_ID_RE.test(U1) && PARTY_ID_RE.test(`pty-${U1}`) && !PARTY_ID_RE.test("pty-x") && !PARTY_ID_RE.test(`ptr-${U1}`));
  assert.ok(ROW_ID_RE.test(U1) && ROW_ID_RE.test(`ptr-${U1}`) && !ROW_ID_RE.test(`pty-${U1}`));
});

test("tổ chức: legalName/address toàn khoảng trắng thành null (không vi phạm CHECK của 0011)", () => {
  const r = validatePartyCreate({ kind: "ORGANIZATION", displayName: "A", legalName: "   ", address: "  " });
  assert.ok(r.ok && r.value.kind === "ORGANIZATION");
  assert.equal(r.value.org.legalName, null);
  assert.equal(r.value.org.address, null);
});

test("liên hệ: nhãn toàn khoảng trắng thành null", () => {
  const r = validateContact({ kind: "PHONE", value: "0901234567", label: "   " });
  assert.ok(r.ok);
  assert.equal(r.value.label, null);
});

// Giới hạn độ dài tên phải chặn Ở ĐÂY (400) chứ không để CHECK của pty_person làm vỡ db.batch() (500) — xem vòng sửa 1 của Task B1.
test("validatePersonFullName: chặn đúng giới hạn 60/100/60 của pty_person", () => {
  const long = (n: number) => "A".repeat(n);
  const tooLongFamily = validatePersonFullName(`${long(65)} Văn Nam`);
  assert.ok(!tooLongFamily.ok && /Họ tối đa 60/.test(tooLongFamily.message), "từ đầu 65 ký tự = họ quá dài");
  const tooLongGiven = validatePersonFullName(`Nguyễn Văn ${long(65)}`);
  assert.ok(!tooLongGiven.ok && /tên tối đa 60/.test(tooLongGiven.message), "từ cuối 65 ký tự = tên quá dài");
  const tooLongMiddle = validatePersonFullName(`Nguyễn ${long(101)} Nam`);
  assert.ok(!tooLongMiddle.ok && /tên đệm tối đa 100/.test(tooLongMiddle.message), "tên đệm 101 ký tự");
  // ca thật reviewer chạy được: 25 từ "Nguyen" (174 ký tự) lọt qua trần 200 cũ nhưng vỡ CHECK middle_name
  const many = validatePersonFullName(Array(25).fill("Nguyen").join(" "));
  assert.ok(!many.ok && /tên đệm tối đa 100/.test(many.message), "nhiều từ dồn vào tên đệm");

  // biên hợp lệ vẫn phải qua
  const okFamilyGiven = validatePersonFullName(`${long(60)} ${long(60)}`);
  assert.ok(okFamilyGiven.ok, "họ 60 + tên 60 vẫn hợp lệ");
  assert.deepEqual(okFamilyGiven.value, { family: long(60), middle: null, given: long(60) });
  const okMiddle = validatePersonFullName(`Nguyễn ${long(100)} Nam`);
  assert.ok(okMiddle.ok && okMiddle.value.middle === long(100), "tên đệm đúng 100 vẫn hợp lệ");
  assert.ok(validatePersonFullName("Nam").ok, "một từ = chỉ có tên");
  assert.ok(!validatePersonFullName("   ").ok, "tên rỗng");
});

test("gán Công ty chủ (= đổi công ty chủ, chủ trả lời 2026-09-28): chỉ hồ sơ tổ chức, không gắn nơi, không ngày kết thúc, bắt đầu hôm nay", () => {
  const vai = (x: Partial<{ locationId: string | null; from: string; to: string | null }> = {}) => ({ roleTypeCode: "OWNER_COMPANY", locationId: null, from: TODAY, to: null, ...x });
  assert.equal(ownerCompanyAssignProblem("ORGANIZATION", vai(), TODAY), null);
  assert.match(ownerCompanyAssignProblem("PERSON", vai(), TODAY)!, /tổ chức/);
  assert.match(ownerCompanyAssignProblem("ORGANIZATION", vai({ locationId: U1 }), TODAY)!, /nơi/);
  assert.match(ownerCompanyAssignProblem("ORGANIZATION", vai({ to: "2026-12-31" }), TODAY)!, /ngày kết thúc/);
  assert.match(ownerCompanyAssignProblem("ORGANIZATION", vai({ from: "2026-09-21" }), TODAY)!, /hôm nay/);
  assert.match(ownerCompanyAssignProblem("ORGANIZATION", vai({ from: "2026-09-19" }), TODAY)!, /hôm nay/);
});

// ADR-0117 lần 1, điều 4 — luật «hồ sơ nội bộ» phương án (a). Vế 1 + 2 (vai) ở parties; vế 3 (tài khoản có quyền nội bộ) do staff báo qua cờ coQuyenNoiBo.
test("ADR-0117: hoSoNoiBo — vai INTERNAL, vai cũ STAFF/SALES, hoặc tài khoản quyền nội bộ; GUIDE cũ và đối tác thuần KHÔNG nội bộ", () => {
  assert.equal(hoSoNoiBo({ vaiMo: [{ code: "SALES_STAFF", group: "INTERNAL" }], coQuyenNoiBo: false }), true);
  assert.equal(hoSoNoiBo({ vaiMo: [{ code: "STAFF", group: "OTHER" }], coQuyenNoiBo: false }), true); // vai cũ
  assert.equal(hoSoNoiBo({ vaiMo: [{ code: "SALES", group: "OTHER" }], coQuyenNoiBo: false }), true); // SALES cũng tính
  assert.equal(hoSoNoiBo({ vaiMo: [{ code: "GUIDE", group: "OTHER" }], coQuyenNoiBo: false }), false); // GUIDE/AGENT không tính
  assert.equal(hoSoNoiBo({ vaiMo: [{ code: "AGENT", group: "OTHER" }], coQuyenNoiBo: false }), false);
  assert.equal(hoSoNoiBo({ vaiMo: [{ code: "HOTEL_RECEPTION", group: "EXTERNAL" }], coQuyenNoiBo: false }), false); // đối tác thuần
  assert.equal(hoSoNoiBo({ vaiMo: [], coQuyenNoiBo: true }), true); // tài khoản quyền nội bộ
  assert.equal(hoSoNoiBo({ vaiMo: [], coQuyenNoiBo: false }), false);
});

test("ADR-0117: VAI_CU_NOI_BO trùng ĐÚNG danh sách mã vai cũ trong trigger của migration *_loai_doi_tac_la_du_lieu (một luật, hai lớp)", () => {
  const dir = new URL("../../../migrations/", import.meta.url);
  const f = readdirSync(dir).find((x) => x.endsWith("_loai_doi_tac_la_du_lieu.sql"));
  assert.ok(f, "thiếu migration loại đối tác");
  const sql = readFileSync(new URL(f, dir), "utf8").replace(/^--.*$/gm, "");
  const lists = [...sql.matchAll(/role_type_code IN \(([^)]*)\)|\.code IN \(([^)]*)\)/g)].map((m) => (m[1] ?? m[2])!.split(",").map((x) => x.trim().replace(/'/g, "")).sort());
  assert.ok(lists.length >= 4, `trigger phải có danh sách mã vai cũ (thấy ${lists.length})`);
  for (const l of lists) assert.deepEqual(l, [...VAI_CU_NOI_BO].sort());
});

// ADR-0117 lần 1, Task 3 — tên loại đối tác do Kế toán thêm và mã do máy chủ sinh.
test("ADR-0117: kiemTenLoaiDoiTac — gọn khoảng trắng, trùng không phân biệt dấu / hoa thường, rỗng / quá dài / có số hay @ thì từ chối", () => {
  assert.deepEqual(kiemTenLoaiDoiTac("  Nhân viên  spa ", ["Khách hàng"]), { ok: true, value: "Nhân viên spa" });
  const trung = kiemTenLoaiDoiTac("nhan vien SPA", ["Nhân viên spa"]);
  assert.equal(trung.ok, false);
  assert.equal(!trung.ok && trung.code, "loai_trung");
  assert.equal(!kiemTenLoaiDoiTac("ĐẠI LÝ", ["đại lý"]).ok, true, "đ/Đ được gấp về d");
  for (const x of ["", "   ", "a", undefined, null, 5, "x".repeat(61)]) {
    const r = kiemTenLoaiDoiTac(x, []);
    assert.equal(r.ok, false, String(x));
    assert.equal(!r.ok && r.code, "invalid_input", String(x));
  }
  assert.equal(kiemTenLoaiDoiTac("x".repeat(60), []).ok, true);
  // Nhật ký ghi tên loại: không cho lọt số điện thoại / email (CLAUDE.md §7).
  for (const x of ["Gọi 0901 234 567", "Lễ tân a@b.vn"]) {
    const r = kiemTenLoaiDoiTac(x, []);
    assert.equal(!r.ok && r.code, "invalid_input", x);
  }
  assert.equal(kiemTenLoaiDoiTac("Tour 2 ngày", []).ok, true, "chữ số ngắn vẫn được");
});

test("ADR-0117: maLoaiDoiTac — LD_ + 8 chữ hoa (CODE_RE của Danh bạ không nhận chữ số)", () => {
  const ma = maLoaiDoiTac(new Uint8Array([0, 1, 25, 26, 255, 100, 7, 99, 42]));
  assert.match(ma, /^LD_[A-Z]{8}$/);
  assert.equal(ma, "LD_ABZAVWHV");
  const re = /^[A-Z][A-Z_]{1,29}$/;
  assert.ok(re.test(ma));
});
