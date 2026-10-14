// Hồ sơ (module parties): tạo/tra cứu/sửa với khoá lạc quan, liên hệ (một liên hệ chính), vai trò theo nơi, quan hệ, nhật ký không lộ dữ liệu cá nhân.
import assert from "node:assert/strict";
import { ACCOUNTS, call, randomPhone, session, vnDate } from "./lib.mjs";

const SALES = await session(ACCOUNTS.salesA);
const ADMIN = await session(ACCOUNTS.admin);
const TOAN_QUYEN = await session(ACCOUNTS.superAdmin); // ADR-0038 điều 6: trang Nhật ký, đặt lại PIN, gỡ Face ID, mở khoá chỉ Toàn quyền
const tag = String(Date.now()).slice(-6);
const phone = randomPhone();
const P = (id) => `/api/parties/${id}`;

// --- phải đăng nhập; danh mục tra cứu
assert.equal((await call(null, "GET", "/api/parties")).status, 401);
let r = await call(SALES, "GET", "/api/parties/meta");
assert.equal(r.status, 200);
// ADR-0018: meta trả MỌI loại vai (kể cả vai cũ đã ngưng) kèm nhóm và trạng thái; vai nội bộ/bên ngoài chỉ gán ở trang Nhân viên.
assert.deepEqual(r.body.roleTypes.map((t) => t.code).sort(), [
  "ACCOUNTANT", "AGENT", "BOAT_CAPTAIN", "CARRIER", "COLLABORATOR", "CUSTOMER", "DIRECTOR", "DRIVER", "DRIVER_EXTERNAL", "DRIVER_INTERNAL", "GUIDE", "GUIDE_FREELANCE", "GUIDE_INTERNAL",
  "HOTEL_RECEPTION", "HR_STAFF", "INTERN", "IT", "OPERATIONS_MANAGER", "OWNER_COMPANY", "SALES", "SALES_STAFF", "STAFF", "SUPPLIER", "TAXI_DRIVER", "TRAVEL_AGENCY", // IT: ADR-0044; OWNER_COMPANY: T2b; DRIVER_INTERNAL: ADR-0040; DRIVER_EXTERNAL, CARRIER: ADR-0048; HR_STAFF: ADR-0071; SUPPLIER: sổ đại lý đợt 1 (migration 0090)
]);
// Sổ đại lý đợt 1 (migration 0090): vai hồ sơ "Nhà cung cấp" — nhóm OTHER, đang dùng (người bán dịch vụ ở /nguoi-ban phải mang vai này).
// ADR-0117 lần 1: mỗi dòng loại vai kèm cờ `partnerLabel` (loại đối tác do Kế toán thêm); mọi loại có sẵn đều false.
assert.deepEqual(r.body.roleTypes.find((t) => t.code === "SUPPLIER"), { code: "SUPPLIER", name: "Nhà cung cấp", group: "OTHER", active: true, partnerLabel: false });
// ADR-0040 D3 (Ruling R1, R12): vai tài khoản "Tài xế công ty" (nhóm Nội bộ); mã vai hồ sơ cũ DRIVER ngưng gán mới (migration *_vai_quyen_tai_xe).
assert.deepEqual(r.body.roleTypes.find((t) => t.code === "DRIVER_INTERNAL"), { code: "DRIVER_INTERNAL", name: "Tài xế công ty", group: "INTERNAL", active: true, partnerLabel: false });
// ADR-0048 D2: vai tài khoản "Tài xế đối tác" (nhóm Bên ngoài, migration *_tai_xe_doi_tac).
assert.deepEqual(r.body.roleTypes.find((t) => t.code === "DRIVER_EXTERNAL"), { code: "DRIVER_EXTERNAL", name: "Tài xế đối tác", group: "EXTERNAL", active: true, partnerLabel: false });
assert.equal(r.body.roleTypes.find((t) => t.code === "DRIVER").active, false);
assert.deepEqual(r.body.roleTypes.find((t) => t.code === "SALES_STAFF"), { code: "SALES_STAFF", name: "Nhân viên kinh doanh", group: "INTERNAL", active: true, partnerLabel: false });
assert.equal(r.body.roleTypes.find((t) => t.code === "STAFF").active, false);
// ADR-0024 điều 6 (T2b): vai "Công ty chủ" — nhóm OTHER, ngưng gán thường (active = false): ô "Thêm công việc" chung không liệt kê (Ruling T2 của nhật ký thi công T2b).
assert.deepEqual(r.body.roleTypes.find((t) => t.code === "OWNER_COMPANY"), { code: "OWNER_COMPANY", name: "Công ty chủ", group: "OTHER", active: false, partnerLabel: false });
// ADR-0048 D1: vai hồ sơ "Nhà xe đối tác" (nhóm OTHER, đang dùng — tự hiện ở ô "Thêm công việc") và quan hệ "Tài xế của" (migration *_nha_xe_doi_tac).
assert.deepEqual(r.body.roleTypes.find((t) => t.code === "CARRIER"), { code: "CARRIER", name: "Nhà xe đối tác", group: "OTHER", active: true, partnerLabel: false });
assert.deepEqual(r.body.relationshipTypes.map((t) => t.code), ["CONTACT_OF", "DRIVES_FOR"]);
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

