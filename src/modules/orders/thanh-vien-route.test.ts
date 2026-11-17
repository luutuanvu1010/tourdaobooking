// ADR-0213 Đ5, Đ8 + «Sửa ADR cũ» (nới ADR-0135 — ngoại lệ có tên), mốc B2 đợt 2 đăng ký, Task 16, qua route thật (tests/audit/harness.mjs — cả ứng dụng trên SQLite thật). Mọi giá trị là GIẢ.
// Thành viên thay mặt tổ chức lập nháp; chế độ «Chỉ soạn» / «Soạn và gửi người quản lý xác nhận»; người quản lý gửi lên Tour Đảo hoặc trả lại; tin đích danh; thành viên bị gỡ khi nháp đang chờ
// (Review Focus 5). Toàn quyền, văn phòng, thành viên khác không thấy nháp của thành viên (404).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const SM = "11111111-1111-4111-8111-111111111112"; // Quản lý bán hàng
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const NAM = "66666666-6666-4666-8666-666666666601"; // người quản lý của Sunrise
const TV = "66666666-6666-4666-8666-666666666603"; // thành viên A
const TV2 = "66666666-6666-4666-8666-666666666605"; // thành viên B
const SUNRISE = "dda00000-0000-4000-8000-0000000000a1";
const AT = "2026-10-01T00:00:00.000Z";

type W = ReturnType<typeof world>;
function lienKet(w: W, person: string, org: string, loai: "MANAGER_OF" | "MEMBER_OF"): void {
  w.sqlite.prepare("INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, ?, '2026-10-01', ?, ?)")
    .run(`lk-${person}-${org}`, person, org, loai, AT, AT);
}
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const thanDon = (extra: Record<string, unknown> = {}) => ({
  customerName: "Khách Thử", customerPhone: "0912345678",
  services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(4) }],
  ...extra,
});
const mocCua = (w: W, id: string): string => w.q("SELECT updated_at AS u FROM orders WHERE id = ?", id)[0].u;
const luu = (w: W, as: string, id: string, extra: Record<string, unknown> = {}) => w.call("PUT", `/api/orders/${id}`, { as, body: thanDon({ expectedUpdatedAt: mocCua(w, id), ...extra }) });
async function lap(w: W, as: string, extra: Record<string, unknown> = { tuCach: SUNRISE }): Promise<string> {
  const r = await w.call("POST", "/api/orders", { as, body: thanDon(extra) });
  assert.equal(r.status, 201, r.text);
  return r.json.order.id as string;
}
const cheDo = (w: W, as: string, giaTri: string) => w.call("PUT", `/api/to-chuc/${SUNRISE}/che-do`, { as, body: { cheDo: giaTri } });
const guiQl = (w: W, as: string, id: string) => w.call("POST", `/api/orders/${id}/gui-quan-ly`, { as, body: {} });
const rutQl = (w: W, as: string, id: string) => w.call("POST", `/api/orders/${id}/rut-gui-quan-ly`, { as, body: {} });
const traLai = (w: W, as: string, id: string, lyDo: unknown = "SAI_NGAY") => w.call("POST", `/api/orders/${id}/tra-lai`, { as, body: { lyDo } });
const xem = async (w: W, as: string, id: string): Promise<number> => (await w.call("GET", `/api/orders/${id}`, { as })).status;
const cho = (w: W, id: string) => w.q("SELECT status, reason_code, member_staff_id, org_party_id, closed_by FROM ord_member_submit WHERE order_id = ? ORDER BY opened_at, rowid", id).map((r: object) => ({ ...r }));
const nk = (w: W, action: string) => w.q("SELECT staff_id, order_id, target_type, target_id, detail FROM audit_log WHERE action = ? ORDER BY created_at, rowid", action).map((r: object) => ({ ...r }));

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SM, phone: "0900000002", name: "Minh Quản Lý Bán", perms: ["SALES", "SALES_MANAGER"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: NAM, phone: "0900000021", name: "Nam Lễ Tân", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: TV, phone: "0900000023", name: "Tú Thành Viên", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: TV2, phone: "0900000025", name: "Vy Thành Viên", perms: ["PARTNER"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'Khách sạn Sunrise', 1, ?, ?)").run(SUNRISE, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`r-${SUNRISE}`, SUNRISE, AT, AT);
  lienKet(w, `pty-${NAM}`, SUNRISE, "MANAGER_OF");
  lienKet(w, `pty-${TV}`, SUNRISE, "MEMBER_OF");
  lienKet(w, `pty-${TV2}`, SUNRISE, "MEMBER_OF");
  return w;
}

