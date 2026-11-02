// Lô «Mọi loại khách» (ADR-0157): vé không phân biệt người lớn, trẻ em, người cao tuổi, ví dụ vé Harbour tiêu chuẩn.
// Suất phân bổ vẫn mang loại khách thật; chỉ lô mới có giá trị `ALL`. Tiêu chí nghiệm thu đánh số theo ADR.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { soanCapVe, soanTraVe } from "./cap-ve.ts";
import { kiemLo } from "./nhap-lo.ts";
import { AT, chayLo, d1That, dem, nhatKyThu, taoCsdl, themLo, themVe } from "../../khung-thu-ve.test.ts";
// @ts-expect-error khung kiểm toán viết bằng .mjs, không có khai báo kiểu.
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

type Pax = { adult?: number; child?: number; senior?: number; infant?: number };
const dich = (pax: Pax, orderId = "o-1", serviceId = "s-1") => ({ orderId, serviceId, catalogCode: "V2D", ngayDi: "2026-10-24", pax: { adult: 0, child: 0, senior: 0, infant: 0, ...pax } });
const cap = (d: DatabaseSync, x: ReturnType<typeof dich>, at = AT) => chayLo(d, soanCapVe(d1That(d), x, "s-1", at, nhatKyThu(d1That(d))).cau);
const suat = (d: DatabaseSync, serviceId = "s-1") =>
  d.prepare("SELECT a.pax_group AS nhom, a.slot_no AS so, a.ticket_id AS ve, t.batch_id AS lo FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id WHERE a.order_service_id = ? AND a.released_at IS NULL ORDER BY a.pax_group, a.slot_no").all(serviceId) as { nhom: string; so: number; ve: string; lo: string }[];

test("TC2: đơn nhiều loại khách giữ đủ vé từ một lô dùng chung, chạy lại không giữ thừa, mỗi suất đúng loại, em bé không có vé", () => {
  const d = taoCsdl();
  const lo = themLo(d, { nhom: "ALL" });
  for (let i = 0; i < 5; i++) themVe(d, lo);
  const don = dich({ adult: 2, child: 1, senior: 1, infant: 1 });
  cap(d, don);
  cap(d, don);
  assert.deepEqual(suat(d).map((s) => [s.nhom, s.so]), [["ADULT", 1], ["ADULT", 2], ["CHILD", 1], ["SENIOR", 1]]);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_ticket WHERE status = 'AVAILABLE'"), 1);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_ticket WHERE status = 'ALLOCATED'"), 4);
});

test("TC3: lô đúng một loại vẫn không cấp cho loại khác", () => {
  const d = taoCsdl();
  themVe(d, themLo(d, { nhom: "ADULT" }));
  themVe(d, themLo(d, { nhom: "SENIOR" }));
  cap(d, dich({ child: 1 }));
  assert.equal(suat(d).length, 0);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_ticket WHERE status = 'AVAILABLE'"), 2, "vé của lô khác loại không bị giữ mà không có suất");
});

test("TC4: lô đúng loại ra trước dù hạn xa hơn, nên đơn 1 người lớn, 1 trẻ em không bị báo thiếu oan", () => {
  const d = taoCsdl();
  const nl = themVe(d, themLo(d, { nhom: "ADULT" }), "2026-10-01", "2026-11-30", "ve-nl-han-xa");
  const chung = themVe(d, themLo(d, { nhom: "ALL" }), "2026-10-01", "2026-10-30", "ve-chung-han-gan");
  cap(d, dich({ adult: 1, child: 1 }));
  assert.deepEqual(suat(d).map((s) => [s.nhom, s.ve]), [["ADULT", nl], ["CHILD", chung]]);
});