// --- liên hệ chính tự đặt: liên hệ ĐẦU TIÊN của một loại, và liên hệ thêm sau khi liên hệ chính đã ĐÓNG (không để hồ sơ kẹt "không có liên hệ chính")
r = await call(SALES, "POST", "/api/parties", { kind: "PERSON", fullName: `Phạm Chính ${tag}` });
assert.equal(r.status, 201);
const C = r.body.party;
const cPhone1 = randomPhone(), cPhone2 = randomPhone(), cPhone3 = randomPhone();
r = await call(SALES, "POST", `${P(C.id)}/contacts`, { kind: "PHONE", value: cPhone1 });
assert.equal(r.status, 201); assert.equal(r.body.party.primaryPhone, cPhone1, "liên hệ đầu tiên của một loại tự thành chính");
r = await call(SALES, "POST", `${P(C.id)}/contacts`, { kind: "PHONE", value: cPhone2 });
assert.equal(r.body.party.primaryPhone, cPhone1, "còn liên hệ chính đang mở thì liên hệ thêm KHÔNG tự thành chính");
const cPrimary = r.body.party.contacts.find((x) => x.kind === "PHONE" && x.isPrimary && !x.validTo);
r = await call(SALES, "POST", `${P(C.id)}/contacts/${cPrimary.id}/end`, {});
assert.equal(r.status, 200); assert.equal(r.body.party.primaryPhone, null, "đóng liên hệ chính: hồ sơ tạm thời không có liên hệ chính");
r = await call(SALES, "POST", `${P(C.id)}/contacts`, { kind: "PHONE", value: cPhone3 });
assert.equal(r.status, 201);
assert.equal(r.body.party.primaryPhone, cPhone3, "sau khi đóng liên hệ chính, liên hệ mới lại tự thành chính dù còn dòng phụ đang mở");
assert.equal(r.body.party.contacts.filter((x) => x.kind === "PHONE" && x.isPrimary && !x.validTo).length, 1);
console.log("✓ liên hệ chính tự đặt sau khi đóng liên hệ chính");

// --- vai trò theo nơi: chỉ quản trị viên; trùng đang mở → 409; nơi khác độc lập; đóng lại
// Loại công việc ĐANG DÙNG (Lái cano): GUIDE đã ngưng từ 0024 và máy chủ từ chối gán mới loại đã ngưng (ADR-0040 D3, Ruling R6 — ca riêng ở dưới).
const role = { roleTypeCode: "BOAT_CAPTAIN", locationId: vinpearl.id };
assert.equal((await call(SALES, "POST", `${P(A.id)}/roles`, role)).status, 403);
r = await call(ADMIN, "POST", `${P(A.id)}/roles`, role);
assert.equal(r.status, 201, JSON.stringify(r.body));
const guide = r.body.party.roles.find((x) => x.roleTypeCode === "BOAT_CAPTAIN");
assert.equal(guide.locationName, "Bến cảng Vinpearl"); assert.equal(guide.validTo, null); assert.deepEqual(r.body.party.roleCodes, ["BOAT_CAPTAIN"]);
r = await call(ADMIN, "POST", `${P(A.id)}/roles`, role);
assert.equal(r.status, 409); assert.equal(r.body.error.code, "role_overlap");
assert.equal((await call(ADMIN, "POST", `${P(A.id)}/roles`, { roleTypeCode: "BOAT_CAPTAIN", locationId: pier.id })).status, 201, "nơi khác độc lập");
assert.equal((await call(ADMIN, "POST", `${P(A.id)}/roles`, { roleTypeCode: "BOAT_CAPTAIN", locationId: "00000000-0000-0000-0000-000000000000" })).status, 400, "nơi không tồn tại");
assert.equal((await call(ADMIN, "POST", `${P(A.id)}/roles`, { roleTypeCode: "KHONG_CO" })).status, 400, "loại vai trò không tồn tại");
assert.equal((await call(ADMIN, "POST", `${P(A.id)}/roles`, { roleTypeCode: "DRIVER", validFrom: "2026-02-30" })).status, 400);
// ADR-0040 D3 + Ruling R6: loại công việc đã ngưng (GUIDE, DRIVER cũ…) không gán mới được qua API — 409 role_type_inactive (trước đây chỉ bị ẩn ở giao diện).
for (const code of ["GUIDE", "DRIVER"]) {
  const x = await call(ADMIN, "POST", `${P(A.id)}/roles`, { roleTypeCode: code });
  assert.equal(x.status, 409, `${code}: ${JSON.stringify(x.body)}`);
  assert.equal(x.body.error.code, "role_type_inactive");
}

