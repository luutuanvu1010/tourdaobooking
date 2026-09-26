// Dùng chung cho các kịch bản e2e. Chạy qua `npm run test:e2e` (tests/e2e/run.mjs dựng D1 tạm + wrangler dev riêng).
// Chạy lẻ một kịch bản: đặt E2E_BASE_URL (server đang chạy) và E2E_PERSIST_TO (thư mục D1 local của server đó).
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { request as httpRequest } from "node:http";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8787";
const PERSIST = process.env.E2E_PERSIST_TO;

/** Tài khoản test cố định — run.mjs nạp chúng vào D1 tạm. Chỉ có ý nghĩa ở local. */
export const ACCOUNTS = {
  salesA: { name: "NV Bán A (test)", phone: "0900000002", pin: "246810", permissions: ["SALES"] },
  salesB: { name: "NV Bán B (test)", phone: "0900000003", pin: "135790", permissions: ["SALES"] },
  admin: { name: "QTV Test", phone: "0900000004", pin: "112233", permissions: ["ADMIN"] },
  accountant: { name: "Kế Toán Test", phone: "0900000005", pin: "224466", permissions: ["ACCOUNTING"] },
  field: { name: "Hiện Trường Test", phone: "0900000006", pin: "335577", permissions: ["FIELD"] },
  superAdmin: { name: "Super Admin Test", phone: "0900000007", pin: "446688", permissions: ["SUPER_ADMIN"] },
};

