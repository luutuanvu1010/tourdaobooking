// ADR-0115 + ADR-0092 Đ5d — tin báo của yêu cầu điều chỉnh công nợ, chạy CẢ ứng dụng trên SQLite thật (khung thử tests/audit/harness.mjs).
// Yêu cầu mới → người có ô duyệt TRỪ người gửi; rút → cùng nhóm; đã duyệt / từ chối → đúng người gửi; "số dư của bạn đổi" → MỌI tài khoản của hồ sơ bị đổi số dư
// (nhân viên, Đối tác, Tài xế đối tác — ADR-0092 Đ5d, ADR-0115 điều 5), trừ người tạo yêu cầu.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "0d000000-0000-4000-8000-000000000001";
const HDV = "0d000000-0000-4000-8000-000000000002";
const QT = "0d000000-0000-4000-8000-000000000003";
const KT = "0d000000-0000-4000-8000-000000000004"; // người gửi
const KT2 = "0d000000-0000-4000-8000-000000000005"; // người duyệt
const SA = "0d000000-0000-4000-8000-000000000006";
const AT = "2026-09-01T00:00:00.000Z";
let seq = 0;
const uuid = () => `0d999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;

type W = ReturnType<typeof world>;
function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0903000001", "An Bán", ["SALES"]], [HDV, "0903000002", "Nam HDV", ["FIELD"]], [QT, "0903000003", "Quản Trị", ["ADMIN"]],
    [KT, "0903000004", "Lan Kế Toán", ["ACCOUNTING"]], [KT2, "0903000005", "Mai Kế Toán", ["ACCOUNTING"]], [SA, "0903000006", "Toàn Quyền", ["SUPER_ADMIN"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
function don(w: W, tong = 500_000): string {
  const id = uuid();
  const vn = new Date(Date.now() + 7 * 3600_000 + 10 * 86400_000).toISOString().slice(0, 10);
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?)`).run(id, `TB-${seq}`, SALES, tong, tong, tong, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé Hòn Tằm', 'perPax', 1, ?)`).run(`${id}-s`, id, vn);
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 1, ?, ?)`).run(`${id}-i`, id, `${id}-s`, tong, tong);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${HDV}`, AT, AT, AT);
  return id;
}
type Tin = { id: string; loai: string; cau: string; lienKet: string | null; cuaToi: boolean; maDon: string | null };
const dieuChinh = async (w: W, as: string): Promise<Tin[]> => {
  const r = await w.call("GET", "/api/thong-bao?ngan=cua-toi", { as });
  assert.equal(r.status, 200, r.text);
  return (r.json.tin as Tin[]).filter((t) => t.loai === "dieu_chinh");
};

test("v_aud_ledger_event: chỉ cột khoá (không detail); đúng năm hành động", () => {
  const w = setup();
  const cot = w.q("SELECT name FROM pragma_table_info('v_aud_ledger_event')").map((x: { name: string }) => x.name);
  assert.deepEqual(cot, ["id", "order_id", "target_type", "target_id", "staff_id", "action", "created_at"]);
});

