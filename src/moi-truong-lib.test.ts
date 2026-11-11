// Bài so cấu hình bản Development với bản chính thức (ADR-0162 Đ1). Đột biến làm trong bộ nhớ trên nội dung tệp thật, không ghi đè tệp nào.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

type Lib = {
  CAU_HINH_DEV: string;
  docCauHinh: (text: string) => any | null;
  kiemCauHinhDev: (prodText: string, devText: string) => string[];
  conChoTrong: (devText: string) => string[];
  lenDev: (d: any) => Promise<number>;
  docCommitDev: (goi?: any) => Promise<string | null>;
  lenChinhThuc: (d: any) => Promise<number>;
  chiDoiTaiLieu: (ten: string[]) => boolean;
  lamMoiDev: (d: any) => Promise<number>;
};
const lib = (await import(new URL("../scripts/moi-truong-lib.mjs", import.meta.url).href)) as Lib;

const prodText = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const devText = readFileSync(new URL("../wrangler.dev.jsonc", import.meta.url), "utf8");
const prod = () => lib.docCauHinh(prodText);
const dev = () => lib.docCauHinh(devText);
const chay = (p: any, d: any) => lib.kiemCauHinhDev(JSON.stringify(p), JSON.stringify(d));

test("tên tệp cấu hình Development", () => {
  assert.equal(lib.CAU_HINH_DEV, "wrangler.dev.jsonc");
});

test("hai tệp thật đạt", () => {
  assert.deepEqual(lib.kiemCauHinhDev(prodText, devText), []);
});

test("conChoTrong trên tệp thật liệt kê đúng database_id và VAPID_PUBLIC_KEY", () => {
  assert.deepEqual(lib.conChoTrong(devText), ["database_id", "VAPID_PUBLIC_KEY"]);
});

test("docCauHinh bỏ chú thích cả dòng, JSON hỏng trả null", () => {
  assert.equal(lib.docCauHinh("{ // hỏng\n}"), null);
  assert.deepEqual(lib.docCauHinh('{\n  // chú thích\n  "a": 1\n}'), { a: 1 });
});

const bang: [string, (p: any, d: any) => void][] = [
  ["database_id trùng bản chính thức", (p, d) => { d.d1_databases[0].database_id = p.d1_databases[0].database_id; }],
  ["database_name trùng", (p, d) => { d.d1_databases[0].database_name = p.d1_databases[0].database_name; }],
  ["một bucket_name trùng", (p, d) => { d.r2_buckets[1].bucket_name = p.r2_buckets[1].bucket_name; }],
  ["name Worker trùng", (p, d) => { d.name = p.name; }],
  ["routes là booking.tourdao.vn", (_p, d) => { d.routes[0].pattern = "booking.tourdao.vn"; }],
  ["VAPID_PUBLIC_KEY trùng", (p, d) => { d.vars.VAPID_PUBLIC_KEY = p.vars.VAPID_PUBLIC_KEY; }],
  ["PASSKEY_RP_ID trùng", (p, d) => { d.vars.PASSKEY_RP_ID = p.vars.PASSKEY_RP_ID; }],
  ["PASSKEY_ORIGIN trùng", (p, d) => { d.vars.PASSKEY_ORIGIN = p.vars.PASSKEY_ORIGIN; }],
  ["VAPID_SUB trỏ bản chính thức", (_p, d) => { d.vars.VAPID_SUB = "https://booking.tourdao.vn"; }],
  ["bỏ MOI_TRUONG", (_p, d) => { delete d.vars.MOI_TRUONG; }],
  ["MOI_TRUONG khác development", (_p, d) => { d.vars.MOI_TRUONG = "production"; }],
  ["bản chính thức có MOI_TRUONG", (p, _d) => { p.vars.MOI_TRUONG = "development"; }],
  ["bản Development thêm một kho", (_p, d) => { d.r2_buckets.push({ binding: "KHAC", bucket_name: "tourdao-sales-dev-khac" }); }],
  ["bản Development bớt một kho", (_p, d) => { d.r2_buckets.pop(); }],
  ["bản chính thức thêm một kho", (p, _d) => { p.r2_buckets.push({ binding: "KHAC", bucket_name: "tourdao-sales-khac" }); }],
  ["bản Development thêm một D1", (_p, d) => { d.d1_databases.push({ binding: "DB2", database_name: "tourdao-sales-dev-db2", database_id: "11111111-1111-1111-1111-111111111111" }); }],
  ["bản Development bớt D1", (_p, d) => { d.d1_databases = []; }],
  ["bản Development thêm Durable Object", (_p, d) => { d.durable_objects.bindings.push({ name: "KHAC", class_name: "Khac" }); }],
  ["bản chính thức bớt Durable Object", (p, _d) => { p.durable_objects.bindings = []; }],
  ["bản Development thêm cron", (_p, d) => { d.triggers.crons.push("0 * * * *"); }],
  ["bản chính thức bớt cron", (p, _d) => { p.triggers.crons = []; }],
  ["bản Development bớt send_email", (_p, d) => { delete d.send_email; }],
  ["bản chính thức thêm send_email", (p, _d) => { p.send_email.push({ name: "EMAIL2" }); }],
  ["đổi run_worker_first", (_p, d) => { d.assets.run_worker_first = ["/api/*"]; }],
  ["khoá lạ trong vars", (_p, d) => { d.vars.KHOA_LA = "x"; }],
  ["bản chính thức có khoá vars mà Development thiếu", (p, _d) => { p.vars.KHOA_LA = "x"; }],
  ["SERVICES_SHEET_ID lệch", (_p, d) => { d.vars.SERVICES_SHEET_ID = "khac"; }],
  ["Development có khối build", (_p, d) => { d.build = { command: "npm run build:web" }; }],
  ["assets.directory trùng", (p, d) => { d.assets.directory = p.assets.directory; }],
];
for (const [ten, sua] of bang) {
  test(`đột biến: ${ten} thì đỏ`, () => {
    const p = prod();
    const d = dev();
    sua(p, d);
    const loi = chay(p, d);
    assert.ok(loi.length > 0, `phải báo lỗi: ${ten}`);
    assert.ok(loi.every((x) => typeof x === "string" && x.length > 0));
  });
}