let ipn = 0;
/** IP giả khác nhau cho từng request để bộ đếm chống dò theo IP không chặn nhầm kịch bản. */
export const freshIp = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${(++ipn % 250) + 1}`;

/** Gọi API như trình duyệt cùng trang (có Origin + JSON). Trả status, body JSON, cookie phiên mới (nếu có), headers. */
export async function call(cookie, method, path, body, ip = freshIp()) {
  const r = await fetch(BASE + path, {
    method,
    headers: { cookie: cookie ?? "", "content-type": "application/json", origin: BASE, "cf-connecting-ip": ip },
    body: body !== undefined && method !== "GET" ? JSON.stringify(body) : undefined,
  });
  const setCookie = r.headers.get("set-cookie");
  return { status: r.status, body: await r.json().catch(() => null), cookie: setCookie?.split(";")[0] ?? null, headers: r.headers };
}

/**
 * Khoá THỬ chính thức của Cloudflare Turnstile (https://developers.cloudflare.com/turnstile/troubleshooting/testing/). run.mjs bật
 * Turnstile cho server e2e bằng cặp `siteKey` + `secret` (luôn đạt); token thử `dummyToken` chỉ được chấp nhận bởi các khoá thử.
 * Kiểm thật cần mạng (máy chủ gọi siteverify của Cloudflare) — e2e vốn đã cần mạng.
 */
export const TURNSTILE_TEST = {
  siteKey: "1x00000000000000000000AA",
  secret: "1x0000000000000000000000000000000AA", // luôn đạt
  alwaysFailSecret: "2x0000000000000000000000000000000AA", // luôn hỏng (invalid-input-response)
  alreadySpentSecret: "3x0000000000000000000000000000000AA", // luôn báo "token đã dùng" (timeout-or-duplicate)
  dummyToken: "XXXX.DUMMY.TOKEN.XXXX",
};

/** Đăng nhập kèm token thử để qua Turnstile (server e2e bật Turnstile); server không bật thì trường thừa này bị bỏ qua. */
export function login(phone, pin, ip) {
  return call(null, "POST", "/api/auth/login", { phone, pin, turnstileToken: TURNSTILE_TEST.dummyToken }, ip);
}

/** Đăng nhập tài khoản test, trả cookie phiên. */
export async function session(account) {
  const r = await login(account.phone, account.pin);
  if (r.status !== 200) throw new Error(`Không đăng nhập được ${account.phone}: ${r.status} ${JSON.stringify(r.body)}`);
  return r.cookie;
}

/**
 * Chạy SQL thẳng vào D1 local của server đang test (giả lập Sheet đổi dữ liệu, thử chốt chặn SQL). Lỗi SQL → reject kèm stderr.
 * Cố ý BẤT ĐỒNG BỘ: bản đồng bộ chặn event loop ~1–2 giây, server đóng kết nối keep-alive trong lúc đó mà fetch không hay
 * → request kế tiếp dùng lại socket đã đóng và gặp ECONNRESET (lỗi chập chờn đã gặp khi chạy e2e).
 */
export async function sql(q) {
  const args = ["wrangler", "d1", "execute", "tourdao-sales-db", "--local", "--command", q];
  if (PERSIST) args.push("--persist-to", PERSIST);
  try {
    return (await execFileAsync("npx", args, { encoding: "utf8" })).stdout;
  } catch (e) {
    throw new Error(`${e.stderr ?? ""}${e.stdout ?? ""}`);
  }
}

/** Như sql() nhưng trả các dòng kết quả của câu SELECT (wrangler --json). */
export async function sqlRows(q) {
  const args = ["wrangler", "d1", "execute", "tourdao-sales-db", "--local", "--json", "--command", q];
  if (PERSIST) args.push("--persist-to", PERSIST);
  try {
    const out = (await execFileAsync("npx", args, { encoding: "utf8" })).stdout;
    return JSON.parse(out)[0].results;
  } catch (e) {
    throw new Error(`${e.stderr ?? ""}${e.stdout ?? ""}`);
  }
}

export const randomPhone = () => "09" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0");

/** Ngày (YYYY-MM-DD) theo giờ Việt Nam, cách hôm nay `days` ngày — cùng quy ước với src/shared/vn-date.ts. */
export function vnDate(days = 0) {
  return new Date(Date.now() + 7 * 3600_000 + days * 86400_000).toISOString().slice(0, 10);
}

/**
 * Dịch vụ nhập tay (thân gửi API). TỪ 2026-09-26 máy chủ KHÔNG nhận dịch vụ nhập tay MỚI (chủ dự án: "loại bỏ hoàn toàn dịch vụ nhập tay" — DK-T3-01):
 * chỉ dùng để thử chính luật đó, hoặc gửi lại NGUYÊN dịch vụ nhập tay cũ (kèm `id`) của một đơn dựng bằng `makeLegacyManual`. Đơn thường dùng `catalogService`.
 */
export const manualService = (items, extra = {}) => ({ kind: "manual", name: "Dịch vụ thử", pax: { adult: 1 }, departDate: vnDate(7), items, ...extra });

/**
 * Danh mục GIẢ dùng chung (mã `ZE*`, "e2e") — thay dịch vụ nhập tay mặc định của các kịch bản. Tránh `ZT*` (trip.mjs xoá khi dọn), `ZZ*` (catalog.mjs),
 * `ZH*` (dispatch.mjs), `ZVA3`/`ZLD*` (kịch bản Chrome). ZE1 cùng tên/giá với dịch vụ nhập tay mặc định cũ ("Dịch vụ thử", 1 người lớn × 100.000₫) nên
 * mọi khẳng định về tên, số khách, tiền của đơn mặc định giữ nguyên.
 */
export const FAKE_CATALOG = {
  ZE1: { name: "Dịch vụ thử", prices: { adult: 100000, child: 50000 } },
  ZE2: { name: "Dịch vụ thử hai", prices: { adult: 50000 } },
};
const FAKE_AT = "'2026-01-01T00:00:00.000Z'";

/**
 * Chèn/bật lại danh mục giả `ZE*` trên D1 local tạm (UPSERT, `in_sheet = 1`). GỌI Ở ĐẦU MỖI KỊCH BẢN dùng `orderInput()`/`catalogService()`: lib.mjs
 * không được có tác dụng phụ lúc nạp (run.mjs nạp nó TRƯỚC khi có D1), và mỗi lần đồng bộ Sheet thật (catalog.mjs) đặt `in_sheet = 0` cho mọi mã không
 * có trên Sheet → kịch bản chạy SAU catalog.mjs phải tự bật lại. Thiếu bước này: POST /api/orders trả 400 `catalog_unavailable`.
 */
export async function ensureFakeCatalog() {
  const rows = Object.entries(FAKE_CATALOG).map(([code, it], i) => {
    const p = (k) => (it.prices[k] ?? "NULL");
    return `('${code}','${it.name}','perPax',${p("adult")},${p("child")},NULL,NULL,NULL,NULL,NULL,${90 + i},1,${FAKE_AT},${FAKE_AT})`;
  });
  await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES ${rows.join(",")}
    ON CONFLICT(code) DO UPDATE SET name = excluded.name, unit = excluded.unit, price_adult = excluded.price_adult, price_child = excluded.price_child, in_sheet = 1`);
}