test("yêu cầu mới → Kế toán khác và Toàn quyền có tin «chờ bạn duyệt» (liên kết màn điều chỉnh); người gửi, Bán hàng, HDV không; Quản trị có (ô duyệt)", async () => {
  const w = setup();
  const id = don(w);
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id);
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: HDV, body: { soTien: 200_000, hinhThuc: "CASH", nguoiThu: "toi" } })).status, 201);
  const y = await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dieu_chinh", orderId: id, benNo: ct, benDuocNo: `pty-${HDV}`, loaiDong: "SETTLEMENT", soTien: 100_000, lyDo: "bù trừ phần HDV đã chi hộ khách" } });
  assert.equal(y.status, 201, y.text);
  for (const ai of [KT2, SA, QT]) {
    const ds = await dieuChinh(w, ai);
    assert.equal(ds.length, 1, `${ai}: ${JSON.stringify(ds)}`);
    // ADR-0131 đ3: chỉ Toàn quyền thấy tên người gửi; Kế toán / Quản trị đọc câu không tên.
    if (ai === SA) assert.match(ds[0]!.cau, /^Lan Kế Toán gửi yêu cầu điều chỉnh công nợ đơn TB-\d+ — chờ bạn duyệt$/);
    else assert.match(ds[0]!.cau, /^Có yêu cầu điều chỉnh công nợ đơn TB-\d+ — chờ bạn duyệt$/);
    if (ai !== SA) assert.doesNotMatch(ds[0]!.cau, /Lan/, "người không phải Toàn quyền không thấy tên");
    assert.equal(ds[0]!.lienKet, "/dieu-chinh-cong-no");
    assert.equal(ds[0]!.cuaToi, true);
    assert.doesNotMatch(ds[0]!.cau, /100\.000|HDV|bù trừ/, "câu không chứa số tiền, lý do, tên bên nợ");
  }
  for (const ai of [KT, SALES, HDV]) assert.deepEqual(await dieuChinh(w, ai), [], `không tin cho ${ai}`);
  // Người gửi rút → người có ô duyệt nhận tin «đã rút»; người gửi không tự nhận tin của mình.
  assert.equal((await w.call("POST", `/api/ledger/adjustment-requests/${y.json.yeuCauId}/withdraw`, { as: KT })).status, 201);
  const sau = await dieuChinh(w, KT2);
  assert.equal(sau.length, 2);
  assert.ok(sau.some((t) => /^Yêu cầu điều chỉnh công nợ đơn TB-\d+ đã được rút$/.test(t.cau)), JSON.stringify(sau));
  assert.ok((await dieuChinh(w, SA)).some((t) => /^Lan Kế Toán đã rút yêu cầu điều chỉnh công nợ đơn/.test(t.cau)), "Toàn quyền thấy tên");
  assert.deepEqual(await dieuChinh(w, KT), []);
});

test("duyệt → người gửi nhận «đã duyệt», nhân viên bị đổi số dư (HDV) nhận «số dư của bạn vừa được điều chỉnh»; người duyệt và Bán hàng không", async () => {
  const w = setup();
  const id = don(w);
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id);
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: HDV, body: { soTien: 200_000, hinhThuc: "CASH", nguoiThu: "toi" } })).status, 201);
  const y = (await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dieu_chinh", orderId: id, benNo: ct, benDuocNo: `pty-${HDV}`, loaiDong: "SETTLEMENT", soTien: 100_000, lyDo: "bù trừ phần HDV đã chi hộ khách" } })).json.yeuCauId;
  assert.equal((await w.call("POST", `/api/ledger/adjustment-requests/${y}/approve`, { as: KT2 })).status, 201);
  const gui = await dieuChinh(w, KT);
  assert.equal(gui.length, 1);
  assert.match(gui[0]!.cau, /^Yêu cầu điều chỉnh công nợ đơn TB-\d+ của bạn đã được duyệt$/);
  const hdv = await dieuChinh(w, HDV);
  assert.equal(hdv.length, 1);
  assert.match(hdv[0]!.cau, /^Số dư của bạn trên đơn TB-\d+ vừa được điều chỉnh$/);
  assert.doesNotMatch(hdv[0]!.cau, /100\.000/, "không lộ số tiền");
  assert.deepEqual(await dieuChinh(w, SALES), []);
  assert.deepEqual((await dieuChinh(w, KT2)).filter((t) => /đã duyệt|số dư/.test(t.cau)), [], "người duyệt không nhận tin về việc của chính mình");
});

