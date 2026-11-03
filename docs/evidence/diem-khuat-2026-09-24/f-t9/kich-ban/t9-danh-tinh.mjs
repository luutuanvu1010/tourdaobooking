// Kiểm toán T9 (chỉ đọc mã; chạy trên D1 TẠM của startEnv): danh tính một người ↔ hồ sơ/tài khoản/vai.
// Chạy: cd <WT> && node <đường dẫn tệp này>
import { startEnv, ACCOUNTS, vnDate } from "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdao-sales-audit-62ea81/docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { writeFileSync, mkdirSync } from "node:fs";

const EV = "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdao-sales-audit-62ea81/docs/evidence/diem-khuat-2026-09-24/f-t9";
mkdirSync(EV, { recursive: true });
const out = [];
const log = (k, v) => { const line = `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`; out.push(line); console.log(line); };

const env = await startEnv();
try {
  // Trang đã đăng nhập của từng vai: gọi API bằng fetch trong trang (cookie + Origin cùng site như người dùng thật).
  // Kho cookie Chrome dùng chung giữa các trang → gọi API bằng fetch của Node, mỗi vai một cookie riêng, kèm Origin cùng site (như trình duyệt).
  const admin = await env.login(ACCOUNTS.admin);
  const sales = await env.login(ACCOUNTS.salesA);
  const call = async (c, method, path, body) => {
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  const order = (extra) => ({ customerName: "Khách", customerPhone: "0901234567", services: [{ kind: "manual", name: "Dịch vụ thử", pax: { adult: 1 }, departDate: vnDate(7), items: [{ description: "Tour", quantity: 1, unitPrice: 100000 }] }], ...extra });

  // ---- A. Tài khoản TRƯỚC, khách SAU: SĐT đăng nhập của đối tác không tra được → hồ sơ thứ hai.
  const P1 = "0935111222";
  let r = await call(admin, "POST", "/api/staff", { fullName: "Trần Văn Bình", phone: P1, roles: ["TAXI_DRIVER"] });
  log("A1 admin tạo tài khoản Tài xế taxi (P1)", { status: r.status, roles: r.body?.staff?.roles, permissions: r.body?.staff?.permissions, partyId: r.body?.staff?.partyId });
  const taxiParty = r.body?.staff?.partyId;
  r = await call(sales, "GET", `/api/parties/lookup?phone=${P1}`);
  log("A2 salesA tra hồ sơ theo SĐT P1 (như form lập đơn)", { status: r.status, matches: r.body?.matches?.length });
  r = await call(sales, "POST", "/api/orders", order({ customerName: "Trần Văn Bình", customerPhone: P1, newBooker: { fullName: "Trần Văn Bình", phone: P1 } }));
  log("A3 salesA lập đơn, tạo người đặt mới cùng SĐT P1", { status: r.status, bookerPartyId: r.body?.order?.bookerPartyId });
  const bookerParty = r.body?.order?.bookerPartyId;
  log("A4 hai hồ sơ cho cùng SĐT P1 (SQL chỉ đọc)", env.sql(`SELECT p.id, p.display_name, (SELECT group_concat(role_type_code) FROM pty_party_role r WHERE r.party_id = p.id AND r.valid_to_date IS NULL) AS vai, (SELECT count(*) FROM staff s WHERE s.party_id = p.id) AS co_tai_khoan FROM pty_party p WHERE p.id IN ('${taxiParty}', '${bookerParty}')`));
  r = await call(sales, "GET", `/api/parties/lookup?phone=${P1}`);
  log("A5 tra lại P1: chỉ thấy hồ sơ khách, không thấy hồ sơ đối tác", r.body?.matches?.map((m) => ({ id: m.id === taxiParty ? "HỒ SƠ ĐỐI TÁC" : m.id === bookerParty ? "HỒ SƠ KHÁCH MỚI" : m.id, roleCodes: m.roleCodes })));
  // Nhân viên nội bộ đặt tour cho người nhà bằng số của chính mình
  r = await call(sales, "GET", `/api/parties/lookup?phone=${ACCOUNTS.salesA.phone}`);
  log("A6 tra SĐT đăng nhập của chính salesA", { matches: r.body?.matches?.length });

  // ---- B. Khách TRƯỚC, tài khoản SAU (gọi API không kèm partyId): máy chủ không hỏi gì, tạo hồ sơ thứ hai.
  const P2 = "0935333444";
  r = await call(sales, "POST", "/api/parties", { kind: "PERSON", fullName: "Lê Thị Hoa", contacts: [{ kind: "PHONE", value: P2 }] });
  const custParty = r.body?.party?.id;
  log("B1 salesA tạo hồ sơ khách Lê Thị Hoa (P2)", { status: r.status });
  r = await call(admin, "POST", "/api/staff", { fullName: "Lê Thị Hoa", phone: P2, roles: ["HOTEL_RECEPTION"] });
  log("B2 admin tạo tài khoản Lễ tân khách sạn cùng P2, không kèm partyId", { status: r.status, partyIdKhacHoSoKhach: r.body?.staff?.partyId !== custParty });
  log("B3 số hồ sơ mang tên 'Lê Thị Hoa'", env.sql("SELECT count(*) AS n FROM pty_party WHERE display_name = 'Lê Thị Hoa'"));

  // ---- C. Vai nội bộ/bên ngoài chỉ gán được qua tài khoản; hồ sơ không đăng nhập không mang được vai thật.
  r = await call(sales, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: "Cty Lữ hành Biển Xanh", legalName: "Công ty TNHH Biển Xanh" });
  const org = r.body?.party?.id;
  log("C1 tạo hồ sơ tổ chức công ty lữ hành", { status: r.status });
  r = await call(admin, "POST", `/api/parties/${org}/roles`, { roleTypeCode: "TRAVEL_AGENCY" });
  log("C2 admin gán vai Công ty lữ hành cho hồ sơ tổ chức", { status: r.status, code: r.body?.error ?? r.body?.code, message: r.body?.message });
  r = await call(sales, "POST", "/api/parties", { kind: "PERSON", fullName: "Phạm Lễ Tân", contacts: [{ kind: "PHONE", value: "0935555666" }] });
  const recep = r.body?.party?.id;
  r = await call(admin, "POST", `/api/parties/${recep}/roles`, { roleTypeCode: "HOTEL_RECEPTION" });
  log("C3 admin gán vai Lễ tân khách sạn cho hồ sơ người KHÔNG tài khoản", { status: r.status, code: r.body?.error ?? r.body?.code });
  r = await call(admin, "POST", "/api/staff", { phone: "0935777888", roles: ["TRAVEL_AGENCY"], partyId: org });
  log("C4 tạo tài khoản công ty lữ hành trên hồ sơ tổ chức", { status: r.status, message: r.body?.message });
  r = await call(sales, "POST", "/api/orders", order({ bookerPartyId: org }));
  log("C5 gắn hồ sơ tổ chức làm bên đặt", { status: r.status, message: r.body?.message });
  r = await call(admin, "GET", "/api/parties/meta");
  log("C6 loại vai còn chọn được ở trang Hồ sơ (active && OTHER)", r.body?.roleTypes?.filter((t) => t.active && t.group === "OTHER").map((t) => t.name));

  // ---- D. Mã vai "ngưng dùng cho gán mới" (0024) có bị máy chủ chặn không?
  r = await call(admin, "POST", `/api/parties/${org}/roles`, { roleTypeCode: "AGENT" });
  log("D1 admin gán vai ĐÃ NGƯNG 'AGENT' qua API", { status: r.status, roles: r.body?.party?.roles?.map((x) => x.roleTypeCode) });

  // ---- Ảnh: ô thêm vai trò trên trang Hồ sơ của tổ chức.
  const pp = await env.as(ACCOUNTS.admin, `/parties`, { width: 1280, height: 900, mobile: false });
  await pp.waitFor(`[...document.querySelectorAll('tr, .card')].some((x) => x.textContent.includes('Cty Lữ hành Biển Xanh'))`, "danh sách hồ sơ", 15000);
  await pp.shot(`${EV}/t9-danh-sach-ho-so-trung.png`);
  log("E0 ảnh danh sách", `${EV}/t9-danh-sach-ho-so-trung.png`);
  await pp.ev(`(() => { const el = [...document.querySelectorAll('tbody tr, table tr')].find((x) => x.textContent.includes('Cty Lữ hành Biển Xanh')); el.click(); return true; })()`);
  await new Promise((res) => setTimeout(res, 2500));
  const opts = await pp.ev(`[...document.querySelectorAll('select')].map((s) => [...s.options].map((o) => o.textContent))`);
  log("E1 các ô chọn trên trang Hồ sơ", opts);
  await pp.shot(`${EV}/t9-ho-so-to-chuc-o-vai.png`);
  log("E2 ảnh", `${EV}/t9-ho-so-to-chuc-o-vai.png`);
} catch (e) {
  log("LỖI", String(e?.stack ?? e));
} finally {
  await env.stop();
  writeFileSync(`${EV}/t9-danh-tinh-ket-qua.txt`, out.join("\n") + "\n");
}