/** Dịch vụ DANH MỤC giả ZE1 (theo người): mặc định 1 người lớn × 100.000₫, đủ ngày khởi hành để xác nhận được. `extra` ghi đè (vd `pax`, `unitPrices`, `catalogCode`). */
export const catalogService = (extra = {}) => ({ kind: "catalog", catalogCode: "ZE1", pax: { adult: 1 }, catalogPriceSeen: { ...FAKE_CATALOG.ZE1.prices }, departDate: vnDate(7), ...extra });

/**
 * Dựng dịch vụ NHẬP TAY "CŨ" bằng SQL trên D1 local tạm (API không nhận dịch vụ nhập tay mới từ 2026-09-26, nhưng đơn cũ vẫn có trong dữ liệu thật và
 * mọi đường đọc/tính tiền vẫn phải đúng với chúng). `serviceId` phải là dịch vụ danh mục MỘT dòng tiền của đơn `orderId` CÒN NHÁP (trigger 0008 khoá
 * dịch vụ của đơn đã xác nhận). Đổi dịch vụ + dòng của nó thành nhập tay rồi tính lại tiền đơn trong MỘT câu (trigger tiền 0007). Cọc phải ≤ tổng mới.
 */
export async function makeLegacyManual(orderId, serviceId, { name = "Dịch vụ nhập tay cũ", description = "Phí phát sinh", detail = null, quantity = 1, unitPrice = 100000 } = {}) {
  const q = (s) => (s === null ? "NULL" : `'${String(s).replaceAll("'", "''")}'`);
  await sql(`UPDATE order_service SET catalog_code = NULL, unit = 'manual', name = ${q(name)} WHERE id = '${serviceId}' AND order_id = '${orderId}'`);
  await sql(`UPDATE order_item SET catalog_code = NULL, pax_code = NULL, catalog_price = NULL, description = ${q(description)}, detail = ${q(detail)},
    quantity = ${quantity}, unit_price = ${unitPrice}, line_total = ${quantity * unitPrice} WHERE service_id = '${serviceId}' AND order_id = '${orderId}'`);
  const sum = `(SELECT SUM(line_total) FROM order_item WHERE order_id = '${orderId}')`;
  await sql(`UPDATE orders SET subtotal = ${sum}, total = ${sum} - discount, remaining_amount = ${sum} - discount - deposit_amount WHERE id = '${orderId}'`);
}

/** Đơn hợp lệ tối thiểu (một dịch vụ danh mục giả ZE1 — nhớ `await ensureFakeCatalog()`); `extra` ghi đè trường cấp đơn (vd `services`, `discount`). */
export const orderInput = (extra = {}) => ({
  customerName: "Nguyễn Văn A",
  customerPhone: "0901 234 567",
  services: [catalogService()],
  ...extra,
});

/** Đợi cho tới khi `dieuKien()` trả `true`, hoặc hết `ms` (mặc định 2000) thì trả `false` — không ném, để bên gọi tự `assert`. */
export async function cho(dieuKien, ms = 2000) {
  const hetHan = Date.now() + ms;
  for (;;) {
    if (dieuKien()) return true;
    if (Date.now() > hetHan) return false;
    await new Promise((r) => setTimeout(r, 20));
  }
}

/**
 * Đọc khung WebSocket (RFC 6455) tăng dần từ các gói TCP đã nhận (máy chủ gửi KHÔNG che — `masked` luôn false ở phía này, nhưng đọc cả cờ
 * `masked` để không đoán). Trả `feed(chunk)` — gọi lại mỗi khi có dữ liệu mới; tự gọi `onFrame({ opcode, payload })` cho MỖI khung đọc đủ
 * (giữ phần dữ liệu còn thiếu ở bộ đệm trong, một khung có thể tới rải trên nhiều gói TCP, hoặc nhiều khung gộp trong một gói).
 */