test("từ chối → người gửi nhận «đã từ chối» (không lộ lý do trong câu); nhân viên khác không nhận", async () => {
  const w = setup();
  const id = don(w);
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id);
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: HDV, body: { soTien: 200_000, hinhThuc: "CASH", nguoiThu: "toi" } })).status, 201);
  const y = (await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dieu_chinh", orderId: id, benNo: ct, benDuocNo: `pty-${HDV}`, loaiDong: "SETTLEMENT", soTien: 100_000, lyDo: "bù trừ phần HDV đã chi hộ khách" } })).json.yeuCauId;
  assert.equal((await w.call("POST", `/api/ledger/adjustment-requests/${y}/reject`, { as: SA, body: { lyDo: "số tiền chưa khớp biên nhận" } })).status, 201);
  const gui = await dieuChinh(w, KT);
  assert.equal(gui.length, 1);
  assert.match(gui[0]!.cau, /^Yêu cầu điều chỉnh công nợ đơn TB-\d+ của bạn bị từ chối$/);
  assert.doesNotMatch(gui[0]!.cau, /khớp biên nhận/);
  assert.deepEqual(await dieuChinh(w, HDV), [], "từ chối không đổi số dư ⇒ HDV không có tin");
  // Nhật ký không chứa SĐT / email / MST / giấy tờ: kiểm trên mọi dòng ledger_adjustment*.
  const nk = w.q("SELECT detail FROM audit_log WHERE action LIKE 'ledger_adjustment%'") as { detail: string | null }[];
  for (const x of nk) assert.doesNotMatch(x.detail ?? "", /\d{9,}|@/, "nhật ký không chứa dãy số dài / email");
});

// ADR-0092 Đ5d «người bị đổi số dư nhận một tin», ADR-0115 điều 5 «bên bị đổi số dư»: không có ngoại lệ cho tài khoản bên ngoài. (Bản cũ của bài này — L-1 — khoá điều NGƯỢC LẠI;
// đã sửa 2026-11-03 vì mã lệch tài liệu chuẩn tắc.) Người không xem được sổ của mình nhận câu nhắc liên hệ văn phòng, không số tiền / lý do / tên.
const cauNgoai = (ma: string) => `Số dư của bạn trên đơn ${ma} vừa được điều chỉnh — liên hệ văn phòng để biết chi tiết`;
const cauNoiBo = (ma: string) => `Số dư của bạn trên đơn ${ma} vừa được điều chỉnh`;
/** KT gửi yêu cầu đổi số dư của hồ sơ `pty-<ai>` (bên nợ) với công ty chủ, KT2 duyệt; trả về mã đơn. */
async function doiSoDu(w: W, ai: string): Promise<string> {
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id);
  const id = don(w);
  const y = await w.call("POST", "/api/ledger/adjustments", { as: KT, body: { loai: "dieu_chinh", orderId: id, benNo: `pty-${ai}`, benDuocNo: ct, loaiDong: "HELD", soTien: 100_000, lyDo: "khách gửi thêm tiền qua người này" } });
  assert.equal(y.status, 201, y.text);
  assert.equal((await w.call("POST", `/api/ledger/adjustment-requests/${y.json.yeuCauId}/approve`, { as: KT2 })).status, 201);
  return String(w.q("SELECT order_code FROM orders WHERE id = ?", id)[0].order_code);
}

// Tài xế đối tác chỉ thấy mã đơn như một ngoại lệ có tên, trong khung thấy khách của chuyến họ chạy (ADR-0053 D7, ADR-0048 D2); ngoài khung đó họ «không thấy đơn hàng».
// Nên tin số dư tới họ KHÔNG kèm mã đơn — ở cả câu lẫn trường maDon của DTO. ADR-0092 Đ5d chỉ đòi tin phải tới, câu không mã đơn thoả cả hai văn bản.
const cauTaiXeDoiTac = "Số dư của bạn vừa được điều chỉnh — liên hệ văn phòng để biết chi tiết";
const soDu = async (w: W, ai: string): Promise<Tin[]> => (await dieuChinh(w, ai)).filter((t) => /Số dư của bạn/.test(t.cau));

