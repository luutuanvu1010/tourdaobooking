// Hồ sơ (module parties): tạo/tra cứu/sửa với khoá lạc quan, liên hệ (một liên hệ chính), vai trò theo nơi, quan hệ, nhật ký không lộ dữ liệu cá nhân.
import assert from "node:assert/strict";
import { ACCOUNTS, call, randomPhone, session, vnDate } from "./lib.mjs";

const SALES = await session(ACCOUNTS.salesA);
const ADMIN = await session(ACCOUNTS.admin);
const tag = String(Date.now()).slice(-6);
const phone = randomPhone();
const P = (id) => `/api/parties/${id}`;

// --- phải đăng nhập; danh mục tra cứu
assert.equal((await call(null, "GET", "/api/parties")).status, 401);
let r = await call(SALES, "GET", "/api/parties/meta");
assert.equal(r.status, 200);
assert.deepEqual(r.body.roleTypes.map((t) => t.code).sort(), ["ACCOUNTANT", "AGENT", "BOAT_CAPTAIN", "CUSTOMER", "DRIVER", "GUIDE", "SALES", "STAFF"]);
assert.deepEqual(r.body.relationshipTypes.map((t) => t.code), ["CONTACT_OF"]);
const locations = (await call(SALES, "GET", "/api/locations")).body.locations;
const vinpearl = locations.find((l) => l.code === "CANG_VINPEARL");
const pier = locations.find((l) => l.code === "BEN_TAU_NHA_TRANG");
console.log("✓ danh mục vai trò/quan hệ");