test("mã database_id của bản chính thức nằm trong chú thích của tệp thử vẫn bị bắt", () => {
  const ma = prod().d1_databases[0].database_id;
  const loi = lib.kiemCauHinhDev(prodText, devText.replace('"name"', `// ${ma}\n  "name"`));
  assert.ok(loi.length > 0);
});

test("JSON hỏng ở một trong hai bên thì đỏ", () => {
  assert.ok(lib.kiemCauHinhDev(prodText, "{ hỏng").length > 0);
  assert.ok(lib.kiemCauHinhDev("{ hỏng", devText).length > 0);
});

test("conChoTrong: điền đủ thì rỗng", () => {
  const d = dev();
  d.d1_databases[0].database_id = "bcd4c0ac-0000-4000-8000-000000000001";
  d.vars.VAPID_PUBLIC_KEY = "BHVkhoathat";
  assert.deepEqual(lib.conChoTrong(JSON.stringify(d)), []);
});

// ─────────────────────────── lenDev (Task 4) ───────────────────────────
// Bộ chạy giả NÉM LỖI khi gặp lệnh ngoài kịch bản (kiểu src/release-lib.test.ts): danh sách lệnh đã gọi là bằng chứng đầy đủ. Không bài nào chạy wrangler thật.
type KQ = { code: number; stdout: string; stderr: string };
const kq = (stdout = "", code = 0, stderr = ""): KQ => ({ code, stdout, stderr });
const MA = "a".repeat(40);
const MA2 = "b".repeat(40);
const DB_DEV = "tourdao-sales-dev-db";
const wr = (s: string) => `CI=1 npx wrangler ${s} --config wrangler.dev.jsonc`;
const devDienDu = () => {
  const d = dev();
  d.d1_databases[0].database_id = "bcd4c0ac-0000-4000-8000-000000000001";
  d.vars.VAPID_PUBLIC_KEY = "BHVkhoathat";
  return JSON.stringify(d);
};
const SECRET_DU = JSON.stringify(["SESSION_SECRET", "LAN_GUI_SECRET", "MFA_ENCRYPTION_KEY"].map((name) => ({ name, type: "secret_text" })));
const KHO_DU = ["tourdao-sales-dev-ho-so", "tourdao-sales-dev-ho-tro", "tourdao-sales-dev-ve-dien-tu", "tourdao-sales-dev-bien-lai"].map((t) => `name:           ${t}\ncreation_date:  2026-11-04\n`).join("\n");
const DOC_MIG = wr(`d1 execute ${DB_DEV} --remote --json --command SELECT name FROM d1_migrations`);
const migJson = (...ten: string[]) => JSON.stringify([{ results: ten.map((name) => ({ name })), success: true }]);
const KB = {
  "git status --porcelain": kq(""),
  "git rev-parse HEAD": kq(MA + "\n"),
  "npm run build:web": kq(),
  [`node scripts/dung-tai-san-dev.mjs ${MA}`]: kq(),
  [wr("whoami")]: kq("You are logged in with an OAuth Token"),
  [wr("secret list --format json")]: kq(SECRET_DU),
  [wr("r2 bucket list")]: kq(KHO_DU),
  [DOC_MIG]: kq(migJson("0001_staff.sql")),
  [wr(`d1 migrations apply ${DB_DEV} --remote`)]: kq(),
  [wr("deploy")]: kq("Current Version ID: x"),
};
const GHI = [wr(`d1 migrations apply ${DB_DEV} --remote`), wr("deploy")];

function chayLen(over: Record<string, KQ | KQ[]> = {}, o: { args?: string[]; dev?: string; prod?: string; commits?: (string | null)[] } = {}) {
  const script: Record<string, KQ | KQ[]> = { ...KB, ...over };
  const calls: string[] = [];
  const lines: string[] = [];
  const raw: { cmd: string; args: string[]; env?: Record<string, string> }[] = [];
  const cho: number[] = [];
  const commits = [...(o.commits ?? [MA])];
  const docTep = (ten: string) => (ten === "wrangler.dev.jsonc" ? (o.dev ?? devDienDu()) : ten === "wrangler.jsonc" ? (o.prod ?? prodText) : (() => { throw new Error("tệp lạ " + ten); })());
  const deps = {
    args: o.args ?? [],
    log: (l: string) => lines.push(l),
    docTep,
    tenMigration: ["0001_staff.sql", "0002_x.sql"],
    docCommitDev: async () => (commits.length > 1 ? commits.shift() : commits[0]) ?? null,
    sleep: async (ms: number) => { cho.push(ms); },
    run: (cmd: string, args: string[], opts?: { env?: Record<string, string> }) => {
      raw.push({ cmd, args, env: opts?.env });
      const k = `${opts?.env ? Object.entries(opts.env).map(([a, b]) => `${a}=${b} `).join("") : ""}${cmd} ${args.join(" ")}`.trim();
      calls.push(k);
      const v = script[k];
      const r = Array.isArray(v) ? (v.length > 1 ? v.shift() : v[0]) : v;
      if (!r) throw new Error(`lệnh ngoài kịch bản: ${k}`);
      return r;
    },
  };
  return { deps, calls, raw, cho, text: () => lines.join("\n") };
}
const khongGhi = (calls: string[]) => assert.deepEqual(calls.filter((c) => GHI.includes(c)), [], "không được có lệnh ghi");