test("TC4: trong mỗi nhóm vé hạn gần ra trước, hết lô đúng loại thì sang lô dùng chung", () => {
  const d = taoCsdl();
  const loChung = themLo(d, { nhom: "ALL" });
  const loNl = themLo(d, { nhom: "ADULT" });
  themVe(d, loChung, "2026-10-01", "2026-11-30", "chung-xa");
  themVe(d, loChung, "2026-10-01", "2026-10-30", "chung-gan");
  themVe(d, loNl, "2026-10-01", "2026-11-30", "nl-xa");
  themVe(d, loNl, "2026-10-01", "2026-10-30", "nl-gan");
  cap(d, dich({ adult: 3 }));
  assert.deepEqual(suat(d).map((s) => s.ve).sort(), ["chung-gan", "nl-gan", "nl-xa"]);
});

test("TC4: chung một lần giữ, vé dùng chung không bị cấp hai lần cho hai loại khách", () => {
  const d = taoCsdl();
  themVe(d, themLo(d, { nhom: "ALL" }));
  cap(d, dich({ adult: 1, child: 1 }));
  assert.deepEqual(suat(d).map((s) => s.nhom), ["ADULT"]);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_allocation WHERE released_at IS NULL"), 1);
});

test("TC5: vé trả về lô dùng chung cấp lại được cho loại khách khác", async () => {
  const d = taoCsdl();
  const ve = themVe(d, themLo(d, { nhom: "ALL" }));
  cap(d, dich({ adult: 1 }));
  assert.deepEqual(suat(d).map((s) => [s.nhom, s.ve]), [["ADULT", ve]]);
  const tra = await soanTraVe(d1That(d), { orderId: "o-1", lyDo: "DON_HUY", at: "2026-10-31T05:00:00.000Z", by: "s-1", homNay: "2026-10-31" }, nhatKyThu(d1That(d)));
  chayLo(d, tra.cau);
  cap(d, dich({ child: 1 }, "o-2", "s-2"), "2026-10-31T06:00:00.000Z");
  assert.deepEqual(suat(d, "s-2").map((s) => [s.nhom, s.ve]), [["CHILD", ve]]);
});

test("TC6: CSDL từ chối suất mang ALL, phân bổ lệch loại, đổi loại khách của lô, giá trị lạ", () => {
  const d = taoCsdl();
  const phanBo = (id: string, ve: string, nhom: string) => d.prepare(
    "INSERT INTO vdt_allocation (id, ticket_id, order_id, order_service_id, pax_group, slot_no, allocated_at, created_at, updated_at) VALUES (?, ?, 'o-1', 's-1', ?, 1, ?, ?, ?)",
  ).run(id, ve, nhom, AT, AT, AT);
  const giu = (ve: string) => d.prepare("UPDATE vdt_ticket SET status = 'ALLOCATED' WHERE id = ?").run(ve);
  const veTe = themVe(d, themLo(d, { nhom: "CHILD" }));
  giu(veTe);
  assert.throws(() => phanBo("a-1", veTe, "ADULT"), /vdt_one_way/, "lô trẻ em không cấp cho người lớn");
  const loChung = themLo(d, { nhom: "ALL" });
  const veChung = themVe(d, loChung);
  giu(veChung);
  assert.throws(() => phanBo("a-2", veChung, "ALL"), /CHECK/, "suất phải mang loại khách thật");
  phanBo("a-3", veChung, "SENIOR");
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_allocation WHERE id = 'a-3'"), 1);

  const doi = (id: string, nhom: string) => d.prepare("UPDATE vdt_batch SET pax_group = ? WHERE id = ?").run(nhom, id);
  assert.throws(() => doi(loChung, "ADULT"), /vdt_append_only/, "lô chung không đổi thành một loại");
  assert.throws(() => doi(themLo(d, { nhom: "ADULT" }), "ALL"), /vdt_append_only/, "lô một loại không đổi thành chung");
  assert.throws(() => themLo(d, { nhom: "INFANT" as "ALL" }), /CHECK/, "giá trị lạ");
});