// --- tạo cá nhân (fullName được tách) kèm liên hệ; SALES tạo được
r = await call(SALES, "POST", "/api/parties", { kind: "PERSON", fullName: `  Nguyễn   Thử ${tag}  Phong `, contacts: [{ kind: "PHONE", value: phone.replace(/^0/, "+84 "), label: "Zalo" }, { kind: "EMAIL", value: "Phong.Test@Example.com" }] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const A = r.body.party;
assert.equal(A.kind, "PERSON"); assert.equal(A.displayName, `Nguyễn Thử ${tag} Phong`);
assert.equal(A.familyName, "Nguyễn"); assert.equal(A.middleName, `Thử ${tag}`); assert.equal(A.givenName, "Phong");
assert.equal(A.primaryPhone, phone.replace(/^0/, "+84 ")); assert.deepEqual(A.roleCodes, []); assert.equal(A.active, true);
assert.equal(A.contacts.length, 2); assert.ok(A.contacts.every((c) => c.isPrimary && c.validTo === null));
console.log("✓ tạo cá nhân + tách tên + liên hệ chính tự đặt");

// --- đầu vào sai
for (const bad of [{}, { kind: "ROBOT" }, { kind: "PERSON" }, { kind: "PERSON", fullName: "A", contacts: [{ kind: "PHONE", value: "123" }] }, { kind: "ORGANIZATION" }, { kind: "ORGANIZATION", displayName: "X", taxCode: "12" }]) {
  assert.equal((await call(SALES, "POST", "/api/parties", bad)).status, 400, JSON.stringify(bad));
}
assert.equal((await call(SALES, "GET", P("khong-phai-id"))).status, 404);
assert.equal((await call(SALES, "GET", P("00000000-0000-0000-0000-000000000000"))).status, 404);
console.log("✓ đầu vào sai, 404");

// --- tra cứu trùng SĐT: tạo hồ sơ thứ hai cùng số là HỢP LỆ (ADR-0001 mục 8), tra cứu trả cả hai
r = await call(SALES, "POST", "/api/parties", { kind: "PERSON", fullName: `Trần Trùng ${tag}`, contacts: [{ kind: "PHONE", value: phone }] });
assert.equal(r.status, 201);
const B = r.body.party;
r = await call(SALES, "GET", `/api/parties/lookup?phone=${encodeURIComponent(phone.replace(/^0/, "+84 "))}`);
assert.equal(r.status, 200);
assert.deepEqual(r.body.matches.map((m) => m.id).sort(), [A.id, B.id].sort());
assert.equal((await call(SALES, "GET", "/api/parties/lookup?phone=abc")).status, 400);
assert.deepEqual((await call(SALES, "GET", `/api/parties/lookup?phone=${randomPhone()}`)).body.matches, []);
console.log("✓ tra cứu trùng SĐT (không chặn tạo)");

// --- tổ chức (đại lý) + MST
r = await call(SALES, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: `Đại lý Thử ${tag}`, legalName: "Công ty TNHH Thử", taxCode: "0312 345 678", invoiceEmail: "KeToan@Thu.vn", address: "1 Trần Phú" });
assert.equal(r.status, 201, JSON.stringify(r.body));
const ORG = r.body.party;
assert.equal(ORG.kind, "ORGANIZATION"); assert.equal(ORG.taxCode, "0312345678"); assert.equal(ORG.invoiceEmail, "ketoan@thu.vn"); assert.equal(ORG.givenName, null);
console.log("✓ tạo tổ chức");

// --- danh sách + tìm kiếm (tên có dấu/không phân biệt hoa thường, SĐT theo chữ số), lọc loại
r = await call(SALES, "GET", `/api/parties?q=${encodeURIComponent(`thử ${tag}`)}`);
assert.ok(r.body.parties.some((p) => p.id === A.id) && r.body.parties.some((p) => p.id === ORG.id));
r = await call(SALES, "GET", `/api/parties?q=${phone.slice(3)}`);
assert.ok(r.body.parties.some((p) => p.id === A.id) && r.body.parties.some((p) => p.id === B.id), "tìm theo SĐT");
r = await call(SALES, "GET", `/api/parties?q=${encodeURIComponent(`thử ${tag}`)}&kind=ORGANIZATION`);
assert.deepEqual(r.body.parties.map((p) => p.id), [ORG.id]);
assert.equal((await call(SALES, "GET", "/api/parties?kind=ROBOT")).status, 400);
assert.equal((await call(SALES, "GET", "/api/parties?q=%25")).body.parties.length, 0, "ký tự LIKE được escape");
console.log("✓ danh sách + tìm kiếm");

// --- sửa với khoá lạc quan; tên hiển thị ghép lại từ ba phần
const edit = { fullName: `Nguyễn Thử ${tag} Phong Đã Sửa`, active: true, expectedUpdatedAt: A.updatedAt };
r = await call(SALES, "PUT", P(A.id), edit);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.party.displayName, `Nguyễn Thử ${tag} Phong Đã Sửa`); assert.equal(r.body.party.givenName, "Sửa"); assert.equal(r.body.party.middleName, `Thử ${tag} Phong Đã`);
assert.notEqual(r.body.party.updatedAt, A.updatedAt);
r = await call(SALES, "PUT", P(A.id), { ...edit, fullName: "Từ tab cũ" }); // mốc cũ
assert.equal(r.status, 409); assert.equal(r.body.error.code, "stale");
assert.equal((await call(SALES, "GET", P(A.id))).body.party.displayName, `Nguyễn Thử ${tag} Phong Đã Sửa`, "bên thua không để lại thay đổi nào");
assert.equal((await call(SALES, "PUT", P(A.id), { ...edit, expectedUpdatedAt: undefined })).status, 400);
console.log("✓ sửa + khoá lạc quan");

// --- hai request song song cùng mốc: đúng MỘT bên thắng, hồ sơ nhất quán (tên hiển thị khớp ba phần)
const cur = (await call(SALES, "GET", P(A.id))).body.party;
const [x, y] = await Promise.all([
  call(SALES, "PUT", P(A.id), { fullName: `Lê Song ${tag} Một`, active: true, expectedUpdatedAt: cur.updatedAt }),
  call(ADMIN, "PUT", P(A.id), { fullName: `Vũ Song ${tag} Hai`, active: true, expectedUpdatedAt: cur.updatedAt }),
]);
assert.deepEqual([x.status, y.status].sort(), [200, 409], `song song: ${x.status} ${y.status}`);
const after = (await call(SALES, "GET", P(A.id))).body.party;
assert.equal(after.displayName, [after.familyName, after.middleName, after.givenName].filter(Boolean).join(" "), "tên hiển thị khớp ba phần");
assert.equal(after.displayName, (x.status === 200 ? x : y).body.party.displayName);
console.log("✓ song song: một bên thắng, dữ liệu nhất quán");