test("PF30: thành viên thấy tổ chức trong ô Tư cách và lập nháp thay mặt tổ chức — bên đặt là tổ chức, acting_link_kind = MEMBER, người lập là thành viên", async () => {
  const w = setup();
  const ds = await w.call("GET", "/api/to-chuc/cua-toi", { as: TV });
  assert.equal(ds.status, 200, ds.text);
  assert.ok(ds.json.tuCach.some((t: { partyId: string; laToChuc: boolean }) => t.partyId === SUNRISE && t.laToChuc), ds.text);
  const id = await lap(w, TV);
  assert.deepEqual({ ...w.q("SELECT staff_id, booker_party_id, acting_party_id, acting_link_kind FROM orders WHERE id = ?", id)[0] },
    { staff_id: TV, booker_party_id: SUNRISE, acting_party_id: SUNRISE, acting_link_kind: "MEMBER" });
  // Đ8.7: tổ chức không còn người quản lý có hiệu lực ⇒ thành viên vẫn thay mặt được (lập nháp).
  w.sqlite.prepare("UPDATE staff SET active = 0 WHERE id = ?").run(NAM);
  await lap(w, TV);
});

test("Đặt chế độ (Đ8.3): người quản lý có hiệu lực và Toàn quyền được; Quản trị, Quản lý bán hàng, Bán hàng, thành viên ⇒ 403; giá trị lạ ⇒ 400; có nhật ký đích tổ chức", async () => {
  const w = setup();
  for (const ai of [ADM, SM, SALES, TV]) assert.equal((await cheDo(w, ai, "CHI_SOAN")).status, 403, ai);
  assert.equal((await cheDo(w, NAM, "KHAC")).status, 400);
  const a = await cheDo(w, NAM, "CHI_SOAN");
  assert.equal(a.status, 200, a.text);
  assert.equal(a.json.cheDo, "CHI_SOAN");
  const b = await cheDo(w, SUP, "SOAN_VA_GUI");
  assert.equal(b.status, 200, b.text);
  const dong = nk(w, "org_member_mode_set");
  assert.equal(dong.length, 2);
  assert.deepEqual(dong.map((d: { staff_id: string; target_type: string; target_id: string }) => [d.staff_id, d.target_type, d.target_id]), [[NAM, "party", SUNRISE], [SUP, "party", SUNRISE]]);
  const ct = await w.call("GET", `/api/to-chuc/${SUNRISE}`, { as: NAM });
  assert.equal(ct.json.toChuc.cheDo, "SOAN_VA_GUI", "màn tổ chức hiện chế độ hiện hành");
});

