// BÀI CỔNG TOÀN TUYẾN CỦA TÀI XẾ (ADR-0040 D3: "không vào cổng văn phòng, không vào cổng đơn hàng"; lượt 1a tài xế chỉ đăng nhập, dùng trang Tài khoản,
// nhận thông báo gửi cho mình, xem giấy tờ của chính mình). Kế hoạch Task A18 — SIẾT thêm, điều phối giữ (Ruling R11).
// Bài `src/shared/cong-quyen.test.ts` chỉ khoá DANH SÁCH cổng; bài này chứng minh ROUTER THẬT áp danh sách đó với MỌI route thật:
//   (1) mọi route cổng office / orders / admin, gọi bằng tài khoản CHỈ có quyền DRIVER → 403 `forbidden` với ĐÚNG câu của cổng (không phải câu của route);
//   (2) mọi route cổng "staff" có một dòng ở BANG_STAFF ghi TAY mã trạng thái kỳ vọng + lý do (đối chiếu ADR-0040 D3 từng dòng lúc thi công) — tập khoá phải
//       BẰNG tập route "staff" thật: route "staff" mới mà chưa quyết cho tài xế → đỏ.
// Danh sách route lấy từ MÃ THẬT: mọi thư mục src/modules/* có `export const xModule: AppModule` (gói bằng esbuild như src/route-access.test.ts).
// ADR-0048 D2 (SIẾT, Task A4): hai bài (1), (2) chạy cho TỪNG mã tài xế — DRIVER (tài xế công ty) và DRIVER_PARTNER (tài xế đối tác: "không vào office,
// orders, admin; chỉ staff"). BANG_STAFF giữ MỘT bảng vì mã trả GIỐNG NHAU ở mọi route (đối chiếu ADR-0048 D2 từng dòng 2026-09-29: ô party.document.view
// = own ở cả hai cột nên /api/parties/documents/mine 200 cho cả hai; mọi ô đơn/tiền/liên hệ none ở cả hai). Route nào khác mã → tách giá trị theo mã.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import type { AppModule } from "./shared/router.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";