// --- ngưng (không xoá): mặc định ẩn khỏi danh sách, includeInactive=1 thì hiện
r = await call(SALES, "PUT", P(B.id), { fullName: B.displayName, active: false, expectedUpdatedAt: B.updatedAt });
assert.equal(r.status, 200); assert.equal(r.body.party.active, false);
assert.ok(!(await call(SALES, "GET", `/api/parties?q=${phone.slice(3)}`)).body.parties.some((p) => p.id === B.id));
assert.ok((await call(SALES, "GET", `/api/parties?q=${phone.slice(3)}&includeInactive=1`)).body.parties.some((p) => p.id === B.id));
console.log("✓ ngưng dùng thay cho xoá");

// --- liên hệ: một liên hệ chính đang mở mỗi loại; thêm chính mới thì hạ chính cũ; đóng không xoá
const phone2 = randomPhone();
r = await call(SALES, "POST", `${P(A.id)}/contacts`, { kind: "PHONE", value: phone2 });
assert.equal(r.status, 201);
assert.equal(r.body.party.contacts.filter((c) => c.kind === "PHONE" && c.isPrimary && !c.validTo).length, 1);
assert.equal(r.body.party.primaryPhone, cur.primaryPhone, "liên hệ thêm sau không tự thành chính");
r = await call(SALES, "POST", `${P(A.id)}/contacts`, { kind: "PHONE", value: randomPhone(), isPrimary: true });
assert.equal(r.status, 201);
const primaries = r.body.party.contacts.filter((c) => c.kind === "PHONE" && c.isPrimary && !c.validTo);
assert.equal(primaries.length, 1, "vẫn đúng một liên hệ chính đang mở");
assert.notEqual(r.body.party.primaryPhone, cur.primaryPhone, "chính mới thay chính cũ");
assert.equal((await call(SALES, "POST", `${P(A.id)}/contacts`, { kind: "PHONE", value: "12" })).status, 400);
const toEnd = r.body.party.contacts.find((c) => c.kind === "PHONE" && !c.isPrimary && !c.validTo);
r = await call(SALES, "POST", `${P(A.id)}/contacts/${toEnd.id}/end`, {});
assert.equal(r.status, 200); assert.ok(r.body.party.contacts.find((c) => c.id === toEnd.id).validTo);
assert.equal((await call(SALES, "POST", `${P(A.id)}/contacts/${toEnd.id}/end`, {})).status, 409, "đóng lần hai");
assert.equal((await call(SALES, "POST", `${P(A.id)}/contacts/khong-phai-id/end`, {})).status, 404);
console.log("✓ liên hệ");

// --- vai trò theo nơi: chỉ quản trị viên; trùng đang mở → 409; nơi khác độc lập; đóng lại
const role = { roleTypeCode: "GUIDE", locationId: vinpearl.id };
assert.equal((await call(SALES, "POST", `${P(A.id)}/roles`, role)).status, 403);
r = await call(ADMIN, "POST", `${P(A.id)}/roles`, role);
assert.equal(r.status, 201, JSON.stringify(r.body));
const guide = r.body.party.roles.find((x) => x.roleTypeCode === "GUIDE");
assert.equal(guide.locationName, "Bến cảng Vinpearl"); assert.equal(guide.validTo, null); assert.deepEqual(r.body.party.roleCodes, ["GUIDE"]);
r = await call(ADMIN, "POST", `${P(A.id)}/roles`, role);
assert.equal(r.status, 409); assert.equal(r.body.error.code, "role_overlap");
assert.equal((await call(ADMIN, "POST", `${P(A.id)}/roles`, { roleTypeCode: "GUIDE", locationId: pier.id })).status, 201, "nơi khác độc lập");
assert.equal((await call(ADMIN, "POST", `${P(A.id)}/roles`, { roleTypeCode: "GUIDE", locationId: "00000000-0000-0000-0000-000000000000" })).status, 400, "nơi không tồn tại");
assert.equal((await call(ADMIN, "POST", `${P(A.id)}/roles`, { roleTypeCode: "KHONG_CO" })).status, 400, "loại vai trò không tồn tại");
assert.equal((await call(ADMIN, "POST", `${P(A.id)}/roles`, { roleTypeCode: "DRIVER", validFrom: "2026-02-30" })).status, 400);

