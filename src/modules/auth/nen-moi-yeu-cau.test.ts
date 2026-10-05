// Phí nền của MỖI lời gọi API cần đăng nhập (nghiên cứu tốc độ 2026-10-02, đợt 1 việc 5): mỗi câu hỏi D1 nối đuôi là một chuyến đi tới cơ sở dữ liệu.
// Trước: (phiên ∥ nhân viên) rồi MỚI hỏi chế độ bảo trì rồi (ghi `last_seen_at` có chờ khi phiên rảnh > 5 phút) — và `/api/auth/me` hỏi bảo trì LẦN HAI.
// Sau: phiên ∥ nhân viên ∥ bảo trì cùng lúc; `last_seen_at` ghi ở nền (`waitUntil`, không chặn phản hồi); `/me` dùng lại trạng thái bảo trì đã đọc.
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs) với D1 bọc: mỗi câu chờ một nhịp để thấy thứ tự bắt đầu / kết thúc.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff, world } from "../../../tests/audit/harness.mjs";

const AN = "11111111-1111-4111-8111-111111111111";
const CHU = "77777777-7777-4777-8777-777777777777";

/** Nhãn của các câu nền; câu khác ghi là "khac". */
function nhan(sql: string): string {
  if (/UPDATE aut_session SET last_seen_at/.test(sql)) return "cham-phien";
  if (/FROM aut_session WHERE id = \?1 AND staff_id/.test(sql)) return "phien";
  if (/FROM staff s LEFT JOIN v_pty_party_label pl ON pl.id = s.party_id WHERE s.id = \?1/.test(sql)) return "nhan-vien";
  if (/mnt_setting/.test(sql) && /^\s*SELECT/i.test(sql)) return "bao-tri";
  return "khac";
}

/** Bọc `env.DB.prepare`: ghi "bat-dau:<nhãn>" / "ket-thuc:<nhãn>" vào `su` quanh MỖI lần chạy; câu ghi `cham-phien` chậm hơn để thấy nó có chặn phản hồi không. */
function doNhip(w: any, su: string[]) {
  const goc = w.env.DB.prepare.bind(w.env.DB);
  const cho = (ms: number) => new Promise((r) => setTimeout(r, ms));
  w.env.DB.prepare = (sql: string) => {
    const mot = (cau: any) => {
      const bao = (ten: "first" | "all" | "run") => async (...a: unknown[]) => {
        const nh = nhan(sql);
        su.push(`bat-dau:${nh}`);
        await cho(nh === "cham-phien" ? 60 : 15);
        const kq = await cau[ten](...a);
        su.push(`ket-thuc:${nh}`);
        return kq;
      };
      return { ...cau, bind: (...a: unknown[]) => mot(cau.bind(...a)), first: bao("first"), all: bao("all"), run: bao("run") };
    };
    return mot(goc(sql));
  };
}

