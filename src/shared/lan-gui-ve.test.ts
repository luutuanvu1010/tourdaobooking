// HÀNG RÀO H4 (ADR-0094 đ5; đặc tả §3.2) — vòng đời vé ở máy khách (mô-đun thuần src/shared/lan-gui-ve.ts, `web/api.ts` chỉ gọi nó). Chạy với kho lưu
// GIẢ và đồng hồ giả. Ca chính: hai lần ghi THẬT giống hệt nhau nối tiếp ⇒ vé KHÁC (lớp không nuốt lần ghi thật thứ hai — T4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { BI_MAT, KHONG_VE, khopMau } from "./lan-gui-bi-mat.ts";
import { HAN_VE_MS, TOI_DA_MUC, taoVongDoiVe, type KhoLuu } from "./lan-gui-ve.ts";

function khoGia(): KhoLuu & { du: Map<string, string> } {
  const du = new Map<string, string>();
  return { du, getItem: (k) => du.get(k) ?? null, setItem: (k, v) => void du.set(k, v), removeItem: (k) => void du.delete(k) };
}
let n = 0; // dùng chung mọi lần dựng: vé giả không bao giờ trùng giữa hai "lần tải trang"
function dung(o: { kho?: KhoLuu | null; nguoi?: string | null } = {}) {
  let bayGio = Date.parse("2026-10-03T01:00:00.000Z");
  const kho = o.kho === undefined ? khoGia() : o.kho;
  const vd = taoVongDoiVe({ kho: () => kho, dongHo: () => bayGio, sinhVe: () => `ve-${String(++n).padStart(14, "0")}` });
  vd.datNguoi(o.nguoi === undefined ? "s1" : o.nguoi);
  return { vd, kho, toi: (ms: number) => void (bayGio += ms) };
}
const THAN = JSON.stringify({ soTien: 60000 });
const P = "/api/orders/o1/payments";

test("H4 / T4: hai lần ghi thật giống hệt nhau nối tiếp, lần 1 nhận 201 ⇒ lần 2 mang vé KHÁC", async () => {
  const { vd } = dung();
  const a = await vd.moVe("POST", P, THAN);
  vd.ketThuc(a, { status: 201 });
  const b = await vd.moVe("POST", P, THAN);
  assert.ok(a && b);
  assert.notEqual(a.ve, b.ve);
});

test("mất mạng / hết giờ ⇒ giữ vé ⇒ lần bấm lại CÙNG vé; bấm đúp (vé đang mở) cũng cùng vé", async () => {
  const { vd } = dung();
  const a = await vd.moVe("POST", P, THAN);
  const dup = await vd.moVe("POST", P, THAN);
  assert.equal(dup!.ve, a!.ve, "bấm đúp khi vé đang mở");
  vd.ketThuc(a, { matMang: true });
  assert.equal((await vd.moVe("POST", P, THAN))!.ve, a!.ve);
});

test("5xx ⇒ giữ; 409 dang_xu_ly ⇒ giữ; 422 ⇒ đóng; 400 ⇒ đóng; 200 da_ghi_truoc_do ⇒ đóng", async () => {
  for (const [kq, giu] of [
    [{ status: 500 }, true], [{ status: 503 }, true], [{ status: 409, code: "dang_xu_ly" }, true],
    [{ status: 409, code: "account_rule" }, false], [{ status: 422, code: "ma_lan_gui_khac_noi_dung" }, false], [{ status: 400 }, false], [{ status: 200 }, false],
  ] as const) {
    const { vd } = dung();
    const a = await vd.moVe("POST", P, THAN);
    vd.ketThuc(a, kq);
    assert.equal((await vd.moVe("POST", P, THAN))!.ve === a!.ve, giu, JSON.stringify(kq));
  }
});

test("401 (phiên bị đá / hết hạn — cổng đăng nhập trả lời, KHÔNG phải lệnh) ⇒ GIỮ vé; đăng nhập lại, tải lại trang ⇒ CÙNG vé (ADR-0094 đ3, đặc tả §3.2 mục 7)", async () => {
  const kho = khoGia();
  const { vd } = dung({ kho });
  const a = await vd.moVe("POST", P, THAN);
  vd.ketThuc(a, { matMang: true }); // máy chủ đã lưu, phản hồi mất
  const lai = await vd.moVe("POST", P, THAN);
  assert.equal(lai!.ve, a!.ve);
  vd.ketThuc(lai, { status: 401, code: "unauthenticated" }); // bấm lại đúng lúc phiên bị đá
  const { vd: sauDangNhap } = dung({ kho });
  assert.equal((await sauDangNhap.moVe("POST", P, THAN))!.ve, a!.ve, "sau khi đăng nhập lại vẫn trúng vé cũ ⇒ máy chủ phát lại, không ghi lần hai");
});

test("khác thân / khác đường dẫn / khác phương thức ⇒ khác vé", async () => {
  const { vd } = dung();
  const a = await vd.moVe("POST", P, THAN);
  assert.notEqual((await vd.moVe("POST", P, JSON.stringify({ soTien: 70000 })))!.ve, a!.ve);
  assert.notEqual((await vd.moVe("POST", "/api/orders/o2/payments", THAN))!.ve, a!.ve);
  assert.notEqual((await vd.moVe("PUT", P, THAN))!.ve, a!.ve);
});

