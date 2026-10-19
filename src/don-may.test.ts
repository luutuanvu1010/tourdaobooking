// Bài của `scripts/don-may.mjs` (dọn tiến trình kiểm thử mồ côi). Phần phân loại là hàm thuần nên thử bằng danh sách tiến trình GIẢ;
// bài KHÔNG đọc `ps` thật và KHÔNG tắt gì. Điều bài canh: Chrome hằng ngày của chủ và tiến trình của phiên khác không bao giờ bị chọn.
import assert from "node:assert/strict";
import { test } from "node:test";

type Ps = { pid: number; ppid: number; etime: number; command: string };
type Lib = {
  phanLoai: (v: { tienTrinh: Ps[]; tuoiToiThieuGiay: number; pidTuThan: number }) => {
    chon: { pid: number; loai: string }[];
    boQua: { pid: number; nhom: string; lyDo: string }[];
  };
  phanTichEtime: (s: string) => number;
};
const { phanLoai, phanTichEtime } = (await import(new URL("../scripts/don-may-lib.mjs", import.meta.url).href)) as Lib;

const GIO = 3600;
const NGUONG = 3 * GIO;
const TMP = "/var/folders/m6/8lb7g7fn35q4s4tm5t6nv21h0000gn/T";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PID_TU_THAN = 99999;

/** Tiến trình của chính `npm run don-may` (luôn có trong danh sách thật). */
const tuThan: Ps[] = [
  { pid: 99990, ppid: 500, etime: 5, command: "npm run don-may" },
  { pid: PID_TU_THAN, ppid: 99990, etime: 5, command: "node scripts/don-may.mjs" },
];
const zsh: Ps = { pid: 500, ppid: 1, etime: 40 * GIO, command: "-zsh" };

const chromeKiemThu = (pid: number, ppid: number, etime: number, dir = `${TMP}/tourdao-a2-chrome-AbC123`): Ps => ({
  pid, ppid, etime,
  command: `${CHROME} --headless=new --remote-debugging-port=60500 --user-data-dir=${dir} --no-first-run --disable-gpu about:blank`,
});
const chromeHelper = (pid: number, ppid: number, etime: number): Ps => ({
  pid, ppid, etime,
  command: `/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Framework.framework/Versions/155/Helpers/Google Chrome Helper.app/Contents/MacOS/Google Chrome Helper --type=gpu-process --headless=new --user-data-dir=${TMP}/tourdao-a2-chrome-AbC123`,
});
const chay = (tienTrinh: Ps[], tuoiToiThieuGiay = NGUONG) => phanLoai({ tienTrinh: [zsh, ...tuThan, ...tienTrinh], tuoiToiThieuGiay, pidTuThan: PID_TU_THAN });
const pidChon = (r: ReturnType<typeof chay>) => r.chon.map((c) => c.pid).sort((a, b) => a - b);

test("Chrome hằng ngày của chủ (không cờ debug, hồ sơ mặc định) không bao giờ bị chọn, dù tuổi 30 ngày và mồ côi", () => {
  const r = chay([
    { pid: 700, ppid: 1, etime: 30 * 24 * GIO, command: CHROME },
    { pid: 701, ppid: 700, etime: 30 * 24 * GIO, command: `${CHROME} Helper --type=renderer` },
    // cờ debug nhưng hồ sơ nằm ở nơi của chủ, không phải thư mục tạm: cũng không chọn
    { pid: 702, ppid: 1, etime: 30 * GIO, command: `${CHROME} --remote-debugging-port=9222 --user-data-dir=/Users/tuanbao/Library/Application Support/Google/Chrome` },
    // headless nhưng hồ sơ tạm KHÔNG phải của dự án (phiên/dự án khác): không chọn
    { pid: 703, ppid: 1, etime: 30 * GIO, command: `${CHROME} --headless=new --user-data-dir=${TMP}/playwright_chromiumdev_profile-XYZ` },
    // thoát khỏi thư mục tạm bằng ".."
    { pid: 704, ppid: 1, etime: 30 * GIO, command: `${CHROME} --headless=new --user-data-dir=${TMP}/tourdao-x/../../../Users/tuanbao/chrome` },
  ]);
  assert.deepEqual(pidChon(r), []);
});