test("kiemLo: nhận ALL như ba giá trị cũ, câu báo nêu đủ lựa chọn", () => {
  for (const nhom of ["ADULT", "CHILD", "SENIOR", "ALL"]) {
    const kq = kiemLo({ catalogCode: "V2D", nhomKhach: nhom, tenSanPham: "Vé mẫu" });
    assert.ok(kq.ok, nhom);
    assert.equal(kq.ok && kq.value.nhomKhach, nhom);
  }
  const sai = kiemLo({ catalogCode: "V2D", nhomKhach: "INFANT", tenSanPham: "Vé mẫu" });
  assert.equal(sai.ok, false);
  assert.match(!sai.ok ? sai.message : "", /mọi loại khách/);
});

// ---- Dựng lại bảng lô -----------------------------------------------------------------------------------------------------------------------
const DIR = new URL("../../../migrations/", import.meta.url);
const TEP = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MOI = TEP.find((f) => f.endsWith("_ve_lo_moi_loai_khach.sql"));

test("TC7: migration giữ nguyên mọi dòng và mọi đối tượng, chỉ khác CHECK của bảng lô và trigger phân bổ", () => {
  assert.ok(MOI, "thiếu migration dựng lại bảng lô");
  const d = new DatabaseSync(":memory:");
  for (const f of TEP.filter((x) => x < MOI!)) d.exec(readFileSync(new URL(f, DIR), "utf8"));
  // Gieo đủ ba trạng thái lô, có vé con và phân bổ, để khoá ngoại thật sự bị thử.
  const lo = d.prepare("INSERT INTO vdt_batch (id, catalog_code, pax_group, printed_name, status, created_at, created_by, updated_at, updated_by, last_cmd_id) VALUES (?, 'V2D', ?, 'Vé mẫu', ?, ?, 's', ?, 's', ?)");
  lo.run("b-1", "ADULT", "ACTIVE", AT, AT, null);
  lo.run("b-2", "CHILD", "PENDING", AT, AT, null);
  lo.run("b-3", "SENIOR", "VOID", AT, AT, "lenh-1");
  const ve = d.prepare("INSERT INTO vdt_ticket (id, batch_id, ticket_code, valid_from, valid_to, storage_key, content_kind, byte_size, content_hash, status, stored_at, created_at, updated_at) VALUES (?, ?, ?, '2026-10-01', '2026-11-30', ?, 'image/jpeg', 1, ?, ?, ?, ?, ?)");
  ve.run("t-1", "b-1", "MA-1", "k-1", "h-1", "AVAILABLE", AT, AT, AT);
  ve.run("t-2", "b-2", "MA-2", "k-2", "h-2", "AVAILABLE", AT, AT, AT);
  d.prepare("UPDATE vdt_ticket SET status = 'ALLOCATED' WHERE id = 't-1'").run();
  d.prepare("INSERT INTO vdt_allocation (id, ticket_id, order_id, order_service_id, pax_group, slot_no, allocated_at, created_at, updated_at) VALUES ('a-1', 't-1', 'o-1', 's-1', 'ADULT', 1, ?, ?, ?)").run(AT, AT, AT);
  const anh = () => ({
    lo: d.prepare("SELECT * FROM vdt_batch ORDER BY id").all(),
    ve: d.prepare("SELECT * FROM vdt_ticket ORDER BY id").all(),
    pb: d.prepare("SELECT * FROM vdt_allocation ORDER BY id").all(),
    cot: d.prepare("PRAGMA table_info(vdt_batch)").all(),
    doiTuong: Object.fromEntries((d.prepare("SELECT type || ':' || name AS k, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").all() as { k: string; sql: string }[]).map((r) => [r.k, r.sql])),
  });
  const truoc = anh();
  // node:sqlite chạy từng câu, wrangler chạy cả tệp trong một lô: bọc giao dịch để khoá ngoại hoãn đúng như thật (như bài dựng lại 0097).
  d.exec("BEGIN");
  d.exec(readFileSync(new URL(MOI!, DIR), "utf8"));
  d.exec("COMMIT");
  const sau = anh();
  assert.deepEqual(sau.lo, truoc.lo);
  assert.deepEqual(sau.ve, truoc.ve);
  assert.deepEqual(sau.pb, truoc.pb);
  assert.deepEqual(sau.cot, truoc.cot);
  assert.deepEqual(Object.keys(sau.doiTuong).sort(), Object.keys(truoc.doiTuong).sort());
  const khac = Object.keys(sau.doiTuong).filter((k) => sau.doiTuong[k] !== truoc.doiTuong[k]).sort();
  assert.deepEqual(khac, ["table:vdt_batch", "trigger:vdt_allocation_insert_guard"]);
  assert.match(sau.doiTuong["table:vdt_batch"], /'ALL'/);
  assert.deepEqual(d.prepare("PRAGMA foreign_key_check").all(), []);
  assert.deepEqual((d.prepare("PRAGMA foreign_key_list(vdt_ticket)").all() as { table: string }[]).map((r) => r.table), ["vdt_batch"]);
  assert.deepEqual(d.prepare("SELECT name FROM sqlite_master WHERE name LIKE '%vdt_batch_%' AND type = 'table'").all(), [], "không sót bảng tạm");
});