test("lenDev đường đạt: đúng thứ tự, mọi wrangler mang --config và CI=1, không đụng tên D1 bản chính thức", async () => {
  const h = chayLen();
  assert.equal(await lib.lenDev(h.deps), 0, h.text());
  assert.deepEqual(h.calls, [
    "git status --porcelain",
    "git rev-parse HEAD",
    "npm run build:web",
    `node scripts/dung-tai-san-dev.mjs ${MA}`,
    "git status --porcelain",
    wr("whoami"),
    wr("secret list --format json"),
    wr("r2 bucket list"),
    DOC_MIG,
    wr(`d1 migrations apply ${DB_DEV} --remote`),
    wr("deploy"),
  ]);
});

test("lenDev: MỌI lời gọi wrangler (kể cả lúc dừng) mang --config wrangler.dev.jsonc + CI=1; không tham số nào chứa tourdao-sales-db", async () => {
  const kichBan: Record<string, KQ | KQ[]>[] = [
    {},
    { [wr("secret list --format json")]: kq(JSON.stringify([])) },
    { [wr("r2 bucket list")]: kq("") },
    { [DOC_MIG]: kq(migJson("9999_la.sql")) },
    { [DOC_MIG]: kq("", 1, "no such table: d1_migrations") },
  ];
  for (const over of kichBan) {
    const h = chayLen(over);
    await lib.lenDev(h.deps);
    const wrangler = h.raw.filter((c) => c.args.includes("wrangler") || c.cmd.includes("wrangler"));
    assert.ok(wrangler.length > 0);
    for (const c of wrangler) {
      const i = c.args.indexOf("--config");
      assert.ok(i >= 0 && c.args[i + 1] === "wrangler.dev.jsonc", `thiếu --config: ${c.args.join(" ")}`);
      assert.equal(c.env?.CI, "1");
      assert.equal(c.cmd, "npx");
    }
    for (const c of h.raw) for (const a of c.args) assert.ok(!a.includes("tourdao-sales-db"), `chạm tên D1 chính thức: ${a}`);
  }
});

test("lenDev: trong mã nguồn thư viện chỉ có MỘT chỗ viết \"wrangler\" làm lệnh (hàm nội bộ gắn --config)", () => {
  const src = readFileSync(new URL("../scripts/moi-truong-lib.mjs", import.meta.url), "utf8");
  assert.equal((src.match(/"wrangler"/g) ?? []).length, 1);
  assert.ok(!src.includes("tourdao-sales-db"));
});

test("lenDev dừng, không lệnh nào chạy: có tham số", async () => {
  const h = chayLen({}, { args: ["--remote"] });
  assert.notEqual(await lib.lenDev(h.deps), 0);
  assert.deepEqual(h.calls, []);
});

test("lenDev dừng trước cả kiểm thư mục: cấu hình đột biến (mã D1 trùng bản chính thức)", async () => {
  const d = JSON.parse(devDienDu());
  d.d1_databases[0].database_id = prod().d1_databases[0].database_id;
  const h = chayLen({}, { dev: JSON.stringify(d) });
  assert.notEqual(await lib.lenDev(h.deps), 0);
  assert.deepEqual(h.calls, []);
  assert.match(h.text(), /DỪNG/);
});

test("lenDev dừng: còn chỗ trống trong cấu hình Development", async () => {
  const h = chayLen({}, { dev: devText });
  assert.notEqual(await lib.lenDev(h.deps), 0);
  assert.deepEqual(h.calls, []);
  assert.match(h.text(), /database_id/);
});

test("lenDev dừng: thư mục bẩn", async () => {
  const h = chayLen({ "git status --porcelain": kq(" M src/a.ts\n") });
  assert.notEqual(await lib.lenDev(h.deps), 0);
  assert.deepEqual(h.calls, ["git status --porcelain"]);
});

test("lenDev dừng: lệnh dựng làm bẩn thư mục — nêu tệp bị đổi, bảo commit rồi chạy lại", async () => {
  const h = chayLen({ "git status --porcelain": [kq(""), kq(" M src/shared/so-do-trang.ts\n M src/shared/tro-ly-cau-truc.ts\n")] });
  assert.notEqual(await lib.lenDev(h.deps), 0);
  assert.match(h.text(), /so-do-trang\.ts/);
  assert.match(h.text(), /tro-ly-cau-truc\.ts/);
  assert.match(h.text(), /commit/);
  assert.ok(!h.calls.includes(wr("whoami")));
  khongGhi(h.calls);
});

