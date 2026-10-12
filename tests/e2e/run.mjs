// Chạy toàn bộ e2e trên D1 local TẠM (không đụng .wrangler/state của máy) với wrangler dev riêng — mỗi NHÓM một D1 + một wrangler dev (xem "Chạy song song theo NHÓM" dưới).
// Dùng: npm run test:e2e                 — mọi kịch bản
//       npm run test:e2e -- orders catalog — chỉ các kịch bản chỉ định
// Cần mạng: admin.mjs và catalog.mjs đọc Google Sheet thật (quyết định của chủ dự án 2026-09-19).
import { execFile, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { availableParallelism, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { insertStaffSql } from "../../scripts/staff-lib.mjs";
import { ACCOUNTS, TRO_LY_DAU, TRO_LY_KHOA, TURNSTILE_TEST } from "./lib.mjs";
import { GHI_NHIEU_LAN } from "../../src/shared/lan-gui-no.ts";

const execFileAsync = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
// "feedback" đứng TRƯỚC "maintenance": cổng bảo trì của router chặn mọi route cần đăng nhập, nên kịch bản Góp ý không được chạy khi chế độ bảo trì còn đang bật dở.
// "bangtin" (ADR-0022) đứng SAU "company", TRƯỚC "maintenance": tự bật/tắt bảo trì ở ca 10 và khôi phục ở `finally`, không đụng salesB/field mà "passkey" đổi.
// "thongbao" (ADR-0034) đứng SAU "bangtin", TRƯỚC "maintenance": chỉ đọc hộp thông báo (không tự bật/tắt bảo trì); cổng bảo trì của router
// chặn mọi route cần đăng nhập nên phải chạy trước khi "maintenance" bật dở.
// "roles" (ADR-0018) đứng TRƯỚC "passkey": đổi vai của tài khoản superAdmin (quyền giữ nguyên) và tạo tài khoản mới — không đụng salesB/field của passkey.
// "van-chuyen" (ADR-0040) đứng SAU "roles", TRƯỚC "passkey": tạo tài khoản tài xế + hồ sơ + xe dùng một lần (SĐT ngẫu nhiên, biển số theo Date.now()), đổi ngưỡng
// "sắp hết hạn" rồi khôi phục 30 ở `finally`; không đụng salesB/field của passkey.
// "tai-xe-doi-tac" (ADR-0048) đứng SAU "van-chuyen", TRƯỚC "passkey": tạo tài khoản / hồ sơ / nhà xe / xe dùng một lần (SĐT ngẫu nhiên, biển số theo Date.now()),
// gửi hai tin thông báo KHÔNG quan trọng rồi thu hồi ở `finally`; chèn SQL thử trigger chỉ vào tài khoản của chính kịch bản (SQL vào salesA luôn bị chặn — không đổi gì).
// "chinh-sach-dieu-phoi" (ADR-0049 lát 1.1) đứng SAU "tai-xe-doi-tac", TRƯỚC "passkey": đổi chính sách điều phối / hạng bằng / điều kiện xuất bến (bảng CHỈ THÊM)
// rồi ở `finally` THÊM dòng khôi phục giá trị gieo và đóng điều kiện đã thêm; không đụng salesB/field của passkey.
// "dieu-phoi", "tai-xe-cuoc" (ADR-0049 Task A13 / A15) đứng SAU "chinh-sach-dieu-phoi" (chính sách, điều kiện gieo đã khôi phục), TRƯỚC "passkey": tạo tài khoản
// tài xế / xe / đơn / chuyến dùng một lần (SĐT ngẫu nhiên, biển số theo Date.now()), chuyến chạy NGÀY MAI (cửa sổ xuất bến 48 giờ — ADR-0096); không đụng salesB/field của passkey.
// "tu-choi-bao-ban" (ADR-0053 D7–D9, A4) đứng SAU "tin-chuyen", TRƯỚC "xe-tren-don": tài khoản / nhà xe / xe / chuyến dùng một lần (SĐT ngẫu nhiên, biển số theo Date.now(), chuyến D+2…D+4 và một chuyến +1 giờ cho ca quá hạn); không đổi chính sách, không đụng salesB/field.
// "khung-ban-xe" (ADR-0055 VK2-A, Vận chuyển Đợt 3) ngay sau "dieu-phoi", cùng khuôn: tài xế / xe / chuyến dùng một lần (D+3…D+5); rút mọi khung bận của xe thử
// ở `finally`; chuyến của tài xế thử nằm trên xe thử nên không chạm kịch bản khác.
// "cam-ket-xe" (ADR-0056 VK3-A, Vận chuyển Đợt 7) ngay sau "khung-ban-xe", cùng khuôn: Đối tác / tài xế / xe / đơn / chuyến dùng một lần, chuyến NGÀY MAI; không đụng salesB/field.
// "dieu-chinh-khan-cap" (ADR-0104 Đ1) ngay sau "cam-ket-xe", cùng khuôn: tài xế / hai xe / chuyến dùng một lần (không đơn) — một chuyến sau 2 giờ (dưới mốc), hai chuyến
// sau 2 ngày; không đụng chính sách, salesB/field.
// "dong-bo-chuyen" (ADR-0104 Đ2) ngay sau "dieu-chinh-khan-cap", cùng khuôn: tài xế / xe / hai đơn / chuyến dùng một lần, chuyến NGÀY MAI; dùng field làm HDV phụ
// trách (chỉ sửa số khách đơn của chính kịch bản — không đổi PIN / quyền).
// "dua-don-dau-cuoi" (kế hoạch giao diện Đưa đón 2026-10-01, tiêu chí 5) ngay sau "dieu-phoi", cùng khuôn: tài xế / xe / đơn / chuyến dùng một lần, chuyến NGÀY MAI.
// "xe-tren-don" (ADR-0059) ngay sau "tai-xe-cuoc", cùng khuôn: tài xế / xe / đơn / chuyến / tài khoản lai dùng một lần, chuyến NGÀY MAI; không đụng salesB/field.
// "xe-dang-chay" (ADR-0052 D5 — Vận chuyển Đợt 5) ngay sau "xe-tren-don", cùng khuôn: tài xế / xe / đơn / chuyến dùng một lần, chuyến NGÀY MAI (xuất bến sớm);
// dọn bằng kết thúc gián đoạn; không đụng salesB/field.
// "chuyen-khach" (gói A5 — ADR-0111) ngay sau "xe-dang-chay", cùng khuôn: tài xế / xe / đơn / chuyến dùng một lần, chuyến NGÀY MAI (xuất bến sớm). Đổi chính sách
// điều phối (chờ 1 phút, tắt tự đồng ý) rồi KHÔI PHỤC (10 phút, bật) ở `finally`; có một lần chờ thật ~1 phút (hết hạn đề nghị); không đụng salesB/field.
// "dieu-phoi-chay-dua" (TC-33, Task A14) sau đó: 10 yêu cầu xếp song song vào chuyến 3 chỗ trên dữ liệu dùng một lần (chạy riêng: npm run test:e2e -- dieu-phoi-chay-dua).
// "coc-don-huy" (ADR-0089, năm lỗi tiền Đợt 1) đứng ngay sau "so-tien", TRƯỚC "passkey": dùng salesA/admin/kế toán/superAdmin/field, tự cài/gỡ trigger thử.
// "so-tien" (sổ tiền lượt 1 — ADR-0024/0025/0026) đứng TRƯỚC "passkey": dùng field/fieldB/salesA/kế toán; tự cài/gỡ trigger thử trên D1 tạm
// (ca R1, F6) — gỡ ở `finally`.
// "giao-dien" (ADR-0087) đứng SAU "tro-ly", TRƯỚC "maintenance": tự bật/tắt bảo trì ở ca 7 và khôi phục ở `finally`; cổng bảo trì chặn mọi route cần đăng nhập nên không được chạy khi bảo trì còn bật dở.
// "tro-ly" (ADR-0066) đứng SAU "thongbao", TRƯỚC "maintenance" (cổng bảo trì chặn mọi route cần đăng nhập): dựng máy OpenAI GIẢ trên cổng E2E_OPENAI_PORT
// (máy chủ trỏ vào nó bằng --var OPENAI_BASE_URL dưới đây); đổi cài đặt trợ lý rồi KHÔI PHỤC (bật, 5 USD, 30 câu) ở `finally`; tạo tài khoản dùng một lần.
// "chinh-sach-phien" (ADR-0085) đứng TRƯỚC "phien": đổi chính sách toàn hệ thống rồi KHÔI PHỤC ở finally; tài khoản thử dùng một lần + 1000 tài khoản Đối tác giả (hồ sơ đầy đủ).
// "phien" (ADR-0075 Task 4) đứng TRƯỚC "passkey": đăng nhập lại salesA nhiều lần (luật một máy đá cookie cũ) rồi `sessionMoi` để lại phiên sống; không đổi PIN/quyền của ai.
// "mau-chang" (nợ nhỏ đưa đón 2026-10-01) ngay sau "catalog", TRƯỚC "maintenance": mã dịch vụ riêng ZMC1 + một điểm đã ngưng dùng một lần; bảng mẫu chỉ-thêm.
// "passkey" đứng CUỐI CÙNG: đổi PIN của salesB, tạm ngưng rồi kích hoạt lại field — mọi kịch bản CÙNG NHÓM dùng chung một D1 tạm (passkey luôn cuối nhóm của nó).
const ALL = ["platform", "pwa", "orders", "trip", "chang-hanh-khach", "nhap-tay-va-gia-doi-tac", "admin", "turnstile", "catalog", "mau-chang", "dispatch", "admin-race", "locations", "parties", "gop-ho-so", "booker", "permissions", "feedback", "company", "bangtin", "thongbao", "tro-ly", "giao-dien", "maintenance", "roles", "quyen-tien", "van-chuyen", "tai-xe-doi-tac", "chinh-sach-dieu-phoi", "dieu-phoi", "khung-ban-xe", "cam-ket-xe", "dieu-chinh-khan-cap", "dong-bo-chuyen", "tien-xe-thue", "dua-don-dau-cuoi", "tai-xe-cuoc", "tin-chuyen", "tu-choi-bao-ban", "xe-tren-don", "xe-dang-chay", "chuyen-khach", "dieu-phoi-chay-dua", "so-tien", "coc-don-huy", "chong-ghi-trung", "nhap-ke-toan", "chinh-sach-phien", "phien", "sua-so-khach", "passkey"];
const picked = process.argv.slice(2);
const scripts = picked.length ? picked : ALL;
for (const s of scripts) if (!ALL.includes(s)) throw new Error(`Không có kịch bản "${s}" (có: ${ALL.join(", ")})`);

// ── Chạy song song theo NHÓM (chủ dự án chọn 30/9, phương án A: "nhanh gần gấp đôi, không bỏ bớt bài kiểm nào") ──
// Mỗi nhóm có D1 tạm + `wrangler dev` + cổng + máy OpenAI giả RIÊNG — không chia sẻ trạng thái nào giữa các nhóm (chế độ bảo trì, tài khoản dùng chung,
// chính sách điều phối, công ty chủ… của nhóm này không bao giờ lọt sang nhóm kia). Trong MỘT nhóm, kịch bản chạy LẦN LƯỢT theo đúng thứ tự của `ALL`
// ở trên: mỗi nhóm là một DÃY CON của `ALL`, nên mọi ràng buộc thứ tự đã ghi (feedback trước maintenance, passkey cuối…) vẫn đúng trong từng nhóm —
// bỏ bớt kịch bản đứng trước chỉ làm D1 "sạch hơn", giống chạy lẻ `npm run test:e2e -- <tên>` (vốn phải chạy được trên D1 mới).
// `E2E_SONG_SONG=<số nhóm>`; `E2E_SONG_SONG=1` = chạy tuần tự như cũ trên MỘT máy chủ (đầu ra kịch bản in thẳng, để dò lỗi). Mặc định theo số CPU.
const cpu = availableParallelism();
const MAC_DINH = Math.max(1, Math.min(3, Math.floor(cpu / 3)));
const songSong = process.env.E2E_SONG_SONG ?? String(MAC_DINH);
if (!/^[1-9]\d*$/.test(songSong)) throw new Error(`E2E_SONG_SONG phải là số nguyên ≥ 1 (đang là "${songSong}")`);
const soNhom = Math.min(Number(songSong), scripts.length);

// Thời gian đo 30/9 (giây, lượt tuần tự cũ, đủ bộ) — chỉ để CHIA NHÓM cho cân, không phải cổng. Kịch bản mới chưa có số: 15.
// Sai số ở đây chỉ làm nhóm lệch nhau (chậm hơn), không làm bỏ sót kịch bản nào. Thêm kịch bản mới vào `ALL` thì thêm số đo vào đây.
const THOI_GIAN = {
  platform: 1.4, pwa: 0.3, orders: 13.1, trip: 27.7, "chang-hanh-khach": 22.4, "nhap-tay-va-gia-doi-tac": 15.2, admin: 10.4, turnstile: 5.8,
  catalog: 28.6, "mau-chang": 6.4, dispatch: 165.8, "admin-race": 0.5, locations: 0.5, parties: 1, "gop-ho-so": 8, booker: 20.2, permissions: 5.2, feedback: 1.3, company: 28.8,
  bangtin: 59.1, thongbao: 67.1, "tro-ly": 8.9, "giao-dien": 4, maintenance: 32.8, roles: 5.8, "quyen-tien": 3, "van-chuyen": 14.4, "tai-xe-doi-tac": 27.9, "chinh-sach-dieu-phoi": 19.3,
  "dieu-phoi": 53.1, "khung-ban-xe": 15, "cam-ket-xe": 15, "dieu-chinh-khan-cap": 8, "dong-bo-chuyen": 15, "tien-xe-thue": 20, "dua-don-dau-cuoi": 20, "tai-xe-cuoc": 32, "tin-chuyen": 15, "tu-choi-bao-ban": 20, "xe-dang-chay": 15, "chuyen-khach": 90, "dieu-phoi-chay-dua": 8.2, "so-tien": 24.7, "coc-don-huy": 20, "chong-ghi-trung": 20, "chinh-sach-phien": 30, phien: 19.4, "sua-so-khach": 15, passkey: 24.2,
};
const nang = (name) => THOI_GIAN[name] ?? 15;

/** Chia kịch bản vào `n` nhóm: nặng trước, vào nhóm đang nhẹ nhất (LPT); rồi trả mỗi nhóm về đúng thứ tự của `ALL`. Tất định (không ngẫu nhiên). */
function chiaNhom(list, n) {
  const nhom = Array.from({ length: n }, () => ({ tong: 0, ten: [] }));
  const theoNang = [...list].sort((a, b) => nang(b) - nang(a) || ALL.indexOf(a) - ALL.indexOf(b));
  for (const name of theoNang) {
    const nhe = nhom.reduce((m, g) => (g.tong < m.tong ? g : m));
    nhe.tong += nang(name);
    nhe.ten.push(name);
  }
  return nhom.map((g) => g.ten.sort((a, b) => ALL.indexOf(a) - ALL.indexOf(b)));
}
const nhomList = chiaNhom(scripts, soNhom);
const nhan = (k) => (soNhom > 1 ? ` · nhóm ${k + 1}` : "");

const freePort = () =>
  new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });

const wranglerEnv = { ...process.env, CI: "1" };
const wrangler = (args) => execFileAsync("npx", ["wrangler", ...args], { cwd: ROOT, encoding: "utf8", env: wranglerEnv, maxBuffer: 64 * 1024 * 1024 });

/** Chạy một tiến trình con. `stream` = in thẳng (chế độ một nhóm, như cũ); ngược lại gom đầu ra (stdout + stderr) để in LIỀN MỘT KHỐI khi xong. */
function chay(cmd, args, { env, stream }) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: ROOT, env, stdio: stream ? "inherit" : ["ignore", "pipe", "pipe"] });
    let out = "";
    if (!stream) {
      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (out += d));
    }
    child.on("error", (e) => resolve({ ok: false, out: out + String(e) }));
    child.on("close", (code) => resolve({ ok: code === 0, out }));
  });
}

// Dựng D1 tạm cho một nhóm: áp migration + nạp tài khoản test. Các nhóm dựng ĐỒNG THỜI (thư mục riêng, không khoá nhau).
async function dungD1(may) {
  may.persist = mkdtempSync(join(tmpdir(), "tourdao-e2e-"));
  await wrangler(["d1", "migrations", "apply", "tourdao-sales-db", "--local", "--persist-to", may.persist]);
  const seed = join(may.persist, "seed.sql");
  writeFileSync(seed, (await Promise.all(Object.values(ACCOUNTS).map((a) => insertStaffSql({ name: a.name, phone: a.phone, pin: a.pin, permissions: a.permissions })))).join("\n"));
  await wrangler(["d1", "execute", "tourdao-sales-db", "--local", "--persist-to", may.persist, "--file", seed]);
  console.log(`D1 tạm${nhan(may.k)}: ${may.persist}`);
}