function docKhungWs(onFrame) {
  let buf = Buffer.alloc(0);
  return function feed(chunk) {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    for (;;) {
      if (buf.length < 2) return;
      const opcode = buf[0] & 0x0f;
      const masked = (buf[1] & 0x80) !== 0;
      let len = buf[1] & 0x7f;
      let offset = 2;
      if (len === 126) {
        if (buf.length < 4) return;
        len = buf.readUInt16BE(2);
        offset = 4;
      } else if (len === 127) {
        if (buf.length < 10) return;
        len = Number(buf.readBigUInt64BE(2)); // đủ cho tin Bảng tin (vài trăm byte) — không kỳ vọng khung khổng lồ
        offset = 10;
      }
      let maskKey = null;
      if (masked) {
        if (buf.length < offset + 4) return;
        maskKey = buf.subarray(offset, offset + 4);
        offset += 4;
      }
      if (buf.length < offset + len) return; // khung chưa tới đủ — đợi gói kế
      let payload = buf.subarray(offset, offset + len);
      if (masked) {
        const un = Buffer.alloc(len);
        for (let i = 0; i < len; i++) un[i] = payload[i] ^ maskKey[i % 4];
        payload = un;
      }
      buf = buf.subarray(offset + len);
      onFrame({ opcode, payload });
    }
  };
}

/** Dựng một khung CLIENT→máy chủ (LUÔN che theo RFC 6455) — `opcode` 0x1 (văn bản) hoặc 0x8 (đóng). Chỉ cho payload ngắn (< 65536 byte, đủ dùng ở đây). */
function dungKhungWs(opcode, payload) {
  const mask = randomBytes(4);
  const len = payload.length;
  const head = len < 126 ? Buffer.from([0x80 | opcode, 0x80 | len]) : (() => {
    const h = Buffer.alloc(4);
    h[0] = 0x80 | opcode;
    h[1] = 0x80 | 126;
    h.writeUInt16BE(len, 2);
    return h;
  })();
  const masked = Buffer.alloc(len);
  for (let i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i % 4];
  return Buffer.concat([head, mask, masked]);
}

/**
 * Mở một kết nối Bảng tin (GET /api/bang-tin, ADR-0022) — BẰNG `node:http` + sự kiện `upgrade` + bộ đọc/viết khung tối giản ở trên, KHÔNG
 * dùng `WebSocket` gốc của Node 22. Đã thử `WebSocket` gốc trước (thấy đúng `cookie`/`origin` gửi qua tuỳ chọn `headers`, bắt tay 101 báo
 * ĐÚNG) — nhưng đo bằng khung thô cho thấy máy chủ (`wrangler dev`/Miniflare cục bộ) phát khung ĐÓNG (mã 4003) chỉ ~20ms sau khi RPC
 * `dongCua` chạy (xác nhận bằng `console.log` tạm trong `tram.ts`, đã gỡ), còn sự kiện `close` của `WebSocket` gốc chỉ nổi lên sau
 * ~10 GIÂY (cả khi tự khép đúng khung đóng lại) — một hạn chế của tầng TCP cục bộ (Miniflare), không phải hành vi của mã máy chủ. Đọc
 * KHUNG THÔ (đủ để thấy khung đóng gần như ngay) tránh được độ trễ đó, nên `dong` dưới đây phản ánh đúng KN-2 ("đóng trong < 2 giây").
 * Chỉ dùng khi bắt tay được kỳ vọng THÀNH CÔNG (101) — bắt tay bị từ chối (401/403/426/503, không nâng cấp) dùng `batTay` bên dưới.
 */