// ADR-0018: vai quyết định quyền đăng nhập không gán/gỡ ở trang Hồ sơ.
for (const code of ["SALES_STAFF", "COLLABORATOR"]) {
  const x = await call(ADMIN, "POST", `${P(A.id)}/roles`, { roleTypeCode: code });
  assert.equal(x.status, 409, `${code}: ${JSON.stringify(x.body)}`);
  assert.equal(x.body.error.code, "role_via_account");
}
console.log("✓ vai nội bộ/bên ngoài chỉ gán ở trang Nhân viên");

// Truy vấn của đợt N1: ai giữ vai HDV ở Bến cảng Vinpearl hôm nay
r = await call(SALES, "GET", `/api/parties?role=BOAT_CAPTAIN&location=${vinpearl.id}`);
assert.deepEqual(r.body.parties.map((p) => p.id), [A.id]);
assert.equal((await call(SALES, "GET", `/api/parties?role=DRIVER&location=${vinpearl.id}`)).body.parties.length, 0);
// vai đã kết thúc TRƯỚC hôm nay thì không còn "hôm nay"
r = await call(ADMIN, "POST", `${P(ORG.id)}/roles`, { roleTypeCode: "BOAT_CAPTAIN", locationId: vinpearl.id, validFrom: vnDate(-10) });
assert.equal(r.status, 201);
const past = r.body.party.roles[0];
r = await call(ADMIN, "POST", `${P(ORG.id)}/roles/${past.id}/end`, { validTo: vnDate(-1) });
assert.equal(r.status, 200);
assert.deepEqual((await call(SALES, "GET", `/api/parties?role=BOAT_CAPTAIN&location=${vinpearl.id}`)).body.parties.map((p) => p.id), [A.id], "vai đã hết hạn không còn trong kết quả hôm nay");
assert.equal((await call(ADMIN, "POST", `${P(ORG.id)}/roles/${past.id}/end`, {})).status, 409, "đã đóng");
assert.equal((await call(SALES, "POST", `${P(A.id)}/roles/${guide.id}/end`, {})).status, 403);
console.log("✓ vai trò theo nơi + truy vấn Lái cano @ Bến cảng Vinpearl; loại đã ngưng → 409 role_type_inactive");

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
r = await call(TOAN_QUYEN, "GET", "/api/audit?limit=100&q=" + encodeURIComponent(""));
const partyLogs = r.body.entries.filter((e) => e.targetType === "party");
for (const a of ["party_created", "party_updated", "party_contact_changed", "party_role_added", "party_role_ended", "party_relationship_changed"]) assert.ok(partyLogs.some((e) => e.action === a), `thiếu ${a}`);
const dump = JSON.stringify(r.body);
for (const secret of [phone, phone.slice(1), "Phong.Test@Example.com", "phong.test@example.com", "0312345678", "ketoan@thu.vn"]) assert.ok(!dump.includes(secret), `nhật ký lộ dữ liệu cá nhân: ${secret}`);
assert.equal(partyLogs.filter((e) => e.action === "party_updated" && e.targetId === A.id).length, 2, "hai lần sửa thành công của A (bên thua khoá lạc quan không ghi)");
console.log("✓ nhật ký, không lộ dữ liệu cá nhân");