test("Chrome headless của kịch bản, mồ côi 30 giờ: chọn cả tiến trình chính lẫn tiến trình phụ", () => {
  const r = chay([chromeKiemThu(371, 1, 30 * GIO), chromeHelper(393, 371, 30 * GIO)]);
  assert.deepEqual(pidChon(r), [371, 393]);
  assert.match(r.chon[0].loai, /Chrome/);
});

test("Chrome headless mồ côi nhưng mới 1 giờ (dưới ngưỡng 3 giờ): không chọn, ghi lý do 'trẻ'", () => {
  const r = chay([chromeKiemThu(371, 1, 1 * GIO)]);
  assert.deepEqual(pidChon(r), []);
  assert.equal(r.boQua.find((b) => b.pid === 371)?.nhom, "tre");
});

test("Chrome headless 30 giờ nhưng cha (node của kịch bản) còn sống: không chọn", () => {
  const r = chay([
    { pid: 800, ppid: 500, etime: 30 * GIO, command: "node docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-form.mjs" },
    chromeKiemThu(371, 800, 30 * GIO),
    chromeHelper(393, 371, 30 * GIO),
  ]);
  assert.deepEqual(pidChon(r), []);
  assert.equal(r.boQua.find((b) => b.pid === 371)?.nhom, "cha-song");
  assert.equal(r.boQua.find((b) => b.pid === 393)?.nhom, "cha-song"); // tiến trình phụ: đi ngược qua Chrome chính rồi gặp node còn sống
});

const wrangler = (persist: string, pidNpm: number, ppidNpm: number, etime: number): Ps[] => {
  const dongPhu = `dev --port 62766 --ip 127.0.0.1 --persist-to ${persist} --test-scheduled --var SESSION_SECRET:x`;
  return [
    { pid: pidNpm, ppid: ppidNpm, etime, command: `npm exec wrangler ${dongPhu}` },
    { pid: pidNpm + 1, ppid: pidNpm, etime, command: `node /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/node_modules/.bin/wrangler ${dongPhu}` },
    { pid: pidNpm + 2, ppid: pidNpm + 1, etime, command: `/usr/local/bin/node --no-warnings /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/node_modules/wrangler/wrangler-dist/cli.js ${dongPhu}` },
    // workerd và esbuild con KHÔNG mang --persist-to: nhận qua cây cha
    { pid: pidNpm + 3, ppid: pidNpm + 2, etime, command: "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/node_modules/@cloudflare/workerd-darwin-arm64/bin/workerd serve --binary --control-fd=3 -" },
  ];
};

test("wrangler dev cây ba tầng (npm exec → node → cli.js) mồ côi 26 giờ: chọn cả ba tầng và workerd con", () => {
  const r = chay(wrangler(`${TMP}/tourdao-e2e-SWleuF`, 94047, 1, 26 * GIO));
  assert.deepEqual(pidChon(r), [94047, 94048, 94049, 94050]);
});

test("wrangler dev có --persist-to của người dùng (không phải thư mục tạm của dự án): không chọn", () => {
  const r = chay([
    ...wrangler("/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.wrangler/state", 94047, 1, 26 * GIO),
    ...wrangler(`${TMP}/du-an-khac-abc`, 95047, 1, 26 * GIO),
  ]);
  assert.deepEqual(pidChon(r), []);
});

test("cây wrangler thuộc `npm run trien-khai` / `test:e2e` đang sống: không chọn, ghi rõ thuộc lệnh đang chạy", () => {
  for (const lenh of ["trien-khai", "day-len", "test:e2e", "test"]) {
    const r = chay([
      { pid: 900, ppid: 500, etime: 30 * GIO, command: `npm run ${lenh}` },
      { pid: 901, ppid: 900, etime: 30 * GIO, command: "node scripts/release-lib.mjs" },
      ...wrangler(`${TMP}/tourdao-e2e-SWleuF`, 94047, 901, 30 * GIO),
    ]);
    assert.deepEqual(pidChon(r), [], lenh);
    const bo = r.boQua.find((b) => b.pid === 94047);
    assert.equal(bo?.nhom, "lenh-dang-chay", lenh);
    assert.match(bo?.lyDo ?? "", new RegExp(lenh));
  }
});