// Truy vấn của đợt N1: ai giữ vai HDV ở Bến cảng Vinpearl hôm nay
r = await call(SALES, "GET", `/api/parties?role=GUIDE&location=${vinpearl.id}`);
assert.deepEqual(r.body.parties.map((p) => p.id), [A.id]);
assert.equal((await call(SALES, "GET", `/api/parties?role=DRIVER&location=${vinpearl.id}`)).body.parties.length, 0);
// vai đã kết thúc TRƯỚC hôm nay thì không còn "hôm nay"
r = await call(ADMIN, "POST", `${P(ORG.id)}/roles`, { roleTypeCode: "GUIDE", locationId: vinpearl.id, validFrom: vnDate(-10) });
assert.equal(r.status, 201);
const past = r.body.party.roles[0];
r = await call(ADMIN, "POST", `${P(ORG.id)}/roles/${past.id}/end`, { validTo: vnDate(-1) });
assert.equal(r.status, 200);
assert.deepEqual((await call(SALES, "GET", `/api/parties?role=GUIDE&location=${vinpearl.id}`)).body.parties.map((p) => p.id), [A.id], "vai đã hết hạn không còn trong kết quả hôm nay");
assert.equal((await call(ADMIN, "POST", `${P(ORG.id)}/roles/${past.id}/end`, {})).status, 409, "đã đóng");
assert.equal((await call(SALES, "POST", `${P(A.id)}/roles/${guide.id}/end`, {})).status, 403);
console.log("✓ vai trò theo nơi + truy vấn HDV @ Bến cảng Vinpearl");

// --- quan hệ: người liên hệ của đại lý
const rel = { fromPartyId: A.id, toPartyId: ORG.id, relationshipTypeCode: "CONTACT_OF" };
assert.equal((await call(SALES, "POST", `${P(ORG.id)}/relationships`, rel)).status, 403);
r = await call(ADMIN, "POST", `${P(ORG.id)}/relationships`, rel);
assert.equal(r.status, 201, JSON.stringify(r.body));
const link = r.body.party.relationships[0];
assert.equal(link.fromPartyId, A.id); assert.equal(link.toPartyId, ORG.id); assert.equal(link.typeName, "Người liên hệ của");
assert.equal((await call(ADMIN, "POST", `${P(ORG.id)}/relationships`, rel)).status, 409, "trùng đang mở");
assert.equal((await call(ADMIN, "POST", `${P(ORG.id)}/relationships`, { ...rel, toPartyId: A.id, fromPartyId: A.id })).status, 400, "tự quan hệ");
assert.equal((await call(ADMIN, "POST", `${P(ORG.id)}/relationships`, { ...rel, fromPartyId: B.id, toPartyId: A.id })).status, 400, "hồ sơ đang xem không ở đầu nào");
assert.ok((await call(SALES, "GET", P(A.id))).body.party.relationships.some((x) => x.id === link.id), "thấy được từ cả hai đầu");
assert.equal((await call(ADMIN, "POST", `${P(ORG.id)}/relationships/${link.id}/end`, {})).status, 200);
assert.equal((await call(ADMIN, "POST", `${P(ORG.id)}/relationships/${link.id}/end`, {})).status, 409);
console.log("✓ quan hệ");

// --- nhật ký: có dòng theo loại đối tượng "party"; KHÔNG lộ SĐT/email/MST
r = await call(ADMIN, "GET", "/api/audit?limit=100&q=" + encodeURIComponent(""));
const partyLogs = r.body.entries.filter((e) => e.targetType === "party");
for (const a of ["party_created", "party_updated", "party_contact_changed", "party_role_added", "party_role_ended", "party_relationship_changed"]) assert.ok(partyLogs.some((e) => e.action === a), `thiếu ${a}`);
const dump = JSON.stringify(r.body);
for (const secret of [phone, phone.slice(1), "Phong.Test@Example.com", "phong.test@example.com", "0312345678", "ketoan@thu.vn"]) assert.ok(!dump.includes(secret), `nhật ký lộ dữ liệu cá nhân: ${secret}`);
assert.equal(partyLogs.filter((e) => e.action === "party_updated" && e.targetId === A.id).length, 2, "hai lần sửa thành công của A (bên thua khoá lạc quan không ghi)");
console.log("✓ nhật ký, không lộ dữ liệu cá nhân");
console.log("E2E PARTIES OK");