// --- ADR-0013: hồ sơ gắn tài khoản chỉ quản trị cấp trên sửa (trên D1 local thật, qua wrangler dev)
const salesParty = (await call(SALES, "GET", "/api/auth/me")).body.staff.partyId; // StaffProfile.partyId (src/shared/contracts.ts)
let sp = (await call(SALES, "GET", P(salesParty))).body.party;
assert.equal(sp.accountLinked, true); assert.equal(sp.editable, false);
const OTHER = await session(ACCOUNTS.salesB);
assert.equal((await call(OTHER, "PUT", P(salesParty), { familyName: null, middleName: null, givenName: "Mạo Danh", active: true, expectedUpdatedAt: sp.updatedAt })).status, 403);
assert.equal((await call(OTHER, "POST", `${P(salesParty)}/contacts`, { kind: "PHONE", value: randomPhone() })).status, 403);
sp = (await call(ADMIN, "GET", P(salesParty))).body.party;
assert.equal(sp.editable, true);
assert.equal((await call(ADMIN, "PUT", P(salesParty), { familyName: sp.familyName, middleName: sp.middleName, givenName: sp.givenName, active: false, expectedUpdatedAt: sp.updatedAt })).status, 409);
assert.equal((await call(ADMIN, "PUT", P(salesParty), { familyName: sp.familyName, middleName: sp.middleName, givenName: sp.givenName, active: true, expectedUpdatedAt: sp.updatedAt })).status, 200);
console.log("✓ ADR-0013: hồ sơ có tài khoản — SALES 403, ADMIN sửa được, không đổi 'đang dùng' (409)");

// --- ADR-0013: SUPER_ADMIN sửa được hồ sơ ADMIN; ADMIN không sửa được hồ sơ SUPER_ADMIN
const SUPER = await session(ACCOUNTS.superAdmin);
const adminParty = (await call(ADMIN, "GET", "/api/auth/me")).body.staff.partyId;
const superParty = (await call(SUPER, "GET", "/api/auth/me")).body.staff.partyId;
let ap = (await call(SUPER, "GET", P(adminParty))).body.party;
assert.equal(ap.editable, true);
assert.equal((await call(SUPER, "PUT", P(adminParty), { familyName: ap.familyName, middleName: ap.middleName, givenName: ap.givenName, active: true, expectedUpdatedAt: ap.updatedAt })).status, 200);
let spr = (await call(ADMIN, "GET", P(superParty))).body.party;
assert.equal(spr.editable, false);
assert.equal((await call(ADMIN, "PUT", P(superParty), { familyName: spr.familyName, middleName: spr.middleName, givenName: "Mạo Danh", active: true, expectedUpdatedAt: spr.updatedAt })).status, 403);
console.log("✓ ADR-0013: SUPER_ADMIN sửa ADMIN được; ADMIN sửa SUPER_ADMIN bị chặn (403)");


// Chữ tìm dài ở bốn ô tìm (2026-10-13): D1 từ chối mẫu LIKE > 50 byte ("LIKE or GLOB pattern too complex") — trước đây các GET này trả 500. Nay máy chủ cắt chữ
// theo byte (mauLikeChua) nên vẫn 200. Bằng chứng trên D1 thật (local) mà khung thử SQLite không cho được; cùng khuôn với ca cuối của orders.mjs.
{
  const chuDai = ["Nguyễn Thị Phượng Hoàng Yến Nhi Thanh Tâm", "ệ".repeat(100), "x".repeat(100), "%".repeat(100), "0123456789".repeat(10)];
  for (const [ten, who, duong] of [
    ["hồ sơ", ADMIN, "/api/parties?q="],
    ["nhật ký", TOAN_QUYEN, "/api/audit?q="],
    ["tìm người hưởng", SALES, "/api/pricing/nguoi-huong?q="],
    ["lịch sử trợ lý", TOAN_QUYEN, "/api/tro-ly/lich-su?q="],
  ]) {
    for (const q of chuDai) {
      const kq = await call(who, "GET", duong + encodeURIComponent(q));
      assert.equal(kq.status, 200, `${ten}: q ${q.length} ký tự phải 200, không 500: ${JSON.stringify(kq.body)}`);
    }
  }
  console.log("✓ bốn ô tìm (hồ sơ, nhật ký, người hưởng, lịch sử trợ lý): chữ tìm dài → 200, không 500");
}

console.log("E2E PARTIES OK");
