// Việc 2.6 (kế hoạch 2026-11-15): chụp ảnh các trang chính trên TRÌNH GIẢ LẬP iPhone của Xcode. Chạy TAY, không nằm trong npm test hay lượt kiểm GitHub.
//   node scripts/chup-iphone.mjs [địa chỉ] [--cho <giây>] [--ra <thư mục>] [--trang /login,/home]
//     địa chỉ mặc định http://localhost:8787 (máy chủ cục bộ: `node scripts/dev-iphone.mjs` hoặc `npm run dev`).
//     --trang: chỉ chụp các trang này (mặc định năm trang chính). Kịch bản không đăng nhập ở đâu cả; với địa chỉ bản chạy thật, nên chỉ chụp
//     `--trang /login` (trang trong sẽ chuyển về đăng nhập). Kịch bản chỉ MỞ trang, không gửi gì lên máy chủ.
//     Ảnh ghi vào thư mục tạm (mặc định $TMPDIR/tourdao-chup-iphone-*), KHÔNG ghi vào kho (kho công khai).
// Cần: Xcode (xcrun simctl) và một trình giả lập đang bật. Kịch bản không đăng nhập: trang cần phiên sẽ chuyển về trang đăng nhập — muốn chụp trang
// trong, đăng nhập một lần bằng Safari của trình giả lập (tài khoản thử do dev-iphone.mjs in ra) rồi chạy lại; cookie còn trong trình giả lập.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PAGES } from "../src/shared/sw-policy.ts";

/** Năm trang chính (đăng nhập, trang chủ, đơn hàng, tạo đơn, tài khoản của tôi) — phải có trong PAGES. */
export const TRANG_CHINH = ["/login", "/home", "/orders", "/order-form", "/account"];

function co(argv, ten) {
  const i = argv.indexOf(ten);
  return i === -1 ? undefined : argv[i + 1];
}

function simctl(args) {
  return execFileSync("xcrun", ["simctl", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/** Tên trình giả lập đang bật, hoặc null. */
function mayDangBat() {
  let out;
  try {
    out = simctl(["list", "devices", "booted"]);
  } catch {
    return null;
  }
  const m = out.match(/^\s+(.+?) \([0-9A-F-]{36}\) \(Booted\)/m);
  return m ? m[1] : null;
}

const cho = (giay) => new Promise((res) => setTimeout(res, giay * 1000));

async function main(argv) {
  const goc = (argv.find((a) => /^https?:\/\//.test(a)) ?? "http://localhost:8787").replace(/\/+$/, "");
  const giay = Number(co(argv, "--cho") ?? 4);
  const thuMuc = co(argv, "--ra") ?? mkdtempSync(join(tmpdir(), "tourdao-chup-iphone-"));
  const dsTrang = co(argv, "--trang")?.split(",").map((t) => t.trim()).filter(Boolean) ?? TRANG_CHINH;
  const thieu = dsTrang.filter((t) => !PAGES.includes(t));
  if (thieu.length) {
    console.error(`✘ Trang không còn trong PAGES (src/shared/sw-policy.ts): ${thieu.join(", ")} — sửa TRANG_CHINH hoặc --trang.`);
    return 2;
  }
  const may = mayDangBat();
  if (!may) {
    console.error("✘ Không thấy trình giả lập iPhone nào đang bật (hoặc máy chưa có Xcode).");
    console.error("  Bật một máy: mở Xcode → Open Developer Tool → Simulator, hoặc:");
    console.error("    xcrun simctl list devices available      # xem tên máy");
    console.error('    xcrun simctl boot "iPhone 17" && open -a Simulator');
    return 1;
  }
  mkdirSync(thuMuc, { recursive: true });
  console.log(`▶ ${may} — chụp ${dsTrang.length} trang của ${goc}, chờ ${giay} giây mỗi trang`);
  let loi = 0;
  for (const trang of dsTrang) {
    const tep = join(thuMuc, `${trang.replace(/^\//, "") || "goc"}.png`);
    try {
      simctl(["openurl", "booted", goc + trang]);
      await cho(giay);
      simctl(["io", "booted", "screenshot", tep]);
      console.log(`  ✓ ${trang} → ${tep} (${Math.round(statSync(tep).size / 1024)} KB)`);
    } catch (e) {
      loi++;
      console.error(`  ✘ ${trang}: ${(e instanceof Error ? e.message : String(e)).split("\n")[0]}`);
    }
  }
  console.log(`Ảnh ở: ${thuMuc}`);
  return loi ? 1 : 0;
}

process.exitCode = await main(process.argv.slice(2));
