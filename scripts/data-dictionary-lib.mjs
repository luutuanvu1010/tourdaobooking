// Sinh docs/DATA-DICTIONARY.md từ docs/data-dictionary.json (nguồn sự thật duy nhất — ADR-0002 điều 1).
// Hàm thuần: dùng cho scripts/gen-data-dictionary.mjs và cho bài kiểm src/architecture.test.ts (tài liệu sinh ra phải khớp tệp đang có).

export function renderDictionaryMarkdown(dict) {
  const out = [
    "# Sổ dữ liệu",
    "",
    "> **Sinh tự động** từ `docs/data-dictionary.json` bằng `npm run dict` — không sửa tay. Bài kiểm `src/architecture.test.ts` báo lỗi nếu tệp này lệch.",
    "",
  ];
  for (const module of dict.modules) {
    const tables = dict.tables.filter((t) => t.module === module);
    const views = dict.views.filter((v) => v.module === module);
    if (tables.length === 0 && views.length === 0) continue;
    out.push(`## ${module}`, "", "| Đối tượng | Loại | Ghi chú |", "|---|---|---|");
    for (const t of tables) {
      const notes = [
        t.legacy ? "tên cũ, giữ nguyên (ADR-0002 điều 2)" : null,
        t.deprecatedColumns?.length ? `cột chết: ${t.deprecatedColumns.join(", ")}` : null,
        ...(t.logicalRefs ?? []).map((r) => `tham chiếu logic \`${r.column}\` → \`${r.toTable}\` qua view \`${r.viaView}\`, không khoá ngoại (${r.note})`),
      ].filter(Boolean);
      out.push(`| \`${t.name}\` | ${t.kind === "lookup" ? "bảng tra cứu" : "bảng"} | ${notes.join("; ")} |`);
    }
    for (const v of views) out.push(`| \`${v.name}\` | view công bố | cột: ${v.columns.join(", ")} |`);
    out.push("");
  }
  out.push("## Cạnh toàn vẹn (khoá ngoại có sẵn, không phải phụ thuộc mã — ADR-0002 điều 6)", "");
  for (const e of dict.integrityEdges) out.push(`- \`${e.fromTable}\` → \`${e.toTable}\` — ${e.note}`);
  out.push("");
  return out.join("\n");
}