// Bật `wrangler dev` cho một nhóm và chờ sẵn sàng. Các máy chủ bật LẦN LƯỢT (máy sau chỉ bật khi máy trước đã sẵn sàng) và TRƯỚC khi kịch bản nào chạy:
// mỗi lần bật, wrangler tự chạy `npm run build:web` ghi đè public/js + public/sw.js — hai lần build chồng nhau, hay một lần build giữa lúc `pwa.mjs` đang
// đọc sw.js, là đua ghi tệp.
async function batMayChu(may) {
  const [port, inspector, openaiPort] = [await freePort(), await freePort(), await freePort()];
  const base = `http://127.0.0.1:${port}`;
  const secret = randomBytes(48).toString("base64url"); // phiên chỉ sống trong lần chạy này
  const server = spawn(
    "npx",
    [
      "wrangler", "dev", "--port", String(port), "--ip", "127.0.0.1", "--inspector-port", String(inspector), "--persist-to", may.persist, "--test-scheduled",
      "--var", `SESSION_SECRET:${secret}`,
      // Lớp chống ghi trùng (ADR-0094 đ4): khoá HMAC giả riêng cho lần chạy — thiếu thì mọi API trả 500.
      "--var", `LAN_GUI_SECRET:${randomBytes(48).toString("base64url")}`,
      // Bật Turnstile bằng khoá THỬ của Cloudflare (luôn đạt) — lib.mjs login() gửi token thử; đặt tường minh để không phụ thuộc .dev.vars của máy.
      "--var", `TURNSTILE_SITE_KEY:${TURNSTILE_TEST.siteKey}`,
      "--var", `TURNSTILE_SECRET_KEY:${TURNSTILE_TEST.secret}`,
      // Bật Face ID (passkey, ADR-0016) cho server e2e — riêng cho lần chạy này, không lệ thuộc `vars` production của wrangler.jsonc.
      "--var", "PASSKEY_RP_ID:127.0.0.1",
      "--var", `PASSKEY_ORIGIN:${base}`,
      // Bảng tin (ADR-0022, KN-1): rút ngắn hạn sống kết nối cho e2e (mặc định production 900 giây) — đủ dài cho mỗi ca (kết nối mới mỗi ca)
      // mà ca "hạn sống" (Task 7 ca 8) chỉ cần chờ ~23 giây; đừng nới mốc "< 2 giây" (KN-2) nếu tăng số này.
      "--var", "BANG_TIN_HAN_GIAY:20",
      // Web Push (ADR-0036): ép khoá VAPID RỖNG — e2e không phụ thuộc .dev.vars của máy và KHÔNG BAO GIỜ gõ cửa dịch vụ đẩy thật bằng địa chỉ giả.
      "--var", "VAPID_PUBLIC_KEY:",
      "--var", "VAPID_PRIVATE_KEY:",
      // Trợ lý Hỗ trợ (ADR-0066): khoá GIẢ + địa chỉ máy OpenAI GIẢ do tests/e2e/tro-ly.mjs dựng — e2e KHÔNG BAO GIỜ gọi OpenAI thật, không lệ thuộc .dev.vars.
      "--var", `OPENAI_API_KEY:${TRO_LY_KHOA}`,
      "--var", `OPENAI_BASE_URL:http://127.0.0.1:${openaiPort}`,
    ],
    { cwd: ROOT, detached: true, stdio: ["ignore", "pipe", "pipe"], env: wranglerEnv },
  );
  Object.assign(may, { server, base, openaiPort, log: "" });
  server.stdout.on("data", (d) => (may.log += d));
  server.stderr.on("data", (d) => (may.log += d));

  // Sẵn sàng khi /api/auth/me trả 401 (chưa đăng nhập).
  const deadline = Date.now() + 90_000;
  for (;;) {
    const r = await fetch(`${base}/api/auth/me`).catch(() => null);
    if (r?.status === 401) break;
    if (Date.now() > deadline || server.exitCode !== null) throw new Error(`wrangler dev${nhan(may.k)} không lên được:\n${may.log.slice(-3000)}`);
    await new Promise((res) => setTimeout(res, 500));
  }
  console.log(`wrangler dev${nhan(may.k)}: ${base}`);
}

