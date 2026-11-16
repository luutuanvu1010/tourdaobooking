// Khôi phục D1 từ bản xuất (docs/KHOI-PHUC-DU-LIEU.md; lịch sử: docs/superpowers/specs/2026-09-22-dien-tap-khoi-phuc.md). Bản xuất NGUYÊN KHỐI (`wrangler d1 export`) KHÔNG nạp lại được
// vào D1 trống: bảng tạo theo thứ tự lịch sử và dữ liệu chèn ngay sau từng bảng, mà `staff.party_id` (thêm ở 0012) trỏ `pty_party` (tạo ở 0011, đứng SAU
// `staff` trong tệp) → "no such table: main.pty_party", cả lần nạp bị huỷ (đã thử trên D1 local 2026-09-22). Cách đã chạy được: xuất schema (`--no-data`)
// và dữ liệu (`--no-schema`) riêng; tệp này tách schema theo TỪNG CÂU: trigger → tệp trigger; mọi câu khác (bảng, chỉ mục, view, PRAGMA) → tệp cấu trúc.
// Nạp: cấu trúc → dữ liệu → trigger (trigger nạp sau cùng, vì vd `order_service_frozen_insert` chặn chèn dịch vụ của đơn đã xác nhận).
//
// Tách bằng BỘ ĐỌC TỪ (16/11/2026, Đợt 2 sau kiểm toán): bản cũ coi dòng kết thúc bằng "END;" là hết trigger, nên trigger có `CASE … END;` giữa thân
// bị cắt đôi và một câu "END;" lạc vào tệp cấu trúc ⇒ nạp lỗi (diễn tập thử trên máy 16/11 bắt được). Nay: bỏ qua chuỗi '…', tên "…" `…` […],
// chú thích -- và /* */; trong trigger đếm BEGIN/CASE (+1) và END (−1); câu trigger hết ở dấu ';' khi độ sâu về 0 sau BEGIN đầu tiên.
// Dùng: node scripts/tach-ban-xuat-d1.mjs <schema.sql> <cau-truc.sql> <trigger.sql>
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Tách một tệp SQL thành từng câu (giữ nguyên chữ gốc, kể cả chú thích), mỗi câu kèm cờ `trigger`. Ném lỗi khi câu cuối chưa kết thúc. */
export function tachCau(sql) {
  const out = [];
  let start = 0, i = 0, depth = 0, sawBegin = false, words = [];
  const n = sql.length;
  const isWord = (c) => /[A-Za-z0-9_$]/.test(c);
  while (i < n) {
    const c = sql[i], d = sql[i + 1];
    if (c === "-" && d === "-") { const e = sql.indexOf("\n", i); i = e === -1 ? n : e + 1; continue; }
    if (c === "/" && d === "*") { const e = sql.indexOf("*/", i + 2); if (e === -1) throw new Error("chú thích /* chưa đóng"); i = e + 2; continue; }
    if (c === "'" || c === '"' || c === "`" || c === "[") {
      const close = c === "[" ? "]" : c;
      let j = i + 1;
      for (;;) {
        const e = sql.indexOf(close, j);
        if (e === -1) throw new Error(`chuỗi ${c} chưa đóng`);
        if (close !== "]" && sql[e + 1] === close) { j = e + 2; continue; } // '' hoặc "" thoát
        i = e + 1;
        break;
      }
      if (words.length < 4) words.push("#");
      continue;
    }
    if (isWord(c) && (i === 0 || !isWord(sql[i - 1]))) {
      let j = i;
      while (j < n && isWord(sql[j])) j++;
      const w = sql.slice(i, j).toUpperCase();
      if (words.length < 4) words.push(w);
      const trigger = words[0] === "CREATE" && (words[1] === "TRIGGER" || (["TEMP", "TEMPORARY"].includes(words[1]) && words[2] === "TRIGGER"));
      if (trigger) {
        if (w === "BEGIN") { depth++; sawBegin = true; }
        else if (w === "CASE") depth++;
        else if (w === "END") depth--;
      }
      i = j;
      continue;
    }
    if (c === ";") {
      const trigger = words[0] === "CREATE" && (words[1] === "TRIGGER" || (["TEMP", "TEMPORARY"].includes(words[1]) && words[2] === "TRIGGER"));
      if (!trigger || (sawBegin && depth === 0)) {
        let e = i + 1;
        if (sql[e] === "\n") e++;
        out.push({ text: sql.slice(start, e).replace(/^\n+/, ""), trigger });
        start = e; depth = 0; sawBegin = false; words = [];
      }
    }
    i++;
  }
  if (sql.slice(start).replace(/--[^\n]*/g, "").trim()) throw new Error(`câu cuối chưa kết thúc: ${sql.slice(start, start + 200)}`);
  return out;
}

/** Chia thành { cauTruc, trigger } (chuỗi). Kiểm chéo: số câu trigger = số chữ CREATE TRIGGER đứng đầu câu; không câu cấu trúc nào bắt đầu bằng END. */
export function tachBanXuat(sql) {
  const cau = tachCau(sql);
  const trig = cau.filter((c) => c.trigger), struct = cau.filter((c) => !c.trigger);
  const lac = struct.find((c) => /^\s*END\b/i.test(c.text));
  if (lac) throw new Error(`câu cấu trúc lạc «END»: ${lac.text.slice(0, 120)}`);
  return { cauTruc: struct.map((c) => c.text).join("\n") + "\n", trigger: trig.map((c) => c.text).join("\n") + "\n", soCauTruc: struct.length, soTrigger: trig.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [src, outStruct, outTrig] = process.argv.slice(2);
  const r = tachBanXuat(readFileSync(src, "utf8"));
  writeFileSync(outStruct, r.cauTruc);
  writeFileSync(outTrig, r.trigger);
  console.log(`câu cấu trúc: ${r.soCauTruc}; trigger: ${r.soTrigger}`);
}