test("Đ5d (thay bài L-1 cũ): Đối tác, Tài xế đối tác, Nhân sự NHẬN tin «số dư của bạn đổi» của chính mình — câu nhắc liên hệ văn phòng, liên kết /account, riêng Tài xế đối tác KHÔNG có mã đơn; người khác không nhận", async () => {
  const w = setup();
  const DT = "0d000000-0000-4000-8000-000000000007"; // Đối tác thuần
  const TX = "0d000000-0000-4000-8000-000000000009"; // Tài xế đối tác (đứng một mình)
  const NS = "0d000000-0000-4000-8000-00000000000b"; // Nhân sự thuần (không có ô xem khoản của mình)
  const DT2 = "0d000000-0000-4000-8000-00000000000a"; // một Đối tác khác, không dính dòng điều chỉnh
  seedStaff(w.sqlite, { id: DT, phone: "0903000007", name: "Đối Tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: TX, phone: "0903000009", name: "Tài Xế Đối Tác", perms: ["DRIVER_PARTNER"] });
  seedStaff(w.sqlite, { id: NS, phone: "0903000011", name: "Nhân Sự", perms: ["HR"] });
  seedStaff(w.sqlite, { id: DT2, phone: "0903000010", name: "Đối Tác Khác", perms: ["PARTNER"] });
  const tatCa = [DT, TX, NS, DT2, SALES, HDV, KT, KT2];
  for (const ai of [DT, TX, NS]) {
    const truoc = new Map<string, Tin[]>();
    for (const a of tatCa) truoc.set(a, await soDu(w, a));
    const ma = await doiSoDu(w, ai);
    // Phía phát tin ghi dòng nhật ký khoá đúng tài khoản Đối tác / Tài xế đối tác / Nhân sự (taiKhoanCuaHoSo trả được mọi tài khoản có hồ sơ).
    const dong = w.q("SELECT target_type, target_id, staff_id FROM audit_log WHERE action = 'ledger_adjustment_affected' AND order_id = (SELECT id FROM orders WHERE order_code = ?)", ma) as { target_type: string; target_id: string; staff_id: string }[];
    assert.deepEqual(dong.map((x) => [x.target_type, x.target_id, x.staff_id]), [["staff", ai, KT2]], `nhật ký tin cho ${ai}`);
    const daCo = new Set(truoc.get(ai)!.map((x) => x.id));
    const moi = (await soDu(w, ai)).filter((x) => !daCo.has(x.id));
    assert.equal(moi.length, 1, `${ai}: ${JSON.stringify(moi)}`);
    const t = moi[0]!;
    assert.equal(t.lienKet, "/account");
    assert.equal(t.cuaToi, true);
    if (ai === TX) {
      assert.equal(t.cau, cauTaiXeDoiTac);
      assert.equal(t.maDon, null, "DTO không được lộ mã đơn cho Tài xế đối tác");
      assert.ok(!JSON.stringify(t).includes(ma), "không chỗ nào trong tin chứa mã đơn");
    } else {
      assert.equal(t.cau, cauNgoai(ma));
      assert.equal(t.maDon, ma);
    }
    assert.doesNotMatch(t.cau, /100\.000|khách gửi|Lan|Mai|Công ty/, "câu không chứa số tiền, lý do, tên bên nợ, tên người làm");
    // Người không phải bên bị đổi (Đối tác khác, các tài khoản bên ngoài còn lại, Bán hàng, HDV, người tạo, người duyệt): số tin «Số dư của bạn» không đổi.
    for (const khac of tatCa.filter((x) => x !== ai)) assert.equal((await soDu(w, khac)).length, truoc.get(khac)!.length, `${khac} không phải bên bị đổi, không được nhận tin số dư`);
  }
});

test("Đ5d: tài khoản lai Bán hàng + Đối tác nhận câu NỘI BỘ (có quyền xem khoản của mình), liên kết /order; không nhận tin của người khác", async () => {
  const w = setup();
  const LAI = "0d000000-0000-4000-8000-000000000008"; // lai Bán hàng + Đối tác
  const DT2 = "0d000000-0000-4000-8000-00000000000a";
  seedStaff(w.sqlite, { id: LAI, phone: "0903000008", name: "Lai Đôi", perms: ["SALES", "PARTNER"] });
  seedStaff(w.sqlite, { id: DT2, phone: "0903000010", name: "Đối Tác Khác", perms: ["PARTNER"] });
  const ma = await doiSoDu(w, LAI);
  const ds = await dieuChinh(w, LAI);
  assert.equal(ds.length, 1, JSON.stringify(ds));
  assert.equal(ds[0]!.cau, cauNoiBo(ma));
  assert.equal(ds[0]!.lienKet, "/order", "lai Bán hàng + Đối tác: ô điều chỉnh/ghi sổ không có, là tài khoản văn phòng ⇒ trang đơn");
  assert.deepEqual(await dieuChinh(w, DT2), []);
});