// Chạy các kịch bản của MỘT nhóm, lần lượt, rồi các bước kiểm cuối trên chính máy chủ / D1 của nhóm đó.
async function chayNhom(may) {
  const { k } = may;
  const stream = soNhom === 1;
  const env = { ...process.env, E2E_BASE_URL: may.base, E2E_PERSIST_TO: may.persist, E2E_OPENAI_PORT: String(may.openaiPort) };
  // Đợt D Task 6 (F-4b): MỘT kịch bản đỏ không được che khuất các kịch bản PHÍA SAU nó — ghi từng bộ vào `ketQua` để in đủ tên trước khi thoát.
  for (const name of may.ten) {
    const started = Date.now();
    console.log(`▶ ${name}${nhan(k)}`);
    const r = await chay("node", [join(HERE, `${name}.mjs`)], { env, stream });
    const giay = ((Date.now() - started) / 1000).toFixed(1);
    // Chế độ nhiều nhóm: in đầu ra của kịch bản LIỀN MỘT KHỐI (không xen với nhóm khác), rồi dòng "✔/✘ <tên>" mà scripts/release-lib.mjs đọc.
    if (!stream && r.out) process.stdout.write(`── đầu ra ${name}${nhan(k)} ──\n${r.out}${r.out.endsWith("\n") ? "" : "\n"}`);
    console.log(`${r.ok ? "✔" : "✘"} ${name} (${giay}s)${nhan(k)}\n`);
    may.ketQua.push({ name, ok: r.ok });
    // Phòng một kịch bản hạ luôn `wrangler dev` của nhóm: MỌI kịch bản còn lại của nhóm chắc chắn đỏ vì không kết nối được — dừng nhóm đó và ghi rõ
    // "chưa chạy", đừng để chúng biến thành N dòng "✘" trông như N lỗi độc lập. Các nhóm khác (máy chủ riêng) vẫn chạy tiếp.
    if (may.server.exitCode !== null) {
      console.log(`⚠ wrangler dev${nhan(k)} đã thoát (mã ${may.server.exitCode}) — dừng nhóm này, không chạy tiếp các kịch bản còn lại của nhóm.\n`);
      for (const skipped of may.ten.slice(may.ten.indexOf(name) + 1)) may.ketQua.push({ name: skipped, ok: null });
      may.chet = true;
      return;
    }
  }
  // Sau mọi kịch bản: bất biến dữ liệu N1 phải còn nguyên trên D1 tạm CỦA NHÓM (chỉ khi chạy đủ bộ — chạy lẻ có thể để dữ liệu dở).
  if (!picked.length) {
    console.log(`▶ audit-invariants${nhan(k)}`);
    const r = await chay("node", [join(ROOT, "scripts", "audit-invariants.mjs"), "--db", "local", "--persist-to", may.persist, "--strict"], { env: process.env, stream });
    if (!stream) process.stdout.write(`── đầu ra audit-invariants${nhan(k)} ──\n${r.out}`);
    console.log(`${r.ok ? "✔" : "✘"} audit-invariants${nhan(k)}\n`);
    may.audit = r.ok;
  }
  // Trợ lý Hỗ trợ (ADR-0066 điều 7): nội dung câu hỏi (mang dấu TRO_LY_DAU của tro-ly.mjs) KHÔNG BAO GIỜ được xuất hiện trong log máy chủ.
  // Đo 30/9: `wrangler dev` (CI=1) KHÔNG in console của Worker ra stdout — soi `log` không bao giờ đỏ (đột biến console.log(câu hỏi) vẫn xanh). Console của
  // Worker nằm ở bảng `logs` của Local Explorer (`/cdn-cgi/local/explorer/api/local/observability/query`, chỉ đọc) — hỏi ở đó; bảng rỗng / không hỏi được = ĐỎ
  // (không để bài kiểm rỗng thành "sạch"). Chỉ trên máy chủ của nhóm có chạy kịch bản tro-ly.
  // LỚP CHỐNG GHI TRÙNG (ADR-0094, kế hoạch L10, L12) — đọc log Worker ở Local Explorer (cùng nguồn với bài trợ lý dưới):
  //  - H5: lệnh ghi > 1 lần (`lan_gui_ghi_nhieu_lan`) chỉ được ở route có tên trong danh sách nợ GHI_NHIEU_LAN (src/shared/lan-gui-no.ts);
  //  - `lan_gui_loi_la` (lỗi chạm bảng vé mà không khớp mẫu "đụng vé") phải = 0; `lan_gui_dung_ve` đếm để thấy mẫu chữ lỗi D1 khớp thật (N2);
  //  - `thieu_ma_lan_gui` (lệnh không vé — giai đoạn 1 cho qua) đếm theo route để rà trước bản siết.
  try {
    const hoi = async (sqlText) => {
      const r = await fetch(`${may.base}/cdn-cgi/local/explorer/api/local/observability/query`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sql: sqlText }) });
      return (await r.json()).result.rows;
    };
    const duongCua = (rows) => rows.map((r) => /duong\\*"\s*:\s*\\*"([^"\\]+)/.exec(String(r[0]))?.[1] ?? "?");
    may.ghiNhieuLan = new Set(duongCua(await hoi("SELECT message FROM logs WHERE message LIKE '%lan_gui_ghi_nhieu_lan%'")));
    const thieu = duongCua(await hoi("SELECT message FROM logs WHERE message LIKE '%thieu_ma_lan_gui%'"));
    may.loiLa = (await hoi("SELECT count(*) FROM logs WHERE message LIKE '%lan_gui_loi_la%'"))[0][0];
    const dungVe = (await hoi("SELECT count(*) FROM logs WHERE message LIKE '%lan_gui_dung_ve%'"))[0][0];
    const demThieu = [...thieu.reduce((m, d) => m.set(d, (m.get(d) ?? 0) + 1), new Map())].sort((a, b) => b[1] - a[1]);
    console.log(`ℹ lớp vé${nhan(k)}: ghi nhiều lần ở ${may.ghiNhieuLan.size} route [${[...may.ghiNhieuLan].join("; ")}]; đụng vé ${dungVe} lần; lỗi lạ ${may.loiLa}; thiếu vé ${thieu.length} lần${demThieu.length ? ` (${demThieu.map(([d, n]) => `${d} ×${n}`).join("; ")})` : ""}`);
  } catch (e) {
    may.ghiNhieuLan = null;
    console.log(`⚠ không đọc được log Worker cho lớp vé${nhan(k)}: ${e}`);
  }
  if (may.ten.includes("tro-ly")) {
    const hoiLog = async (sqlText) => {
      const r = await fetch(`${may.base}/cdn-cgi/local/explorer/api/local/observability/query`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sql: sqlText }) });
      return (await r.json()).result.rows[0][0];
    };
    may.troLy = false;
    try {
      const tong = await hoiLog("SELECT count(*) FROM logs");
      const lo = await hoiLog(`SELECT count(*) FROM logs WHERE message LIKE '%${TRO_LY_DAU}%'`);
      may.troLy = tong > 0 && lo === 0 && !may.log.includes(TRO_LY_DAU);
      if (!may.troLy) console.log(`⚠ log Worker${nhan(k)}: ${tong} dòng, ${lo} dòng chứa nội dung câu hỏi trợ lý`);
    } catch (e) {
      console.log(`⚠ không đọc được log Worker${nhan(k)} (Local Explorer): ${e}`);
    }
  }
}