test("«Soạn và gửi» (mặc định): người quản lý chỉ thấy nháp đã gửi tới; trong lúc chờ thành viên sửa ⇒ 409; «Rút lại» được; trả lại ⇒ người quản lý thôi thấy, thành viên sửa lại được", async () => {
  const w = setup();
  const id = await lap(w, TV);
  assert.equal(await xem(w, NAM, id), 404, "chưa gửi tới");
  const g = await guiQl(w, TV, id);
  assert.equal(g.status, 201, g.text);
  assert.deepEqual(cho(w, id), [{ status: "MO", reason_code: null, member_staff_id: TV, org_party_id: SUNRISE, closed_by: null }]);
  assert.equal(await xem(w, NAM, id), 200);
  assert.equal(await xem(w, TV, id), 200, "người lập vẫn đọc");
  assert.equal((await guiQl(w, TV, id)).status, 409, "đã chờ rồi");
  const sua = await luu(w, TV, id);
  assert.equal(sua.status, 409, sua.text);
  assert.equal(sua.json.error.code, "member_submit_pending");
  assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: TV, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })).status, 409, "huỷ cũng phải rút lại trước");
  const rut = await rutQl(w, TV, id);
  assert.equal(rut.status, 200, rut.text);
  assert.equal(cho(w, id)[0].status, "DA_RUT");
  assert.equal(await xem(w, NAM, id), 404, "rút rồi thì thôi thấy");
  assert.equal((await luu(w, TV, id)).status, 200, "rút rồi sửa được");
  assert.equal((await guiQl(w, TV, id)).status, 201);
  assert.equal((await traLai(w, NAM, id, "LY_DO_LA")).status, 400, "lý do ngoài tập đóng");
  assert.equal((await traLai(w, TV, id)).status, 403, "thành viên không trả lại");
  const tl = await traLai(w, NAM, id, "SAI_SO_KHACH");
  assert.equal(tl.status, 200, tl.text);
  assert.deepEqual(cho(w, id).map((x: { status: string; reason_code: string | null }) => [x.status, x.reason_code]), [["DA_RUT", null], ["TRA_LAI", "SAI_SO_KHACH"]]);
  assert.equal(await xem(w, NAM, id), 404, "trả lại ⇒ thôi thấy");
  assert.equal((await luu(w, TV, id)).status, 200, "nháp về lại thành viên");
  assert.equal((await traLai(w, NAM, id)).status, 404, "không còn chờ ⇒ như không có");
});

test("«Chỉ soạn»: người quản lý thấy mọi nháp của thành viên và sửa được; không xác nhận thẳng (phải Gửi đơn); thành viên không gửi người quản lý ở chế độ này", async () => {
  const w = setup();
  const id = await lap(w, TV);
  assert.equal((await cheDo(w, NAM, "CHI_SOAN")).status, 200);
  assert.equal(await xem(w, NAM, id), 200);
  const ct = await w.call("GET", `/api/orders/${id}`, { as: NAM });
  assert.equal(ct.json.canModify, true, "ngoại lệ có tên: người quản lý sửa được nháp của thành viên");
  const sua = await luu(w, NAM, id, { customerName: "Khách Đổi Tên" });
  assert.equal(sua.status, 200, sua.text);
  assert.equal(w.q("SELECT staff_id AS s FROM orders WHERE id = ?", id)[0].s, TV, "người lập không đổi");
  const xn = await w.call("POST", `/api/orders/${id}/status`, { as: NAM, body: { status: "confirmed" } });
  assert.equal(xn.status, 409, xn.text);
  assert.equal(xn.json.error.code, "partner_submit_required");
  assert.equal((await guiQl(w, TV, id)).status, 409, "chế độ Chỉ soạn: không có bước gửi người quản lý");
});

test("Toàn quyền, Quản trị, Bán hàng, thành viên khác không thấy nháp thành viên (404) ở cả hai chế độ, kể cả khi đang chờ; đổi chế độ không đổi nháp đang chờ", async () => {
  const w = setup();
  const id = await lap(w, TV);
  assert.equal((await guiQl(w, TV, id)).status, 201);
  for (const che of ["SOAN_VA_GUI", "CHI_SOAN"]) {
    assert.equal((await cheDo(w, SUP, che)).status, 200);
    for (const ai of [SUP, ADM, SALES, SM, TV2]) assert.equal(await xem(w, ai, id), 404, `${ai} ${che}`);
    assert.equal(cho(w, id)[0].status, "MO", "đổi chế độ không đổi nháp đang chờ");
    assert.equal(await xem(w, NAM, id), 200);
  }
  const id2 = await lap(w, TV2);
  assert.equal(await xem(w, TV, id2), 404, "thành viên A không thấy nháp thành viên B");
  for (const duong of ["passengers", "receipt"]) assert.equal((await w.call("GET", `/api/orders/${id}/${duong}`, { as: SUP })).status, 404, duong);
});