test("T3 (máy): 'tải lại trang' (mô-đun mới, kho còn nguyên) ⇒ cùng vé; kho lưu chỉ có mã băm + vé + mốc, không thân", async () => {
  const kho = khoGia();
  const { vd } = dung({ kho });
  const a = await vd.moVe("POST", "/api/orders", JSON.stringify({ customerName: "Khách Một", customerPhone: "0912345678" }));
  const { vd: sau } = dung({ kho });
  assert.equal((await sau.moVe("POST", "/api/orders", JSON.stringify({ customerName: "Khách Một", customerPhone: "0912345678" })))!.ve, a!.ve);
  const chu = [...kho.du.entries()].map(([k, v]) => k + v).join("");
  assert.deepEqual([...kho.du.keys()], ["lg:s1"]);
  for (const x of ["0912345678", "Khách", "customer"]) assert.ok(!chu.includes(x), `kho lộ "${x}"`);
  assert.match(chu, /[0-9a-f]{64}/, "khoá mục là mã băm SHA-256");
});

test("mục quá 24 giờ bị bỏ; mục thứ 51 đẩy mục cũ nhất", async () => {
  assert.equal(HAN_VE_MS, 24 * 3600 * 1000);
  assert.equal(TOI_DA_MUC, 50);
  const kho2 = khoGia();
  const d2 = dung({ kho: kho2 });
  const v0 = await d2.vd.moVe("POST", "/api/x/0", "");
  for (let i = 1; i <= 50; i++) {
    d2.toi(1000);
    await d2.vd.moVe("POST", `/api/x/${i}`, "");
  }
  const muc = JSON.parse(kho2.du.get("lg:s1")!);
  assert.equal(Object.keys(muc).length, 50);
  const d3 = dung({ kho: kho2 });
  assert.notEqual((await d3.vd.moVe("POST", "/api/x/0", ""))!.ve, v0!.ve, "mục cũ nhất đã bị đẩy");
  assert.equal((await d3.vd.moVe("POST", "/api/x/50", ""))!.ve !== undefined, true);
});

test("mục quá 24 giờ ⇒ không dùng lại (cả kho lưu lẫn bộ nhớ trang)", async () => {
  const kho = khoGia();
  const d = dung({ kho });
  const a = await d.vd.moVe("POST", P, THAN);
  d.toi(HAN_VE_MS + 1);
  assert.notEqual((await d.vd.moVe("POST", P, THAN))!.ve, a!.ve);
});

test("T16: route bí mật KHÔNG BAO GIỜ chạm kho lưu (chỉ bộ nhớ trang); vẫn chống bấm đúp trong trang", async () => {
  const kho = khoGia();
  const { vd } = dung({ kho });
  const a = await vd.moVe("POST", "/api/account/change-pin", JSON.stringify({ pin: "123456", newPin: "654321" }));
  const b = await vd.moVe("POST", "/api/account/change-pin", JSON.stringify({ pin: "123456", newPin: "654321" }));
  assert.equal(b!.ve, a!.ve);
  await vd.moVe("POST", "/api/parties/p1/documents/d1/reveal", "");
  assert.equal(kho.du.size, 0);
});

test("chưa biết người đăng nhập ⇒ chỉ bộ nhớ trang; route công khai (đăng nhập) ⇒ không vé", async () => {
  const kho = khoGia();
  const { vd } = dung({ kho, nguoi: null });
  assert.ok(await vd.moVe("POST", P, THAN));
  assert.equal(kho.du.size, 0);
  assert.equal(await vd.moVe("POST", "/api/auth/login", JSON.stringify({ phone: "0900000001", pin: "123456" })), null);
  assert.equal(await vd.moVe("GET", P, ""), null, "phương thức đọc không có vé");
});

test("kho lưu hỏng / ném lỗi ⇒ lùi về bộ nhớ trang, không ném", async () => {
  const hong: KhoLuu = { getItem: () => { throw new Error("chặn"); }, setItem: () => { throw new Error("chặn"); }, removeItem: () => { throw new Error("chặn"); } };
  const { vd } = dung({ kho: hong });
  const a = await vd.moVe("POST", P, THAN);
  assert.equal((await vd.moVe("POST", P, THAN))!.ve, a!.ve);
  vd.ketThuc(a, { status: 201 });
  const r = khoGia();
  r.du.set("lg:s1", "không phải JSON");
  const d = dung({ kho: r });
  assert.ok(await d.vd.moVe("POST", P, THAN));
});

test("danh sách bí mật / không vé: mục là route ghi có thật; KHONG_VE = đúng các route ghi công khai", () => {
  const SRC = fileURLToPath(new URL("..", import.meta.url));
  const routes: { k: string; access: string }[] = [];
  for (const mod of readdirSync(join(SRC, "modules"))) {
    const f = join(SRC, "modules", mod, "index.ts");
    if (!existsSync(f)) continue;
    for (const h of readFileSync(f, "utf8").matchAll(/route\(\s*"(POST|PUT|PATCH|DELETE)",\s*"([^"]+)",\s*"([^"]+)"/g)) routes.push({ k: `${h[1]} ${h[2]}`, access: h[3]! });
  }
  for (const m of BI_MAT) assert.ok(routes.some((r) => r.k === `${m.method} ${m.path}`), `BI_MAT: ${m.method} ${m.path} không phải route có thật`);
  assert.deepEqual(KHONG_VE.map((m) => `${m.method} ${m.path}`).sort(), routes.filter((r) => r.access === "public").map((r) => r.k).sort());
  assert.equal(khopMau("/api/parties/:id/documents", "/api/parties/p1/documents?x=1"), true);
  assert.equal(khopMau("/api/parties/:id/documents", "/api/parties//documents"), false);
});