export async function moBangTin(cookie, { origin = BASE, headers = {} } = {}) {
  const url = new URL(BASE);
  const req = httpRequest({
    hostname: url.hostname,
    port: url.port || (url.protocol === "https:" ? 443 : 80),
    path: "/api/bang-tin",
    headers: {
      connection: "Upgrade",
      upgrade: "websocket",
      "sec-websocket-version": "13",
      "sec-websocket-key": randomBytes(16).toString("base64"),
      cookie: cookie ?? "",
      origin,
      ...headers,
    },
  });
  req.end();
  const tin = [];
  /** MỌI khung văn bản (0x1) nhận được, dạng chuỗi thô — kể cả tin KHÔNG phải SuKienDon (ca 7, BT-3: "pong" tự động đáp cho "ping" là một khung
   * 0x1 bình thường trên đường truyền — chỉ không tới `webSocketMessage()` của trạm — nhưng `JSON.parse("pong")` ném lỗi nên không vào được
   * `tin`; kịch bản kiểm ping/pong đọc `raw` thay vì `tin`). Không dùng cho ca khác: mọi ca 1–6/8–10 chỉ cần `tin` (khung SuKienDon hợp lệ). */
  const raw = [];
  let hetHieuLuc;
  const dong = new Promise((resolve) => { hetHieuLuc = resolve; });
  const socket = await new Promise((resolve, reject) => {
    req.on("upgrade", (res, sock) => (res.statusCode === 101 ? resolve(sock) : reject(new Error(`Bắt tay Bảng tin: mã ${res.statusCode} (mong đợi 101).`))));
    req.on("response", (res) => reject(new Error(`Bắt tay Bảng tin bị từ chối: ${res.statusCode}.`)));
    req.on("error", (e) => reject(e));
  });
  socket.on("data", docKhungWs(({ opcode, payload }) => {
    if (opcode === 0x1) {
      // văn bản: SuKienDon hợp lệ → `tin`; MỌI khung văn bản (kể cả "pong" tự động, BT-3) → `raw`.
      const text = payload.toString("utf8");
      raw.push(text);
      try {
        tin.push(JSON.parse(text));
      } catch {
        // rác hoặc "pong" — trình duyệt thật cũng bỏ qua ở tầng ứng dụng, không đẩy vào `tin`
      }
    } else if (opcode === 0x8) {
      const code = payload.length >= 2 ? payload.readUInt16BE(0) : 1005;
      const reason = payload.length > 2 ? payload.subarray(2).toString("utf8") : "";
      hetHieuLuc({ code, reason });
      try {
        socket.end(); // khép hai chiều cho gọn — không cần đợi máy chủ hoàn tất TCP mới coi là "đã đóng" (xem chú thích trên)
      } catch {
        // đã đóng
      }
    }
  }));
  socket.on("error", () => {}); // ECONNRESET sau khi tự end() ở trên là bình thường, không phải lỗi kịch bản
  return {
    tin,
    raw,
    dong,
    gui: (text) => socket.write(dungKhungWs(0x1, Buffer.from(text, "utf8"))),
    dongLai: () => {
      try {
        socket.write(dungKhungWs(0x8, Buffer.alloc(0)));
        socket.end();
      } catch {
        // đã đóng
      }
    },
    /** Đợi tới khi `dieuKien(tin)` đúng hoặc hết `ms`. */
    cho: (dieuKien, ms = 2000) => cho(() => dieuKien(tin), ms),
  };
}

/**
 * Bắt tay Bảng tin bị TỪ CHỐI (không nâng cấp lên WebSocket) — trả mã HTTP (401/403/426/503). Dùng `node:http` thẳng (KHÔNG `fetch`):
 * `fetch`/undici cấm gửi header `Upgrade` (coi là "forbidden header", ném `InvalidArgumentError: invalid upgrade header`) — cần header
 * đó để thử ca có `Upgrade: websocket` nhưng vẫn bị chặn TRƯỚC khi nâng cấp (vd 503 lúc bảo trì). Máy chủ trả lỗi trước khi mở khung
 * WebSocket nên chỉ cần đọc `response`, không cần đọc `upgrade` (bắt tay THÀNH CÔNG dùng `moBangTin` ở trên, không dùng hàm này).
 */
export function batTay(cookie, headers = {}) {
  const url = new URL(BASE);
  return new Promise((resolve, reject) => {
    const req = httpRequest({ hostname: url.hostname, port: url.port || 80, path: "/api/bang-tin", headers: { cookie: cookie ?? "", ...headers } });
    req.on("response", (res) => {
      res.resume(); // xả thân phản hồi để socket được tái dùng/đóng gọn gàng, không cần đọc nội dung
      resolve(res.statusCode);
    });
    req.on("upgrade", (res) => {
      res.resume();
      resolve(res.statusCode); // không mong đợi (hàm này chỉ dùng cho ca bị từ chối) — vẫn trả mã cho bên gọi tự assert
    });
    req.on("error", reject);
    req.end();
  });
}