test("Người quản lý gửi lên (Đ8.5): mốc giờ, luật bán, bản chụp xét lúc người quản lý bấm; orders.staff_id vẫn là thành viên; dòng chờ đóng DA_GUI_LEN; nhật ký người gửi; thành viên gọi Gửi đơn ⇒ 403", async () => {
  const w = setup();
  const id = await lap(w, TV);
  const tvGui = await w.call("POST", `/api/orders/${id}/gui-don`, { as: TV, body: {} });
  assert.equal(tvGui.status, 403, tvGui.text);
  assert.equal(tvGui.json.error.code, "org_manager_required");
  assert.equal((await w.call("POST", `/api/orders/${id}/gui-don`, { as: NAM, body: {} })).status, 404, "Soạn và gửi: chưa gửi tới ⇒ người quản lý như không thấy");
  assert.equal((await guiQl(w, TV, id)).status, 201);
  // Luật bán (ADR-0146) xét lúc người quản lý bấm: chặn loại đối tác của bên đặt sau khi thành viên đã gửi ⇒ người quản lý bị chặn, đơn ở lại nháp, dòng chờ vẫn mở.
  const L = String((await w.call("POST", "/api/pricing/loai-doi-tac", { as: SUP, body: { ten: "Loại thử chặn bán" } })).json.loai.code);
  const vai = await w.call("POST", `/api/parties/${SUNRISE}/roles`, { as: SUP, body: { roleTypeCode: L } });
  assert.equal(vai.status, 201, vai.text);
  const lb = await w.call("POST", "/api/pricing/luat-ban", { as: SUP, body: { loai: L, phamVi: "SERVICE", catalogCode: "ZA1" } });
  assert.equal(lb.status, 201, lb.text);
  const chan = await w.call("POST", `/api/orders/${id}/gui-don`, { as: NAM, body: {} });
  assert.equal(chan.status, 409, chan.text);
  assert.equal(chan.json.error.code, "sales_blocked");
  assert.equal(cho(w, id)[0].status, "MO");
  assert.equal((await w.call("POST", `/api/pricing/luat-ban/${lb.json.luat.id}/ket-thuc`, { as: SUP, body: {} })).status, 200);
  const g = await w.call("POST", `/api/orders/${id}/gui-don`, { as: NAM, body: {} });
  assert.equal(g.status, 200, g.text);
  assert.deepEqual({ ...w.q("SELECT staff_id, status, booker_party_id FROM orders WHERE id = ?", id)[0] }, { staff_id: TV, status: "confirmed", booker_party_id: SUNRISE });
  assert.equal(nk(w, "confirmed")[0].staff_id, NAM, "nhật ký ghi người gửi");
  assert.deepEqual(cho(w, id).map((x: { status: string; closed_by: string }) => [x.status, x.closed_by]), [["DA_GUI_LEN", NAM]]);
  const fw = nk(w, "order_member_forwarded");
  assert.equal(fw.length, 1);
  assert.deepEqual([fw[0].staff_id, fw[0].target_type, fw[0].target_id], [NAM, "staff", TV]);
  // «Chỉ soạn»: không có dòng chờ trước — gửi lên vẫn ghi một dòng DA_GUI_LEN và nhật ký cho thành viên.
  assert.equal((await cheDo(w, NAM, "CHI_SOAN")).status, 200);
  const id2 = await lap(w, TV);
  assert.equal((await w.call("POST", `/api/orders/${id2}/gui-don`, { as: NAM, body: {} })).status, 200);
  assert.deepEqual(cho(w, id2).map((x: { status: string }) => x.status), ["DA_GUI_LEN"]);
  assert.equal(nk(w, "order_member_forwarded").length, 2);
});