function dung() {
  const w = world();
  seedStaff(w.sqlite, { id: AN, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: CHU, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  return w;
}
const cuHoa = (w: any, id: string) => w.sqlite.prepare("UPDATE aut_session SET last_seen_at = '2026-01-01T00:00:00.000Z' WHERE staff_id = ?").run(id);

test("GET /api/auth/me: phiên, nhân viên, bảo trì chạy CÙNG LÚC và chỉ hỏi bảo trì MỘT lần (3 câu, không phải 4)", async () => {
  const w = dung();
  await w.token(AN); // tạo phiên trước, rồi mới bọc D1 để chỉ đếm câu của chính lời gọi dưới
  const su: string[] = [];
  doNhip(w, su);
  const r = await w.call("GET", "/api/auth/me", { as: AN });
  assert.equal(r.status, 200);
  await w.choNen();
  const nen = su.filter((s) => s.startsWith("bat-dau:") && !s.endsWith(":cham-phien")).map((s) => s.slice(8));
  assert.deepEqual([...nen].sort(), ["bao-tri", "nhan-vien", "phien"], `các câu đã hỏi: ${su.join(", ")}`);
  const dauTienKetThuc = su.findIndex((s) => s.startsWith("ket-thuc:"));
  const batDauTruoc = su.slice(0, dauTienKetThuc).filter((s) => s.startsWith("bat-dau:")).map((s) => s.slice(8));
  assert.deepEqual([...batDauTruoc].sort(), ["bao-tri", "nhan-vien", "phien"], `ba câu phải BẮT ĐẦU trước khi câu nào kết thúc: ${su.join(", ")}`);
  assert.equal(r.json.maintenance.on, false);
});

test("GET một route thường: đúng 3 câu nền song song, rồi tới câu của chính route (không chặng bảo trì nối đuôi)", async () => {
  const w = dung();
  await w.token(AN);
  const su: string[] = [];
  doNhip(w, su);
  const r = await w.call("GET", "/api/feedback/badge", { as: AN });
  assert.equal(r.status, 200);
  const dauTienKetThuc = su.findIndex((s) => s.startsWith("ket-thuc:"));
  const batDauTruoc = su.slice(0, dauTienKetThuc).filter((s) => s.startsWith("bat-dau:"));
  assert.equal(batDauTruoc.length, 3, `phải có 3 câu bắt đầu trước khi câu nào kết thúc: ${su.join(", ")}`);
});

test("ghi last_seen_at (phiên rảnh > 5 phút) làm Ở NỀN: phản hồi về TRƯỚC khi câu ghi xong; chờ nền xong thì dòng phiên đã được cập nhật", async () => {
  const w = dung();
  await w.token(AN);
  cuHoa(w, AN);
  const su: string[] = [];
  doNhip(w, su);
  const r = await w.call("GET", "/api/auth/me", { as: AN });
  assert.equal(r.status, 200);
  assert.ok(su.includes("bat-dau:cham-phien"), "phiên rảnh phải được ghi mốc hoạt động");
  assert.ok(!su.includes("ket-thuc:cham-phien"), `phản hồi phải về TRƯỚC khi câu ghi last_seen_at xong (câu ghi chậm 60 ms): ${su.join(", ")}`);
  await w.choNen();
  assert.ok(su.includes("ket-thuc:cham-phien"));
  const dong = w.sqlite.prepare("SELECT last_seen_at FROM aut_session WHERE staff_id = ?").get(AN) as { last_seen_at: string };
  assert.ok(dong.last_seen_at > "2026-06-01", `last_seen_at chưa được cập nhật: ${dong.last_seen_at}`);
});

test("câu ghi last_seen_at lỗi ở nền KHÔNG làm hỏng phản hồi", async () => {
  const w = dung();
  await w.token(AN);
  cuHoa(w, AN);
  const goc = w.env.DB.prepare.bind(w.env.DB);
  w.env.DB.prepare = (sql: string) => {
    const c = goc(sql);
    if (nhan(sql) !== "cham-phien") return c;
    return { ...c, bind: (...a: unknown[]) => ({ ...c.bind(...a), run: async () => { throw new Error("D1 lỗi giả"); } }) };
  };
  const r = await w.call("GET", "/api/auth/me", { as: AN });
  assert.equal(r.status, 200);
  await w.choNen();
});

test("chế độ bảo trì BẬT: tài khoản thường vẫn bị chặn 503, Toàn quyền vẫn qua (trạng thái bảo trì đọc song song vẫn được dùng đúng)", async () => {
  const w = dung();
  w.sqlite.exec("UPDATE mnt_setting SET enabled = 1, ends_at = NULL WHERE id = 'default'");
  const an = await w.call("GET", "/api/feedback/badge", { as: AN });
  assert.equal(an.status, 503);
  assert.equal(an.json.error.code, "maintenance");
  const chu = await w.call("GET", "/api/auth/me", { as: CHU });
  assert.equal(chu.status, 200);
  assert.equal(chu.json.maintenance.on, true);
});

test("cookie giả mạo: 401 và KHÔNG hỏi cơ sở dữ liệu câu nào (chữ ký sai bị loại trước khi đụng D1)", async () => {
  const w = dung();
  const su: string[] = [];
  doNhip(w, su);
  const r = await w.call("GET", "/api/auth/me", { headers: { cookie: "td_session=gia.mao.hoan.toan" } });
  assert.equal(r.status, 401);
  assert.deepEqual(su, []);
});

// Bất biến mà ADR-0075 điều 9 và ADR-0102 điều 5 dựa vào (người kiểm độc lập 2026-10-05, V4): nhãn "Đang hiệu lực" của màn Phiên đăng nhập tính theo
// max(created_at, last_seen_at), nên phiên ĐÃ BỊ lưới từ chối (đổi PIN/gỡ Face ID sau khi cấp phiên, hoặc tài khoản ngưng) KHÔNG BAO GIỜ được ghi last_seen_at —
// kể cả khi việc ghi nay chạy ở nền. Mã đúng nhờ `if (!row || !staff) return null` đứng TRƯỚC khối ghi; bài này khoá thứ tự đó.
const MOC_CU = "2026-01-01T00:00:00.000Z";
const lastSeen = (w: any, id: string) => (w.sqlite.prepare("SELECT last_seen_at FROM aut_session WHERE staff_id = ?").get(id) as { last_seen_at: string }).last_seen_at;

test("phiên cấp TRƯỚC lần đổi PIN/gỡ Face ID (credentials_changed_at > thời điểm phát hành): 401 và KHÔNG ghi last_seen_at (kể cả ở nền)", async () => {
  const w = dung();
  await w.token(AN);
  cuHoa(w, AN);
  w.sqlite.prepare("UPDATE staff SET credentials_changed_at = ? WHERE id = ?").run(Date.now() + 60_000, AN);
  const r = await w.call("GET", "/api/auth/me", { as: AN });
  assert.equal(r.status, 401);
  await w.choNen();
  assert.equal(lastSeen(w, AN), MOC_CU, "phiên bị lưới từ chối không được chạm last_seen_at");
});

test("tài khoản đã ngưng (active = 0): 401 và KHÔNG ghi last_seen_at", async () => {
  const w = dung();
  await w.token(AN);
  cuHoa(w, AN);
  w.sqlite.prepare("UPDATE staff SET active = 0 WHERE id = ?").run(AN);
  const r = await w.call("GET", "/api/auth/me", { as: AN });
  assert.equal(r.status, 401);
  await w.choNen();
  assert.equal(lastSeen(w, AN), MOC_CU);
});
