// Vỏ mỏng dùng chung cho scripts/day-len.mjs và scripts/trien-khai.mjs: bộ chạy lệnh thật, hỏi đáp qua terminal, kiểm TTY.
// Logic nằm ở scripts/release-lib.mjs (có test). Tệp này chỉ nối I/O thật — không có quyết định nào ở đây.
import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../", import.meta.url));

/** TTY thật = cả đầu vào lẫn đầu ra là terminal (AI gọi qua công cụ thì không). */
export const isTTY = Boolean(process.stdin.isTTY && process.stdout.isTTY);

export const log = (line) => console.log(line);

/** Mỗi câu hỏi một readline riêng, đóng ngay sau khi trả lời, để không tranh stdin với lệnh con chạy kiểu "hiện trực tiếp". */
export async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

/** run(cmd, args, { env, stream, tee }) → { code, stdout, stderr }. stream: hiện trực tiếp; tee: vừa hiện vừa bắt stdout. */
export function run(cmd, args, { env, stream = false, tee = false } = {}) {
  const fullEnv = { ...process.env, ...(env ?? {}) };
  if (tee) {
    return new Promise((resolve) => {
      const child = spawn(cmd, args, { cwd: ROOT, env: fullEnv, stdio: ["inherit", "pipe", "inherit"] });
      let stdout = "";
      child.stdout.on("data", (chunk) => {
        process.stdout.write(chunk);
        stdout += chunk;
      });
      child.on("error", (e) => resolve({ code: 127, stdout, stderr: String(e.message) }));
      child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr: "" }));
    });
  }
  const r = spawnSync(cmd, args, { cwd: ROOT, env: fullEnv, encoding: "utf8", stdio: stream ? "inherit" : ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  if (r.error) return { code: 127, stdout: "", stderr: String(r.error.message) };
  return { code: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}