test("Review Focus 5: thành viên bị gỡ khi nháp đang chờ ⇒ người quản lý vẫn thấy, gửi lên / huỷ được; thành viên không lưu, không rút được (dòng tiền: so-vang-thay-mat-to-chuc.test.ts — orders không nhắc bảng của billing)", async () => {
  const w = setup();
  const id = await lap(w, TV);
  const id2 = await lap(w, TV);
  assert.equal((await guiQl(w, TV, id)).status, 201);
  assert.equal((await guiQl(w, TV, id2)).status, 201);
  const go = await w.call("POST", `/api/to-chuc/${SUNRISE}/go-thanh-vien`, { as: NAM, body: { personPartyId: `pty-${TV}` } });
  assert.equal(go.status, 200, go.text);
  assert.notEqual((await luu(w, TV, id)).status, 200, "thành viên đã rời không lưu");
  const rut = await rutQl(w, TV, id);
  assert.equal(rut.status, 403, rut.text);
  assert.equal(cho(w, id)[0].status, "MO");
  assert.equal(await xem(w, NAM, id), 200);
  const huy = await w.call("POST", `/api/orders/${id2}/status`, { as: NAM, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
  assert.equal(huy.status, 200, huy.text);
  const g = await w.call("POST", `/api/orders/${id}/gui-don`, { as: NAM, body: {} });
  assert.equal(g.status, 200, g.text);
  assert.equal(w.q("SELECT staff_id AS s FROM orders WHERE id = ?", id)[0].s, TV);
});

test("Gửi người quản lý khi tổ chức chưa có người quản lý có hiệu lực (Đ8.7) ⇒ 409 câu rõ, không dòng chờ", async () => {
  const w = setup();
  const id = await lap(w, TV);
  w.sqlite.prepare("UPDATE staff SET active = 0 WHERE id = ?").run(NAM);
  const g = await guiQl(w, TV, id);
  assert.equal(g.status, 409, g.text);
  assert.equal(g.json.error.code, "org_no_manager");
  assert.equal(g.json.error.message, "Tổ chức chưa có người quản lý, hãy liên hệ Tour Đảo");
  assert.deepEqual(cho(w, id), []);
});

test("Tin đích danh (Đ8.6, Ruling R11): gửi ⇒ người quản lý; trả lại, gửi lên ⇒ thành viên; người khác không thấy; không số điện thoại; lưu nháp không báo ai", async () => {
  const w = setup();
  const id = await lap(w, TV);
  const ma = w.q("SELECT order_code AS m FROM orders WHERE id = ?", id)[0].m;
  const tinCua = async (as: string) => ((await w.call("GET", "/api/thong-bao?ngan=cua-toi", { as })).json.tin as { maDon: string; cau: string; lienKet: string; cuaToi: boolean }[]).filter((t) => t.maDon === ma);
  assert.deepEqual(await tinCua(NAM), [], "lưu nháp không báo ai");
  assert.equal((await guiQl(w, TV, id)).status, 201);
  const t1 = await tinCua(NAM);
  assert.equal(t1.length, 1, JSON.stringify(t1));
  assert.equal(t1[0].cau, `Đơn ${ma} đang chờ bạn xác nhận`);
  assert.equal(t1[0].lienKet, `/order?id=${id}`);
  for (const ai of [TV, TV2, SUP, ADM]) assert.deepEqual(await tinCua(ai), [], ai);
  assert.equal((await traLai(w, NAM, id, "SAI_DICH_VU")).status, 200);
  const t2 = await tinCua(TV);
  assert.equal(t2.length, 1);
  assert.equal(t2[0].cau, `Người quản lý đã trả lại đơn ${ma}`);
  assert.equal((await guiQl(w, TV, id)).status, 201);
  assert.equal((await w.call("POST", `/api/orders/${id}/gui-don`, { as: NAM, body: {} })).status, 200);
  const t3 = await tinCua(TV);
  assert.ok(t3.some((t) => t.cau === `Người quản lý đã gửi đơn ${ma} lên Tour Đảo`), JSON.stringify(t3));
  for (const a of ["order_member_submitted", "order_member_returned", "order_member_forwarded"]) for (const d of nk(w, a)) assert.doesNotMatch(String(d.detail ?? ""), /0\d{9}/);
});

// Chủ dự án 27/10 (khuôn tin «đang chờ xác nhận», yeuCauDaKhep): tin «đang chờ bạn xác nhận» chỉ còn khi dòng chờ CÒN MỞ và nháp còn là nháp — rút lại, trả lại, gửi lên, người quản lý huỷ
// ⇒ tin biến mất; gửi lại ⇒ đúng MỘT tin (lần gửi mới nhất), tin cũ không quay lại.
test("Tin «đang chờ bạn xác nhận» khép theo trạng thái hiện tại: rút lại, trả lại, gửi lên, huỷ ⇒ hết tin; gửi lại ⇒ một tin", async () => {
  const w = setup();
  const tinCho = async (id: string): Promise<number> => {
    const ma = w.q("SELECT order_code AS m FROM orders WHERE id = ?", id)[0].m;
    return ((await w.call("GET", "/api/thong-bao?ngan=tat-ca", { as: NAM })).json.tin as { maDon: string; cau: string }[]).filter((t) => t.maDon === ma && t.cau === `Đơn ${ma} đang chờ bạn xác nhận`).length;
  };
  const id = await lap(w, TV);
  assert.equal((await guiQl(w, TV, id)).status, 201);
  assert.equal(await tinCho(id), 1);
  assert.equal((await rutQl(w, TV, id)).status, 200);
  assert.equal(await tinCho(id), 0, "rút lại");
  assert.equal((await guiQl(w, TV, id)).status, 201);
  assert.equal(await tinCho(id), 1, "gửi lại: đúng một tin");
  assert.equal((await traLai(w, NAM, id)).status, 200);
  assert.equal(await tinCho(id), 0, "trả lại");
  assert.equal((await guiQl(w, TV, id)).status, 201);
  assert.equal((await w.call("POST", `/api/orders/${id}/gui-don`, { as: NAM, body: {} })).status, 200);
  assert.equal(await tinCho(id), 0, "gửi lên");
  const id2 = await lap(w, TV);
  assert.equal((await guiQl(w, TV, id2)).status, 201);
  assert.equal((await w.call("POST", `/api/orders/${id2}/status`, { as: NAM, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })).status, 200);
  assert.equal(await tinCho(id2), 0, "người quản lý huỷ");
});

test("Task 17 (giao diện B2): trang đơn biết nháp thành viên — khối `thanhVien` chỉ đọc (chờ, chế độ, người quản lý thay); ô Tư cách trả loại liên kết", async () => {
  const w = setup();
  const loaiCua = async (as: string) => (await w.call("GET", "/api/to-chuc/cua-toi", { as })).json.tuCach.find((t: { partyId: string }) => t.partyId === SUNRISE)?.loai;
  assert.equal(await loaiCua(TV), "MEMBER");
  assert.equal(await loaiCua(NAM), "MANAGER");
  const tv = async (as: string, id: string) => (await w.call("GET", `/api/orders/${id}`, { as })).json.thanhVien;
  const id = await lap(w, TV);
  assert.deepEqual(await tv(TV, id), { dangCho: false, cheDo: "SOAN_VA_GUI", quanLyThay: false });
  assert.equal((await guiQl(w, TV, id)).status, 201);
  assert.deepEqual(await tv(TV, id), { dangCho: true, cheDo: "SOAN_VA_GUI", quanLyThay: false });
  assert.deepEqual(await tv(NAM, id), { dangCho: true, cheDo: "SOAN_VA_GUI", quanLyThay: true });
  assert.equal((await cheDo(w, NAM, "CHI_SOAN")).status, 200);
  const id2 = await lap(w, TV);
  assert.deepEqual(await tv(NAM, id2), { dangCho: false, cheDo: "CHI_SOAN", quanLyThay: true });
  // Đơn của người quản lý tự lập (tư cách MANAGER) và đơn văn phòng: không có khối.
  const id3 = await lap(w, NAM);
  assert.equal(await tv(NAM, id3), null);
  const id4 = await lap(w, SALES, {});
  assert.equal(await tv(SALES, id4), null);
});

// ---- Task 16 vòng sửa 1 (người kiểm độc lập) ----

test("vòng sửa 1 (I-1, K1): người quản lý Gửi đơn nhánh A (dịch vụ cần xác nhận) ⇒ yêu cầu mở với người quản lý: người quản lý Rút lại được, thành viên (người lập) không rút được", async () => {
  const w = setup();
  w.sqlite.prepare("INSERT INTO ord_service_confirm_flag (id, scope, code, required, valid_from_at, created_at, updated_at) VALUES ('co1', 'SERVICE', 'ZA1', 1, ?, ?, ?)").run(AT, AT, AT);
  const id = await lap(w, TV);
  assert.equal((await guiQl(w, TV, id)).status, 201);
  const g = await w.call("POST", `/api/orders/${id}/gui-don`, { as: NAM, body: {} });
  assert.equal(g.status, 201, g.text);
  assert.equal(g.json.nhanh, "A");
  assert.equal(w.q("SELECT submitted_by AS s FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", id)[0].s, NAM, "yêu cầu mở với người gửi");
  const tvRut = await w.call("POST", `/api/orders/${id}/rut-xac-nhan`, { as: TV, body: {} });
  assert.ok(tvRut.status === 403 || tvRut.status === 404, tvRut.text);
  assert.equal(w.q("SELECT count(*) AS n FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", id)[0].n, 1, "thành viên không khép được");
  const qlRut = await w.call("POST", `/api/orders/${id}/rut-xac-nhan`, { as: NAM, body: {} });
  assert.equal(qlRut.status, 200, qlRut.text);
  assert.equal(w.q("SELECT count(*) AS n FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", id)[0].n, 0);
});

test("vòng sửa 1 (I-2, K2): thành viên đã bị gỡ ⇒ người quản lý không trả lại được (409, nháp không kẹt), vẫn gửi lên được", async () => {
  const w = setup();
  const id = await lap(w, TV);
  assert.equal((await guiQl(w, TV, id)).status, 201);
  assert.equal((await w.call("POST", `/api/to-chuc/${SUNRISE}/go-thanh-vien`, { as: NAM, body: { personPartyId: `pty-${TV}` } })).status, 200);
  const tl = await traLai(w, NAM, id);
  assert.equal(tl.status, 409, tl.text);
  assert.equal(tl.json.error.code, "member_left_org");
  assert.equal(cho(w, id)[0].status, "MO");
  assert.equal((await w.call("POST", `/api/orders/${id}/gui-don`, { as: NAM, body: {} })).status, 200);
});

test("vòng sửa 1 (I-3): lô Gửi đơn nhánh B THUA (đơn đã được lô khác xác nhận ngay trước) ⇒ không dòng chờ mới, không nhật ký forwarded thừa", async () => {
  const w = setup();
  assert.equal((await cheDo(w, NAM, "CHI_SOAN")).status, 200);
  const id = await lap(w, TV);
  w.chenTruocLo((stmts: any[]) => stmts.some((s) => /ord_member_submit/.test(s.sql) && /DA_GUI_LEN/.test(s.sql)), async () => {
    const t = new Date(Date.now() + 5).toISOString();
    w.sqlite.prepare("UPDATE orders SET status = 'confirmed', updated_at = ? WHERE id = ?").run(t, id);
  });
  const g = await w.call("POST", `/api/orders/${id}/gui-don`, { as: NAM, body: {} });
  assert.notEqual(g.status, 200, g.text);
  assert.deepEqual(cho(w, id), [], "không dòng chờ giả");
  assert.equal(nk(w, "order_member_forwarded").length, 0, "không nhật ký forwarded thừa");
});

test("vòng sửa 1 (m-2): ngoại lệ nháp chỉ đổi người chủ cho ô sửa (canModify) ở chi tiết đơn — phạm vi các ô own khác giữ người lập", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
  const i = src.indexOf('route("GET", "/api/orders/:id", "orders"');
  const than = src.slice(i, src.indexOf('route("PUT", "/api/orders/:id", "orders"', i));
  assert.match(than, /const scope = \{ ownerId: order\.staffId, assigned \};/, "scope của các ô own khác = người lập");
  assert.equal((than.match(/thayNhap \? staff\.id/g) ?? []).length, 1, "đúng một chỗ đổi người chủ");
  assert.match(than, /canModify: can\(staff, "order\.modify", \{ ownerId: thayNhap \? staff\.id : order\.staffId, assigned \}\)/);
});
