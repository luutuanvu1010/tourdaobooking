#!/usr/bin/env node
// `npm run len-demo` — CHỦ DỰ ÁN tự gõ (hàng rào chặn AI). Đưa mã đang có lên bản dùng thử demo.tourdao.vn (ADR-0223). Logic và bài kiểm: scripts/demo-lib.mjs.
import { readFileSync } from "node:fs";
import { lenDemo } from "./demo-lib.mjs";
import { isTTY, log, ROOT, run } from "./release-shell.mjs";

process.exitCode = await lenDemo({ run, log, isTTY, args: process.argv.slice(2), docTep: (ten) => readFileSync(new URL(ten, `file://${ROOT}`), "utf8") });