const SRC = fileURLToPath(new URL(".", import.meta.url));
const ROUTES: { method: string; path: string; access: string }[] = [];
for (const d of readdirSync(join(SRC, "modules")).sort()) {
  if (!statSync(join(SRC, "modules", d)).isDirectory()) continue;
  const entry = join(SRC, "modules", d, "index.ts");
  const m = /export const (\w+Module)\s*:\s*AppModule/.exec(readFileSync(entry, "utf8"));
  if (!m) continue;
  const built = await esbuild.build({ entryPoints: [entry], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent" });
  const mod = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Record<string, AppModule>;
  for (const r of mod[m[1]!]!.routes) ROUTES.push({ method: r.method, path: r.path, access: r.access });
}

const DRIVER = "66666666-6666-4666-8666-666666666666";
const DRIVER_PARTNER = "66666666-6666-4666-8666-666666666667";
/** Hai mã tài xế — mỗi bài cổng chạy cho TỪNG mã (tên bài mang mã). */
const TAI_XE: readonly [string, string][] = [["DRIVER", DRIVER], ["DRIVER_PARTNER", DRIVER_PARTNER]];
const SALES = "11111111-1111-4111-8111-111111111111";
const DON = "99999999-9999-4999-8999-999999999991"; // đơn CÓ THẬT (gieo dưới) — route đơn cổng "staff" phải 403, không phải 404, không phải dữ liệu
const LA = "99999999-9999-4999-8999-999999999999";
/** Câu của ba cổng trong src/shared/router.ts (403 của cổng, trước khi vào route). */
const CAU_CONG = new Set([
  "Chỉ quản trị viên được thực hiện thao tác này.",
  "Tài khoản này chỉ dùng cho việc được giao, không dùng màn hình này.",
  "Tài khoản này không dùng được màn hình đơn.",
]);

/**
 * Route cổng "staff" → mã trạng thái kỳ vọng khi tài khoản CHỈ-DRIVER gọi (thân `{}` với POST/PUT/DELETE; tham số `:x` = id lạ, riêng route đơn dùng đơn có
 * thật) + lý do đối chiếu ADR-0040 D3. Ghi TAY lúc thi công (2026-09-28) sau khi đọc từng dòng; không có dòng nào trả dữ liệu đơn / khách / tiền.
 */
type MucBang = { ma: number; ly_do: string };
/**
 * Dòng CHUNG (một mã cho cả hai mã tài xế) hoặc dòng TÁCH theo mã quyền `{ DRIVER, DRIVER_PARTNER }` — ADR-0049 Task A15 (TC-36): route "Cuốc của tôi" và lệnh tiến
 * độ của tài xế trả khác nhau: DRIVER (ô trip.view / trip.progress = assigned) → 200 danh sách / 404 chuyến lạ; DRIVER_PARTNER (ô none) → 403 ở bước đầu.
 */
const BANG_STAFF: Record<string, MucBang | { DRIVER: MucBang; DRIVER_PARTNER: MucBang }> = {
  "POST /api/account/change-pin": { ma: 400, ly_do: "tự phục vụ: đổi PIN của chính mình (trang Tài khoản); thân rỗng → 400" },
  "GET /api/account/passkeys": { ma: 503, ly_do: "tự phục vụ Face ID của chính mình; khung thử tắt Face ID → 503" },
  "POST /api/account/passkeys": { ma: 503, ly_do: "như trên" },
  "POST /api/account/passkeys/options": { ma: 503, ly_do: "như trên" },
  "POST /api/account/passkeys/remove-all": { ma: 503, ly_do: "như trên" },
  "DELETE /api/account/passkeys/:id": { ma: 503, ly_do: "như trên" },
  "POST /api/account/pin-by-passkey": { ma: 503, ly_do: "như trên" },
  "POST /api/account/pin-by-passkey/options": { ma: 503, ly_do: "như trên" },
  "POST /api/account/thong-bao/da-doc": { ma: 200, ly_do: "tự phục vụ: mốc đã đọc thông báo của chính mình (nhận thông báo gửi cho mình — D3)" },
  "POST /api/account/thong-bao/:id/da-hieu": { ma: 404, ly_do: "tự phục vụ: xác nhận đã hiểu tin của mình; tin lạ → 404" },
  "GET /api/account/sessions": { ma: 200, ly_do: "tự phục vụ: lịch sử phiên đăng nhập của CHÍNH MÌNH (ADR-0075 điều 7) — không dữ liệu đơn" },
  "GET /api/account/thong-bao/may": { ma: 200, ly_do: "tự phục vụ: máy nhận thông báo của chính mình" },
  "POST /api/account/thong-bao/may": { ma: 400, ly_do: "như trên; thân rỗng → 400" },
  "POST /api/account/thong-bao/may/huy": { ma: 400, ly_do: "như trên; thân rỗng → 400" },
  "GET /api/auth/me": { ma: 200, ly_do: "phiên của chính mình (đăng nhập — D3)" },
  "GET /api/bang-tin": { ma: 426, ly_do: "bắt tay Bảng tin; nhãn nhận tin tính bằng can() — DRIVER không có tat-ca/cho-nhan, chỉ nguoi:<mình>; thiếu Upgrade → 426" },
  "GET /api/dispatch/mine": { ma: 403, ly_do: "việc của hướng dẫn viên — ô contact.view / money.view của DRIVER là none" },
  "POST /api/feedback": { ma: 400, ly_do: "gửi góp ý (feedback.submit any — Ruling R2, như mọi tài khoản); thân rỗng → 400" },
  "GET /api/tro-ly/khung": { ma: 200, ly_do: "ADR-0069 điều 3, 4: cờ được dùng trợ lý + câu chào, câu hỏi mẫu (chữ đã qua bộ lọc nội dung) + cách gọi / cách xưng của CHÍNH người gọi (ADR-0084, không giới tính thô) — không dữ liệu nghiệp vụ" },
  "POST /api/tro-ly/hoi": { ma: 400, ly_do: "ADR-0066 điều 1: hỏi trợ lý Hỗ trợ (assistant.ask any — mọi tài khoản); thân rỗng → 400, không đọc dữ liệu nghiệp vụ" },
  "GET /api/feedback/:id": { ma: 404, ly_do: "góp ý của mình (feedback.view own); id lạ → 404" },
  "POST /api/feedback/:id/messages": { ma: 404, ly_do: "như trên" },
  "GET /api/feedback/badge": { ma: 200, ly_do: "số góp ý của mình (ADR-0038)" },
  "GET /api/feedback/mine": { ma: 200, ly_do: "góp ý của mình" },
  "GET /api/ledger/mine": { ma: 403, ly_do: "sổ tiền lượt 1: \"Sổ của tôi\" — ô ledger.view của DRIVER, DRIVER_PARTNER là none (tài xế không thu tiền khách — bản làm mới §2)" },
  "GET /api/locations": { ma: 200, ly_do: "tên địa điểm (không nhạy cảm; mọi tài khoản đăng nhập — người làm hiện trường cũng cần)" },
  "POST /api/orders/:id/handler-cancel": { ma: 403, ly_do: "huỷ đơn đang phụ trách — ô order.cancel của DRIVER là none (đơn có thật → 403, không dữ liệu)" },
  "POST /api/orders/:id/handler-money-edit": { ma: 403, ly_do: "sửa số khách đơn đang phụ trách — chỉ cấp hẹp đang được giao / Toàn quyền (đơn có thật → 403)" },
  "GET /api/parties/documents/mine": { ma: 200, ly_do: "giấy tờ của CHÍNH MÌNH, số che (Ruling R4, R5; ô party.document.view own)" },
  "GET /api/thong-bao": { ma: 200, ly_do: "hộp thông báo gửi cho mình (D3)" },
  "GET /api/thong-bao/tom-tat": { ma: 200, ly_do: "như trên" },
  "GET /api/thong-bao/moi-nhat": { ma: 200, ly_do: "như trên (Web Push)" },
  // ADR-0049 D3 (Task A15, TC-36): "Cuốc của tôi" + lệnh tiến độ của tài xế công ty — TÁCH theo mã (kế hoạch mục 1.2: 403 → 404 → 400).
  "GET /api/van-chuyen/cuoc-cua-toi": {
    DRIVER: { ma: 200, ly_do: "chuyến MÌNH đang lái (trip.view assigned) — tài khoản thử không lái chuyến nào → danh sách rỗng" },
    DRIVER_PARTNER: { ma: 403, ly_do: "tài xế đối tác chưa dùng app cho chuyến (trip.view none — ADR-0048 D2 × ADR-0049 D3)" },
  },
  ...Object.fromEntries(
    ["GET /api/van-chuyen/cuoc-cua-toi/:id", ...["xuat-ben", "diem/:sid/da-toi", "phan-bo/:aid/don", "phan-bo/:aid/vang", "phan-bo/:aid/khach-huy", "phan-bo/:aid/tra",
      "ket-thuc", "ket-thuc-gian-doan", "thu-tu"].map((d) => `POST /api/van-chuyen/cuoc-cua-toi/:id/${d}`)].map((k) => [k, {
      DRIVER: { ma: 404, ly_do: "chuyến lạ / không phải chuyến mình đang lái → 404 TRƯỚC khi đọc thân (mục 1.2)" },
      DRIVER_PARTNER: { ma: 403, ly_do: "ô trip.view none → 403 ở bước đầu, trước mọi truy vấn" },
    }]),
  ),
};
const mucCua = (k: string, ma: string): MucBang => {
  const m = BANG_STAFF[k]!;
  return "ma" in m ? m : m[ma as "DRIVER" | "DRIVER_PARTNER"];
};

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: DRIVER, phone: "0900000006", name: "Tài xế", perms: ["DRIVER"] });
  seedStaff(w.sqlite, { id: DRIVER_PARTNER, phone: "0900000007", name: "Tài xế đối tác", perms: ["DRIVER_PARTNER"] });
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  w.sqlite.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at)
                 VALUES ('${DON}', 'TD-THU-01', '${SALES}', 'confirmed', 'Khách Thử', '0900000011', '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z')`);
  return w;
}
const dienThamSo = (path: string) => (path.startsWith("/api/orders/:id/") ? path.replace(":id", DON) : path.replace(/:[A-Za-z]+/g, LA));
const khoa = (r: { method: string; path: string }) => `${r.method} ${r.path}`;

test("danh sách route đủ: 17 module có route; mỗi route cổng staff có đúng một dòng ở BANG_STAFF (và ngược lại)", () => {
  assert.ok(ROUTES.length >= 110, `ít nhất 110 route (ảnh chụp route-access), thấy ${ROUTES.length}`);
  assert.deepEqual(Object.keys(BANG_STAFF).sort(), ROUTES.filter((r) => r.access === "staff").map(khoa).sort(), "route staff mới phải được QUYẾT cho tài xế (thêm dòng BANG_STAFF)");
});

for (const [ma, id] of TAI_XE) {
  test(`ADR-0040 D3 + ADR-0048 D2: tài khoản CHỈ-${ma} gọi MỌI route cổng office / orders / admin → 403 forbidden ở CỔNG (đúng câu của cổng)`, async () => {
    const w = setup();
    const cong = ROUTES.filter((r) => r.access === "office" || r.access === "orders" || r.access === "admin");
    assert.ok(cong.length >= 70, `chống bài rỗng: ${cong.length} route sau cổng`);
    for (const r of cong) {
      const res = await w.call(r.method, dienThamSo(r.path), { as: id, body: r.method === "GET" ? undefined : {} });
      assert.equal(res.status, 403, `${ma} — ${khoa(r)} (${r.access}): ${res.text}`);
      assert.equal(res.json?.error?.code, "forbidden", `${ma} — ${khoa(r)}`);
      assert.ok(CAU_CONG.has(res.json.error.message), `${ma} — ${khoa(r)}: 403 phải là của CỔNG, thấy "${res.json.error.message}"`);
    }
  });

  test(`ADR-0040 D3 + ADR-0048 D2: ${ma} — mọi route cổng staff trả ĐÚNG mã đã quyết ở BANG_STAFF; không route nào trả dữ liệu đơn / khách / tiền`, async () => {
    const w = setup();
    for (const r of ROUTES.filter((x) => x.access === "staff")) {
      const res = await w.call(r.method, dienThamSo(r.path), { as: id, body: r.method === "GET" ? undefined : {} });
      const k = khoa(r);
      const muc = mucCua(k, ma);
      assert.equal(res.status, muc.ma, `${ma} — ${k} — ${muc.ly_do}: ${res.text.slice(0, 200)}`);
      for (const lo of ["TD-THU-01", "Khách Thử", "0900000011"]) assert.ok(!res.text.includes(lo), `${ma} — ${k}: lộ dữ liệu đơn "${lo}"`);
    }
  });
}