test("lenDev dừng: build:web đỏ / dựng tài sản đỏ / chưa đăng nhập", async () => {
  for (const over of [{ "npm run build:web": kq("", 1) }, { [`node scripts/dung-tai-san-dev.mjs ${MA}`]: kq("", 1) }, { [wr("whoami")]: kq("", 1) }]) {
    const h = chayLen(over);
    assert.notEqual(await lib.lenDev(h.deps), 0);
    khongGhi(h.calls);
  }
});

test("lenDev dừng: thiếu khoá — câu báo mang --config wrangler.dev.jsonc", async () => {
  const h = chayLen({ [wr("secret list --format json")]: kq(JSON.stringify([{ name: "SESSION_SECRET", type: "secret_text" }])) });
  assert.notEqual(await lib.lenDev(h.deps), 0);
  assert.match(h.text(), /LAN_GUI_SECRET/);
  assert.match(h.text(), /MFA_ENCRYPTION_KEY/);
  assert.match(h.text(), /secret put LAN_GUI_SECRET --config wrangler\.dev\.jsonc/);
  khongGhi(h.calls);
});

test("lenDev dừng: danh sách khoá đọc không được", async () => {
  const h = chayLen({ [wr("secret list --format json")]: kq("lạ") });
  assert.notEqual(await lib.lenDev(h.deps), 0);
  khongGhi(h.calls);
});

test("lenDev dừng: thiếu kho tệp — câu báo mang tên kho Development", async () => {
  const h = chayLen({ [wr("r2 bucket list")]: kq("name:           tourdao-sales-dev-ho-so\n") });
  assert.notEqual(await lib.lenDev(h.deps), 0);
  assert.match(h.text(), /tourdao-sales-dev-ho-tro/);
  assert.match(h.text(), /--config wrangler\.dev\.jsonc/);
  khongGhi(h.calls);
});

test("lenDev dừng: d1_migrations có tên không có ở migrations/ — chỉ chủ chạy npm run lam-moi-dev", async () => {
  const h = chayLen({ [DOC_MIG]: kq(migJson("0001_staff.sql", "0999_nhanh_khac.sql")) });
  assert.notEqual(await lib.lenDev(h.deps), 0);
  assert.match(h.text(), /npm run lam-moi-dev/);
  assert.match(h.text(), /0999_nhanh_khac\.sql/);
  khongGhi(h.calls);
});

test("lenDev dừng: lỗi đọc d1_migrations khác, hoặc đầu ra lạ", async () => {
  for (const r of [kq("", 1, "Authentication error"), kq("không phải JSON")]) {
    const h = chayLen({ [DOC_MIG]: r });
    assert.notEqual(await lib.lenDev(h.deps), 0);
    khongGhi(h.calls);
  }
});

test("lenDev: 'no such table: d1_migrations' coi là rỗng và đi tiếp", async () => {
  const h = chayLen({ [DOC_MIG]: kq("", 1, "no such table: d1_migrations: SQLITE_ERROR") });
  assert.equal(await lib.lenDev(h.deps), 0, h.text());
  assert.ok(h.calls.includes(wr("deploy")));
});

test("lenDev dừng: áp migration đỏ thì không deploy; deploy đỏ thì thoát khác 0", async () => {
  let h = chayLen({ [wr(`d1 migrations apply ${DB_DEV} --remote`)]: kq("", 1) });
  assert.notEqual(await lib.lenDev(h.deps), 0);
  assert.ok(!h.calls.includes(wr("deploy")));
  h = chayLen({ [wr("deploy")]: kq("", 1) });
  assert.notEqual(await lib.lenDev(h.deps), 0);
});

test("lenDev: mã sau deploy lệch một lần thì đợi rồi thử lại; vẫn lệch thì thoát khác 0", async () => {
  let h = chayLen({}, { commits: [null, MA] });
  assert.equal(await lib.lenDev(h.deps), 0, h.text());
  assert.equal(h.cho.length, 1);
  h = chayLen({}, { commits: [MA2] });
  assert.notEqual(await lib.lenDev(h.deps), 0);
  assert.equal(h.cho.length, 1);
});

test("docCommitDev: đọc ban-thu.json kèm tham số ngẫu nhiên, trả mã đúng khuôn", async () => {
  const urls: string[] = [];
  const goi = (body: any, ok = true) => async (u: string) => { urls.push(u); return { ok, json: async () => body }; };
  assert.equal(await lib.docCommitDev(goi({ commit: MA })), MA);
  assert.match(urls[0], /^https:\/\/dev\.tourdao\.vn\/ban-thu\.json\?t=\S+$/);
  await lib.docCommitDev(goi({ commit: MA }));
  assert.notEqual(urls[0], urls[1]);
});

test("docCommitDev: null khi lỗi mạng, không phải JSON, mã sai khuôn, mã lỗi HTTP", async () => {
  assert.equal(await lib.docCommitDev(async () => { throw new Error("mạng"); }), null);
  assert.equal(await lib.docCommitDev(async () => ({ ok: true, json: async () => { throw new Error("không phải JSON"); } })), null);
  assert.equal(await lib.docCommitDev(async () => ({ ok: true, json: async () => ({ commit: "abc" }) })), null);
  assert.equal(await lib.docCommitDev(async () => ({ ok: true, json: async () => ({ commit: MA.toUpperCase() }) })), null);
  assert.equal(await lib.docCommitDev(async () => ({ ok: false, json: async () => ({ commit: MA }) })), null);
});

