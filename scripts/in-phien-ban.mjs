// In số phiên bản hoặc ngày phát hành hiện hành (mục đầu nhật ký thay đổi) — `build:web` truyền vào esbuild (--define:__APP_VERSION__ / __APP_RELEASE_DATE__).
// Dùng: `node scripts/in-phien-ban.mjs version` hoặc `node scripts/in-phien-ban.mjs date`.
import { APP_RELEASE_DATE, APP_VERSION } from "../src/shared/app-info.ts";

const loai = process.argv[2];
if (loai === "version") process.stdout.write(APP_VERSION);
else if (loai === "date") process.stdout.write(APP_RELEASE_DATE);
else {
  console.error("Dùng: node scripts/in-phien-ban.mjs version|date");
  process.exit(2);
}