test("lệnh lạ có chữ 'chrome' / 'wrangler' nhưng không đúng tên chương trình: không chọn", () => {
  const r = chay([
    { pid: 1001, ppid: 1, etime: 30 * GIO, command: `vim chrome-notes.txt --headless --user-data-dir=${TMP}/tourdao-a2-chrome-AbC123` },
    { pid: 1002, ppid: 1, etime: 30 * GIO, command: `node scripts/chrome-runner.mjs --headless=new --user-data-dir=${TMP}/tourdao-a2-chrome-AbC123` },
    { pid: 1003, ppid: 1, etime: 30 * GIO, command: `/usr/bin/grep chrome --remote-debugging-port=1 --user-data-dir=${TMP}/tourdao-a2-chrome-AbC123` },
    { pid: 1004, ppid: 1, etime: 30 * GIO, command: `tail -f /tmp/wrangler-dev.log --persist-to ${TMP}/tourdao-e2e-x` },
    { pid: 1005, ppid: 1, etime: 30 * GIO, command: `/Applications/Not Chrome.app/Contents/MacOS/Not Chrome --headless --user-data-dir=${TMP}/tourdao-a2-chrome-AbC123` },
  ]);
  assert.deepEqual(pidChon(r), []);
});

test("không bao giờ chọn tiến trình trong cây của chính lệnh don-may, kể cả khi trông như mồ côi", () => {
  const r = phanLoai({
    tienTrinh: [
      zsh,
      { pid: 99990, ppid: 500, etime: 30 * GIO, command: "npm run don-may" },
      { pid: PID_TU_THAN, ppid: 99990, etime: 30 * GIO, command: "node scripts/don-may.mjs" },
      // con của don-may (ví dụ `ps`) mang cờ Chrome: vẫn không chọn
      { ...chromeKiemThu(99991, PID_TU_THAN, 30 * GIO) },
    ],
    tuoiToiThieuGiay: NGUONG,
    pidTuThan: PID_TU_THAN,
  });
  assert.deepEqual(r.chon, []);
});

test("bộ canh chrome-tu-dong-dong.sh được nhận như một mắt xích của cây mồ côi (Chrome con của nó cũng được chọn)", () => {
  const dir = `${TMP}/tourdao-a2-chrome-AbC123`;
  const r = chay([
    { pid: 1100, ppid: 1, etime: 30 * GIO, command: `/bin/sh /Users/tuanbao/x/scripts/chrome-tu-dong-dong.sh --headless=new --remote-debugging-port=60500 --user-data-dir=${dir} about:blank` },
    chromeKiemThu(1101, 1100, 30 * GIO),
  ]);
  assert.deepEqual(pidChon(r), [1100, 1101]);
});

test("workerd mồ côi trong node_modules của dự án, 30 giờ: chọn; workerd của ai đó chạy dưới shell còn sống: không", () => {
  const w = (pid: number, ppid: number) => ({ pid, ppid, etime: 30 * GIO, command: "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/x/node_modules/@cloudflare/workerd-darwin-arm64/bin/workerd serve --binary --control-fd=3 -" });
  const r = chay([w(1200, 1), w(1201, 500)]);
  assert.deepEqual(pidChon(r), [1200]);
});

test("etime của macOS: mm:ss, hh:mm:ss, d-hh:mm:ss", () => {
  assert.equal(phanTichEtime("00:05"), 5);
  assert.equal(phanTichEtime("15:54"), 15 * 60 + 54);
  assert.equal(phanTichEtime("23:10:37"), 23 * 3600 + 10 * 60 + 37);
  assert.equal(phanTichEtime("1-02:03:04"), 24 * 3600 + 2 * 3600 + 3 * 60 + 4);
  assert.equal(phanTichEtime("  12-00:00:01 "), 12 * 86400 + 1);
  assert.ok(Number.isNaN(phanTichEtime("lạ")));
  assert.ok(Number.isNaN(phanTichEtime("")));
});

test("tuổi không đọc được: coi như còn mới, không chọn", () => {
  const r = chay([{ ...chromeKiemThu(371, 1, Number.NaN) }]);
  assert.deepEqual(pidChon(r), []);
});