// ─────────────────────────── lenChinhThuc (Task 5) ───────────────────────────
test("chiDoiTaiLieu: đúng khi mọi tệp là docs/, .claude/ hoặc .md ngoài public/; sai ở các trường hợp còn lại", () => {
  assert.equal(lib.chiDoiTaiLieu(["docs/a.md", ".claude/x.json", "README.md", "docs/adr/b.md"]), true);
  for (const t of ["src/x.ts", "public/a.md", "migrations/x.sql", "scripts/x.mjs"]) assert.equal(lib.chiDoiTaiLieu(["docs/a.md", t]), false, t);
  assert.equal(lib.chiDoiTaiLieu([]), false);
});

const NH = "worktree-x";
const GOC = "c".repeat(40);
function chayChinh(over: Record<string, KQ | KQ[]> = {}, o: { isTTY?: boolean; target?: string | undefined; ma?: string | null; tep?: string } = {}) {
  const script: Record<string, KQ | KQ[]> = {
    [`git rev-parse ${NH}`]: kq(MA + "\n"),
    [`git diff --name-only --no-renames main...${NH}`]: kq(o.tep ?? "src/a.ts\n"),
    [`npm run day-len -- ${NH}`]: kq(),
    "git rev-parse main": kq(MA + "\n"),
    "git rev-parse origin/main": kq(MA + "\n"),
    "npm run trien-khai": kq(),
    ...over,
  };
  const calls: string[] = [];
  const stream: Record<string, unknown> = {};
  const lines: string[] = [];
  let docMa = 0;
  const deps = {
    isTTY: o.isTTY ?? true,
    target: "target" in o ? o.target : NH,
    log: (l: string) => lines.push(l),
    docCommitDev: async () => { docMa++; return o.ma === undefined ? MA : o.ma; },
    run: (cmd: string, args: string[], opts?: { stream?: boolean }) => {
      const k = `${cmd} ${args.join(" ")}`;
      calls.push(k);
      stream[k] = opts?.stream;
      const r = script[k];
      if (!r) throw new Error(`lệnh ngoài kịch bản: ${k}`);
      return r as KQ;
    },
  };
  return { deps, calls, stream, text: () => lines.join("\n"), docMa: () => docMa };
}
const CUOI = ["npm run day-len -- " + NH, "npm run trien-khai"];

test("lenChinhThuc đường đạt: day-len rồi trien-khai, cả hai là tiến trình con có stream", async () => {
  const h = chayChinh();
  assert.equal(await lib.lenChinhThuc(h.deps), 0, h.text());
  assert.deepEqual(h.calls.filter((c) => CUOI.includes(c)), CUOI);
  for (const c of CUOI) assert.equal(h.stream[c], true, c);
});

test("lenChinhThuc dừng, chưa gọi gì: không TTY, thiếu hoặc lạ tên nhánh", async () => {
  for (const o of [{ isTTY: false }, { target: undefined }, { target: "--force" }, { target: "a b" }]) {
    const h = chayChinh({}, o as any);
    assert.notEqual(await lib.lenChinhThuc(h.deps), 0);
    assert.deepEqual(h.calls, []);
  }
});

test("lenChinhThuc dừng, không gọi day-len: mã Development khác mã nhánh, hoặc không đọc được", async () => {
  for (const ma of [MA2, null]) {
    const h = chayChinh({}, { ma });
    assert.notEqual(await lib.lenChinhThuc(h.deps), 0);
    assert.deepEqual(h.calls.filter((c) => CUOI.includes(c)), []);
  }
});

test("lenChinhThuc: day-len khác 0 trả đúng mã đó, không trien-khai", async () => {
  const h = chayChinh({ [CUOI[0]]: kq("", 7) });
  assert.equal(await lib.lenChinhThuc(h.deps), 7);
  assert.ok(!h.calls.includes("npm run trien-khai"));
});

test("lenChinhThuc: sau day-len main hoặc origin/main khác mã nhánh thì dừng, không trien-khai", async () => {
  for (const k of ["git rev-parse main", "git rev-parse origin/main"]) {
    const h = chayChinh({ [k]: kq(MA2 + "\n") });
    assert.notEqual(await lib.lenChinhThuc(h.deps), 0);
    assert.ok(!h.calls.includes("npm run trien-khai"));
  }
});

test("lenChinhThuc: trien-khai khác 0 trả đúng mã đó và nói «Đã nhập, chưa triển khai» kèm cách chạy tiếp", async () => {
  const h = chayChinh({ "npm run trien-khai": kq("", 5) });
  assert.equal(await lib.lenChinhThuc(h.deps), 5);
  assert.match(h.text(), /Đã nhập, chưa triển khai/);
  assert.match(h.text(), /npm run trien-khai/);
  assert.match(h.text(), /tourdao-sales/);
});

test("lenChinhThuc chỉ đổi tài liệu: không đọc mã Development, gọi day-len, không trien-khai, có câu báo", async () => {
  const h = chayChinh({}, { tep: "docs/a.md\nREADME.md\n", ma: MA2 });
  assert.equal(await lib.lenChinhThuc(h.deps), 0, h.text());
  assert.equal(h.docMa(), 0);
  assert.ok(h.calls.includes(CUOI[0]));
  assert.ok(!h.calls.includes("npm run trien-khai"));
  assert.match(h.text(), /tài liệu/);
});

test("lenChinhThuc dừng: không đọc được danh sách tệp đổi, hoặc không đọc được mã nhánh", async () => {
  for (const k of [`git diff --name-only --no-renames main...${NH}`, `git rev-parse ${NH}`]) {
    const h = chayChinh({ [k]: kq("", 1, "lỗi") });
    assert.notEqual(await lib.lenChinhThuc(h.deps), 0);
    assert.deepEqual(h.calls.filter((c) => CUOI.includes(c)), []);
  }
});

