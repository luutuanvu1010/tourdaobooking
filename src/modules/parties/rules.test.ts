import { test } from "node:test";
import assert from "node:assert/strict";
import {
  composePersonName, splitPersonName, validateContact, validateContactList, validateEndDate, validatePartyCreate, validatePartyUpdate,
  validatePeriod, validatePersonFullName, validateRelationship, validateRole, PARTY_ID_RE, ROW_ID_RE,
} from "./rules.ts";

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