// ---- Qua route ------------------------------------------------------------------------------------------------------------------------------
const U = (n: number) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const SALES = U(1);
const PNG = (n: number) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return Buffer.from(u).toString("base64"); };

test("TC1: tạo lô Mọi loại khách qua route, nhãn đúng ở kho, danh sách lô, lô đã huỷ, nhật ký; giá trị lạ bị từ chối", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "NV 01", perms: ["SALES"] });
  const at = new Date().toISOString();
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, sheet_row, in_sheet, first_seen_at, updated_at) VALUES ('V2D', 'Vé Harbour', 'perPax', 100000, 1, 1, '${at}', '${at}')`);
  const taoLo = (nhomKhach: string) => w.call("POST", "/api/ve/lo", { as: SALES, body: { catalogCode: "V2D", nhomKhach, tenSanPham: "Vé tiêu chuẩn" } });
  assert.equal((await taoLo("INFANT")).status, 400);
  const lo = await taoLo("ALL");
  assert.equal(lo.status, 201, lo.text);
  const loId = lo.json.loId;
  const them = await w.call("POST", `/api/ve/lo/${loId}/ve`, { as: SALES, body: { ve: [{ noiDung: PNG(1), maVe: "1".repeat(36), tuNgay: "2026-10-24", denNgay: "2026-11-23" }] } });
  assert.equal(them.json.themDuoc, 1, them.text);
  assert.equal((await w.call("POST", `/api/ve/lo/${loId}/xac-nhan`, { as: SALES, body: {} })).status, 200);
  assert.deepEqual((await w.call("GET", "/api/ve/kho", { as: SALES })).json.kho.map((d: { nhomKhach: string; conTrong: number }) => [d.nhomKhach, d.conTrong]), [["ALL", 1]]);
  assert.equal((await w.call("GET", "/api/ve/lo", { as: SALES })).json.lo[0].nhomKhach, "ALL");
  assert.equal((await w.call("POST", `/api/ve/lo/${loId}/bo`, { as: SALES, body: {} })).status, 200);
  assert.equal((await w.call("GET", "/api/ve/lo-da-huy", { as: SALES })).json.lo[0].nhomKhach, "ALL");
  const nhatKy = w.q("SELECT action, detail FROM audit_log WHERE action IN ('ve_nhap_lo', 've_xac_nhan_lo', 've_bo_lo')") as { action: string; detail: string }[];
  assert.equal(nhatKy.length, 4, JSON.stringify(nhatKy));
  for (const n of nhatKy) assert.match(n.detail, /Mọi loại khách/, n.action);
});

test("giao diện có dòng Mọi loại khách, không để chữ ALL lọt ra người dùng", () => {
  const nguon = readFileSync(new URL("../../../web/ve-kho.ts", import.meta.url), "utf8");
  assert.match(nguon, /ALL: "Mọi loại khách"/);
});