/** Gộp một bước kiểm chạy trên nhiều máy chủ thành MỘT dòng tóm tắt: xanh khi mọi nhóm có chạy đều xanh; tên giữ nguyên ở đầu, nêu nhóm đỏ phía sau. */
function gop(name, cacMay, lay) {
  const co = cacMay.filter((m) => lay(m) !== undefined);
  if (!co.length) return null;
  const hong = co.filter((m) => lay(m) !== true).map((m) => m.k + 1);
  return { name: soNhom > 1 && hong.length ? `${name} (đỏ ở nhóm ${hong.join(", ")})` : name, ok: hong.length === 0 };
}

const cacMay = nhomList.map((ten, k) => ({ k, ten, ketQua: [] }));
let failed = 0;
let total = scripts.length;
const batDau = Date.now();
// Ctrl-C / SIGTERM (kiểm độc lập I-1, 2026-10-01): `finally` KHÔNG chạy khi Node bị tín hiệu giết, còn máy chủ `detached` sống tiếp (mồ côi, ppid 1) → dọn
// ĐỒNG BỘ ngay tại đây: giết nhóm tiến trình của mọi máy chủ + xoá mọi D1 tạm, rồi thoát 130 / 143.
function donKhiBiNgat(tin, ma) {
  process.on(tin, () => {
    console.log(`\n${tin}: dừng e2e — tắt ${cacMay.filter((m) => m.server?.pid).length} máy chủ, xoá D1 tạm.`);
    for (const m of cacMay) {
      try {
        if (m.server?.pid) process.kill(-m.server.pid, "SIGKILL");
      } catch {
        /* đã tắt */
      }
      try {
        if (m.persist) rmSync(m.persist, { recursive: true, force: true });
      } catch {
        /* bỏ qua */
      }
    }
    process.exit(ma);
  });
}
donKhiBiNgat("SIGINT", 130);
donKhiBiNgat("SIGTERM", 143);
try {
  if (soNhom > 1) console.log(`Chạy song song ${soNhom} nhóm, mỗi nhóm một D1 tạm + wrangler dev riêng (E2E_SONG_SONG=1: tuần tự như cũ):\n${cacMay.map((m) => `  nhóm ${m.k + 1}: ${m.ten.join(", ")}`).join("\n")}\n`);
  const dung = await Promise.allSettled(cacMay.map((m) => dungD1(m)));
  const loiD1 = dung.find((p) => p.status === "rejected");
  if (loiD1) throw loiD1.reason;
  for (const m of cacMay) await batMayChu(m);
  console.log("");

  await Promise.all(cacMay.map((m) => chayNhom(m)));

  const theoTen = new Map(cacMay.flatMap((m) => m.ketQua).map((x) => [x.name, x]));
  const results = scripts.map((name) => theoTen.get(name));
  // Nhóm có máy chủ đã thoát không chạy được audit — kịch bản "chưa chạy" của nhóm đó đã tính là đỏ ở trên.
  const audit = gop("audit-invariants", cacMay.filter((m) => !m.chet), (m) => m.audit);
  if (audit) results.push(audit);
  // Web Push (ADR-0036): khoá VAPID bị ép rỗng → không lượt gửi nào được chạy, nên log máy chủ (MỌI nhóm) KHÔNG được có dòng `day_loi` (gửi hỏng/lỗi lô).
  results.push(gop("không có day_loi (thiếu khoá VAPID thì không gửi)", cacMay, (m) => !m.log.includes('"event":"day_loi"')));
  // ADR-0094 H5: route ghi nhiều lần ngoài danh sách nợ có tên ⇒ ĐỎ (nêu tên route). Không đọc được log ⇒ ĐỎ (không để bài rỗng thành "sạch").
  const ngoaiNo = (m) => (m.ghiNhieuLan ? [...m.ghiNhieuLan].filter((d) => !GHI_NHIEU_LAN.some((x) => x.duong === d)) : ["(không đọc được log)"]);
  for (const m of cacMay) if (m.ghiNhieuLan !== undefined && ngoaiNo(m).length) console.log(`✘ H5${nhan(m.k)}: route ghi > 1 lần mỗi lệnh mà không có tên trong GHI_NHIEU_LAN: ${ngoaiNo(m).join("; ")}`);
  results.push(gop("H5: ghi nhiều lần chỉ ở route có tên trong danh sách nợ (src/shared/lan-gui-no.ts)", cacMay, (m) => (m.ghiNhieuLan === undefined ? undefined : ngoaiNo(m).length === 0)));
  results.push(gop("không có lỗi lạ chạm bảng vé (lan_gui_loi_la)", cacMay, (m) => (m.loiLa === undefined ? undefined : m.loiLa === 0)));
  const troLy = gop("không có nội dung câu hỏi trợ lý trong log Worker", cacMay, (m) => m.troLy);
  if (troLy) results.push(troLy);
  console.log("── Tóm tắt từng bộ ──");
  for (const x of results) console.log(`${x.ok === true ? "✔" : x.ok === false ? "✘" : "⏭ chưa chạy (wrangler dev của nhóm đã thoát)"} ${x.name}`);
  failed = results.filter((x) => x.ok !== true).length;
  total = results.length;
} finally {
  for (const m of cacMay) {
    if (m.server?.pid) {
      try {
        process.kill(-m.server.pid, "SIGTERM");
      } catch {
        /* đã tắt */
      }
    }
  }
  await new Promise((res) => setTimeout(res, 1000));
  for (const m of cacMay) {
    // Buông ống đọc log của máy chủ đã tắt để vòng sự kiện tự kết thúc (xem ghi chú mã thoát ở cuối tệp).
    m.server?.stdout?.destroy();
    m.server?.stderr?.destroy();
    m.server?.unref();
    if (m.persist) rmSync(m.persist, { recursive: true, force: true });
  }
}
console.log(`Thời gian e2e: ${((Date.now() - batDau) / 1000).toFixed(0)} giây (${soNhom} nhóm)`);
console.log(failed ? `E2E: ${failed}/${total} kịch bản LỖI` : `E2E: ${total}/${total} kịch bản xanh`);
// KHÔNG `process.exit()`: khi đầu ra đi qua ống (vd `npm run trien-khai` đọc bằng tee), stdout của Node trên macOS ghi bất đồng bộ — thoát ngay có thể
// cắt mất phần đuôi (tóm tắt + dòng "E2E:") sau khi vừa chuyển hàng trăm KB đầu ra kịch bản. Đặt mã thoát rồi để tiến trình tự kết thúc khi ghi xong.
process.exitCode = failed ? 1 : 0;