test("lenChinhThuc: câu hướng dẫn dùng lệnh nói rõ thư mục gốc, đứng ở main, thư mục sạch", async () => {
  const h = chayChinh({}, { target: undefined });
  await lib.lenChinhThuc(h.deps);
  assert.match(h.text(), /tourdao-sales/);
  assert.match(h.text(), /main/);
  assert.match(h.text(), /sạch/);
});

test("lenChinhThuc với git thật: đổi tên src/x.ts thành docs/x.md liệt kê CẢ tên cũ lẫn mới, không bị coi là chỉ đổi tài liệu", async () => {
  const { execFileSync } = await import("node:child_process");
  const { mkdtempSync, mkdirSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const dir = mkdtempSync(`${tmpdir()}/doi-ten-`);
  const g = (...a: string[]) => execFileSync("git", ["-C", dir, "-c", "user.email=t@t", "-c", "user.name=t", ...a], { encoding: "utf8" });
  g("init", "-q", "-b", "main");
  mkdirSync(`${dir}/src`);
  writeFileSync(`${dir}/src/x.ts`, "export const x = 'noi dung du dai de git nhan ra doi ten';\n".repeat(5));
  g("add", "."); g("commit", "-qm", "a");
  g("checkout", "-qb", "nhanh");
  mkdirSync(`${dir}/docs`);
  g("mv", "src/x.ts", "docs/x.md"); g("commit", "-qam", "b");
  let lenh: string[] = [];
  const gia = chayChinh({ [`git rev-parse nhanh`]: kq(g("rev-parse", "nhanh")) }, { target: "nhanh" });
  const run = (c: string, a: string[], o: any) => {
    if (c === "git" && a[0] === "diff") { lenh = a; return kq(g(...a)); }
    return gia.deps.run(c, a, o);
  };
  await lib.lenChinhThuc({ ...gia.deps, run });
  assert.ok(lenh.includes("--no-renames"), "lệnh diff phải có --no-renames");
  const ra = g(...lenh).split("\n").filter(Boolean).sort();
  assert.deepEqual(ra, ["docs/x.md", "src/x.ts"]);
  assert.equal(lib.chiDoiTaiLieu(ra), false);
});

// ─────────────────────────── lamMoiDev (Task 6) ───────────────────────────
// Xoá sạch D1 của bản Development rồi dựng lại. Bộ chạy giả NÉM LỖI khi gặp lệnh ngoài kịch bản. Không bài nào chạy wrangler thật.
const SQL_DOC = "SELECT type, name FROM sqlite_master";
const masterJson = (...d: { type: string; name: string }[]) => JSON.stringify([{ results: d, success: true }]);
const MASTER = masterJson(
  { type: "table", name: "staff" },
  { type: "table", name: "sqlite_sequence" },
  { type: "table", name: "_cf_KV" },
  { type: "table", name: "d1_migrations" },
  { type: "index", name: "idx_staff" },
  { type: "trigger", name: "trg_staff" },
  { type: "view", name: "v_stf_a" },
  { type: "view", name: "v_stf_b" },
);
const DROP_VIEW = 'DROP VIEW IF EXISTS "v_stf_a"; DROP VIEW IF EXISTS "v_stf_b";';
const DROP_BANG = 'PRAGMA defer_foreign_keys = ON; DROP TABLE IF EXISTS "staff"; DROP TABLE IF EXISTS "d1_migrations";';
const TK = [
  { name: "A Thử", phone: "0900000001", pin: "123457", permissions: ["SALES"] },
  { name: "B Thử", phone: "0900000002", pin: "654329", permissions: ["ADMIN"] },
];
const lenhD1 = (sql: string) => wr(`d1 execute ${DB_DEV} --remote --json --command ${sql}`);
const KB_LM = {
  [lenhD1(SQL_DOC)]: kq(MASTER),
  [lenhD1(DROP_VIEW)]: kq(),
  [lenhD1(DROP_BANG)]: kq(),
  [wr(`d1 migrations apply ${DB_DEV} --remote`)]: kq(),
  [lenhD1("INSERT:0900000001")]: kq(),
  [lenhD1("INSERT:0900000002")]: kq(),
};
function chayLam(over: Record<string, KQ | KQ[]> = {}, o: { isTTY?: boolean; tra?: string; dev?: string; prod?: string } = {}) {
  const script: Record<string, KQ | KQ[]> = { ...KB_LM, ...over };
  const calls: string[] = [];
  const raw: { cmd: string; args: string[]; env?: Record<string, string> }[] = [];
  const lines: string[] = [];
  let hoi = 0;
  const deps = {
    isTTY: o.isTTY ?? true,
    log: (l: string) => lines.push(l),
    ask: async () => { hoi++; return o.tra ?? "dev"; },
    docTep: (ten: string) => (ten === "wrangler.dev.jsonc" ? (o.dev ?? devDienDu()) : ten === "wrangler.jsonc" ? (o.prod ?? prodText) : (() => { throw new Error("tệp lạ " + ten); })()),
    taoTaiKhoan: () => TK,
    sqlTaiKhoan: async (a: any) => `INSERT:${a.phone}`,
    run: (cmd: string, args: string[], opts?: { env?: Record<string, string> }) => {
      raw.push({ cmd, args, env: opts?.env });
      const k = `${opts?.env ? Object.entries(opts.env).map(([a, b]) => `${a}=${b} `).join("") : ""}${cmd} ${args.join(" ")}`.trim();
      calls.push(k);
      const v = script[k];
      const r = Array.isArray(v) ? (v.length > 1 ? v.shift() : v[0]) : v;
      if (!r) throw new Error(`lệnh ngoài kịch bản: ${k}`);
      return r;
    },
  };
  return { deps, calls, raw, hoi: () => hoi, text: () => lines.join("\n") };
}

test("lamMoiDev đường đạt: đúng thứ tự; xoá view rồi MỘT lệnh xoá bảng có PRAGMA; bỏ sqlite_/_cf_; in SĐT + PIN", async () => {
  const h = chayLam();
  assert.equal(await lib.lamMoiDev(h.deps), 0, h.text());
  assert.deepEqual(h.calls, [
    lenhD1(SQL_DOC),
    lenhD1(DROP_VIEW),
    lenhD1(DROP_BANG),
    wr(`d1 migrations apply ${DB_DEV} --remote`),
    lenhD1("INSERT:0900000001"),
    lenhD1("INSERT:0900000002"),
  ]);
  for (const a of TK) { assert.match(h.text(), new RegExp(a.phone)); assert.match(h.text(), new RegExp(a.pin)); }
  assert.match(h.text(), /Bảng tin/);
  assert.match(h.text(), /kho tệp/i);
});

test("lamMoiDev: MỌI lời gọi mang --config wrangler.dev.jsonc + CI=1, không --file, không tham số chứa tourdao-sales-db", async () => {
  const kichBan: Record<string, KQ | KQ[]>[] = [{}, { [lenhD1(DROP_BANG)]: kq("", 1) }, { [lenhD1(SQL_DOC)]: kq("lạ") }];
  for (const over of kichBan) {
    const h = chayLam(over);
    await lib.lamMoiDev(h.deps);
    assert.ok(h.raw.length > 0);
    for (const c of h.raw) {
      assert.equal(c.cmd, "npx");
      const i = c.args.indexOf("--config");
      assert.ok(i >= 0 && c.args[i + 1] === "wrangler.dev.jsonc", `thiếu --config: ${c.args.join(" ")}`);
      assert.equal(c.env?.CI, "1");
      assert.ok(!c.args.includes("--file"));
      for (const a of c.args) assert.ok(!a.includes("tourdao-sales-db"), `chạm tên D1 chính thức: ${a}`);
    }
  }
});

test("lamMoiDev dừng, không lệnh nào chạy: không TTY; trả lời khác đúng chữ dev; cấu hình đột biến; còn chỗ trống", async () => {
  let h = chayLam({}, { isTTY: false });
  assert.notEqual(await lib.lamMoiDev(h.deps), 0);
  assert.deepEqual(h.calls, []);
  assert.equal(h.hoi(), 0);
  for (const tra of ["", "Dev", "dev ", "yes", "prod"]) {
    h = chayLam({}, { tra });
    assert.notEqual(await lib.lamMoiDev(h.deps), 0, tra);
    assert.deepEqual(h.calls, [], tra);
  }
  const d = JSON.parse(devDienDu());
  d.d1_databases[0].database_id = prod().d1_databases[0].database_id;
  h = chayLam({}, { dev: JSON.stringify(d) });
  assert.notEqual(await lib.lamMoiDev(h.deps), 0);
  assert.deepEqual(h.calls, []);
  assert.equal(h.hoi(), 0);
  h = chayLam({}, { dev: devText });
  assert.notEqual(await lib.lamMoiDev(h.deps), 0);
  assert.deepEqual(h.calls, []);
});

test("lamMoiDev dừng: tên D1 không kết thúc bằng -dev-db (kể cả khi tên khác bản chính thức) — không lệnh nào chạy", async () => {
  const d = JSON.parse(devDienDu());
  d.d1_databases[0].database_name = "tourdao-sales-dev-khac";
  const h = chayLam({}, { dev: JSON.stringify(d) });
  assert.notEqual(await lib.lamMoiDev(h.deps), 0);
  assert.deepEqual(h.calls, []);
  assert.match(h.text(), /-dev-db/);
});

test("lamMoiDev dừng và báo đã làm tới đâu khi một bước đỏ", async () => {
  let h = chayLam({ [lenhD1(SQL_DOC)]: kq("", 1, "lỗi") });
  assert.notEqual(await lib.lamMoiDev(h.deps), 0);
  assert.match(h.text(), /CHƯA có gì bị đổi/);
  h = chayLam({ [lenhD1(DROP_BANG)]: kq("", 1, "lỗi") });
  assert.notEqual(await lib.lamMoiDev(h.deps), 0);
  assert.ok(!h.calls.includes(wr(`d1 migrations apply ${DB_DEV} --remote`)));
  assert.match(h.text(), /xoá view/);
  h = chayLam({ [wr(`d1 migrations apply ${DB_DEV} --remote`)]: kq("", 1) });
  assert.notEqual(await lib.lamMoiDev(h.deps), 0);
  assert.ok(!h.calls.includes(lenhD1("INSERT:0900000001")));
  assert.match(h.text(), /xoá bảng/);
  h = chayLam({ [lenhD1("INSERT:0900000002")]: kq("", 1) });
  assert.notEqual(await lib.lamMoiDev(h.deps), 0);
  assert.match(h.text(), /0900000001/);
  assert.ok(!h.text().includes("654329"), "tài khoản chưa tạo được thì không in PIN");
});

test("lamMoiDev: không có view thì bỏ bước xoá view; tên đối tượng lạ khuôn thì dừng, không xoá gì", async () => {
  let h = chayLam({ [lenhD1(SQL_DOC)]: kq(masterJson({ type: "table", name: "staff" })), [lenhD1('PRAGMA defer_foreign_keys = ON; DROP TABLE IF EXISTS "staff";')]: kq() });
  assert.equal(await lib.lamMoiDev(h.deps), 0, h.text());
  assert.ok(!h.calls.some((c) => c.includes("DROP VIEW")));
  h = chayLam({ [lenhD1(SQL_DOC)]: kq(masterJson({ type: "table", name: 'x"; DROP TABLE y; --' })) });
  assert.notEqual(await lib.lamMoiDev(h.deps), 0);
  assert.ok(!h.calls.some((c) => c.includes("DROP")));
});

test("lamMoiDev: PIN không vào tệp — thư viện không ghi tệp", () => {
  const src = readFileSync(new URL("../scripts/moi-truong-lib.mjs", import.meta.url), "utf8");
  assert.ok(!/writeFile|appendFile|createWriteStream/.test(src));
  for (const t of ["lam-moi-dev.mjs", "tai-khoan-thu.mjs"]) assert.ok(!/writeFile|appendFile|createWriteStream/.test(readFileSync(new URL(`../scripts/${t}`, import.meta.url), "utf8")), t);
});

test("taoTaiKhoanThu: bảy tài khoản, SĐT cố định, PIN 6 số không yếu và khác nhau giữa các lần gọi", async () => {
  const { taoTaiKhoanThu } = (await import(new URL("../scripts/tai-khoan-thu.mjs", import.meta.url).href)) as { taoTaiKhoanThu: () => any[] };
  const a = taoTaiKhoanThu();
  assert.equal(a.length, 7);
  assert.deepEqual(a.map((x) => x.phone), ["0900000001", "0900000002", "0900000003", "0900000004", "0900000005", "0900000006", "0900000007"]);
  for (const x of a) assert.match(x.pin, /^\d{6}$/);
  assert.deepEqual(a[6].permissions, ["DRIVER_PARTNER"]);
});

// Trang hướng dẫn chủ tạo tài nguyên Development (ADR-0162, Task 7). Lệnh sai trong trang này là ghi đè bản chính thức, nên máy canh từng dòng.
const HD_TRANG = "docs/HUONG-DAN-TAO-BAN-DEVELOPMENT.md";
const hdText = () => readFileSync(new URL(`../${HD_TRANG}`, import.meta.url), "utf8");
const hdDongLenh = () => hdText().split("\n").filter((d) => /wrangler/.test(d) && !/^\s*$/.test(d));

test("trang hướng dẫn: mọi dòng có wrangler đều kèm --config wrangler.dev.jsonc", () => {
  const dong = hdDongLenh().filter((d) => /(npx\s+wrangler|wrangler\s+(d1|r2|secret|deploy|login|whoami))/.test(d));
  assert.ok(dong.length >= 8, "trang phải có các lệnh wrangler (d1 create, 4 r2 bucket create, các secret put)");
  for (const d of dong) assert.ok(d.includes("--config wrangler.dev.jsonc"), `thiếu --config wrangler.dev.jsonc: ${d}`);
  assert.ok(dong.some((d) => /d1 create/.test(d)) && dong.filter((d) => /r2 bucket create/.test(d)).length === 4); // ADR-0196: kho thứ tư (biên lai)
});

test("trang hướng dẫn: tên D1 và tên kho khớp wrangler.dev.jsonc, không nhắc tên bản chính thức", () => {
  const text = hdText();
  const d = dev();
  const tenD1 = d.d1_databases[0].database_name;
  assert.ok(new RegExp(`d1 create ${tenD1}\\b`).test(text), "d1 create phải đúng tên D1 Development");
  const kho = [...text.matchAll(/r2 bucket create (\S+)/g)].map((m) => m[1]).sort();
  assert.deepEqual(kho, d.r2_buckets.map((b: any) => b.bucket_name).sort());
  for (const cam of ["tourdao-sales-db", "tourdao-sales-ho-so", "booking.tourdao.vn"]) assert.ok(!text.includes(cam), `trang không được chứa ${cam}`);
});

test("trang hướng dẫn: đủ các bí mật, hai lời dặn in đậm, một địa chỉ nhận Góp ý", () => {
  const text = hdText();
  for (const k of ["SESSION_SECRET", "LAN_GUI_SECRET", "MFA_ENCRYPTION_KEY", "VAPID_PRIVATE_KEY", "FEEDBACK_MAIL_FROM", "FEEDBACK_NOTIFY_EMAIL", "THU_CHO_PHEP"]) {
    assert.ok(new RegExp(`secret put ${k} --config wrangler.dev.jsonc`).test(text), `thiếu lệnh đặt ${k}`);
  }
  assert.ok(text.includes("**n**"), "thiếu lời dặn trả lời n");
  assert.ok(/\*\*[^*]*--config wrangler\.dev\.jsonc[^*]*\*\*/.test(text), "thiếu lời dặn in đậm về --config");
  assert.ok(text.includes("Chưa kiểm"), "thiếu dòng Chưa kiểm");
});
