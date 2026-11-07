// Bản Development (ADR-0162 Đ2): đặt MOI_TRUONG thì mọi thư đi qua bộ lọc THU_CHO_PHEP; bản chính thức (MOI_TRUONG vắng) không đổi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { cauHinhThu, guiThu } from "./shared/gui-thu.ts";
import { mailConfig } from "./modules/feedback/notify.ts";

function boGui() {
  const daGui: string[] = [];
  return { daGui, EMAIL: { send: async (m: { to: string }) => void daGui.push(m.to) } };
}
const thu = (to: string) => ({ to, subject: "s", html: "h" });
const logs = (): { dong: string[]; khoi: () => void } => {
  const dong: string[] = [];
  const cu = console.log, cw = console.warn, ce = console.error, ci = console.info;
  const ghi = (...a: unknown[]) => void dong.push(a.map(String).join(" "));
  console.log = console.warn = console.error = console.info = ghi;
  return { dong, khoi: () => { console.log = cu; console.warn = cw; console.error = ce; console.info = ci; } };
};

test("không MOI_TRUONG: mailer chính là env.EMAIL, không bọc", () => {
  const b = boGui();
  assert.equal(cauHinhThu({ EMAIL: b.EMAIL, FEEDBACK_MAIL_FROM: "a@x.vn" }).mailer, b.EMAIL);
});

test("có MOI_TRUONG (giá trị nào cũng được): chỉ địa chỉ trong THU_CHO_PHEP tới bộ gửi, không phân biệt hoa thường", async () => {
  for (const mt of ["dev", "x", "production", 1, true]) {
    const b = boGui();
    const cfg = cauHinhThu({ EMAIL: b.EMAIL, FEEDBACK_MAIL_FROM: "f@x.vn", MOI_TRUONG: mt, THU_CHO_PHEP: "a@x.vn, B@x.vn" });
    assert.deepEqual(await guiThu(cfg, thu("b@x.vn")), { ok: true });
    assert.deepEqual(await guiThu(cfg, thu("c@x.vn")), { ok: true }, "bỏ thư nhưng không ném");
    assert.deepEqual(await guiThu(cfg, thu("a@x.vn,c@x.vn")), { ok: true });
    assert.deepEqual(b.daGui, ["b@x.vn"], `MOI_TRUONG=${String(mt)}`);
  }
});

test("THU_CHO_PHEP trống, trắng hoặc thiếu: không thư nào tới", async () => {
  for (const ds of [undefined, "", "  , ,", 5]) {
    const b = boGui();
    const cfg = cauHinhThu({ EMAIL: b.EMAIL, FEEDBACK_MAIL_FROM: "f@x.vn", MOI_TRUONG: "dev", THU_CHO_PHEP: ds });
    await guiThu(cfg, thu("a@x.vn"));
    assert.deepEqual(b.daGui, []);
  }
});

test("có MOI_TRUONG mà thiếu EMAIL: vẫn không có bộ gửi (tính năng thư tự tắt)", () => {
  assert.equal(cauHinhThu({ MOI_TRUONG: "dev", THU_CHO_PHEP: "a@x.vn" }).mailer, undefined);
});

test("dòng log khi bỏ thư không chứa địa chỉ", async () => {
  const b = boGui();
  const cfg = cauHinhThu({ EMAIL: b.EMAIL, FEEDBACK_MAIL_FROM: "f@x.vn", MOI_TRUONG: "dev", THU_CHO_PHEP: "a@x.vn" });
  const l = logs();
  try {
    await guiThu(cfg, thu("khach.bi.mat@example.com"));
  } finally {
    l.khoi();
  }
  assert.ok(l.dong.length >= 1, "phải có ghi log khi bỏ thư");
  for (const d of l.dong) assert.ok(!/@|khach\.bi\.mat|example\.com/.test(d), d);
});

test("mailConfig của Góp ý lấy bộ gửi đã lọc", async () => {
  const b = boGui();
  const env = { EMAIL: b.EMAIL, FEEDBACK_MAIL_FROM: "f@x.vn", FEEDBACK_NOTIFY_EMAIL: "n@x.vn", MOI_TRUONG: "dev", THU_CHO_PHEP: "ok@x.vn" } as never;
  const c = mailConfig(env);
  assert.equal(c.to, "n@x.vn");
  assert.equal(c.from, "f@x.vn");
  await c.mailer!.send({ to: "n@x.vn", from: "f@x.vn", subject: "s", html: "h" });
  await c.mailer!.send({ to: "ok@x.vn", from: "f@x.vn", subject: "s", html: "h" });
  assert.deepEqual(b.daGui, ["ok@x.vn"]);
  const chinh = mailConfig({ EMAIL: b.EMAIL } as never);
  assert.equal(chinh.mailer, b.EMAIL);
});

test("quét src/ (trừ test): chỉ src/shared/gui-thu.ts đụng env.EMAIL", () => {
  const khop: string[] = [];
  const duyet = (dir: string): void => {
    for (const ten of readdirSync(dir)) {
      const p = join(dir, ten);
      if (statSync(p).isDirectory()) duyet(p);
      else if (p.endsWith(".ts") && !p.endsWith(".test.ts") && /\b(?:env|e)\.EMAIL\b/.test(readFileSync(p, "utf8"))) khop.push(p);
    }
  };
  duyet("src");
  assert.deepEqual(khop, [join("src", "shared", "gui-thu.ts")]);
});
