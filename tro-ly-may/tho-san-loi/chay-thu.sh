#!/usr/bin/env bash
# Lượt chạy thử «Thợ săn lỗi» (ADR-0145): đóng gói mã main đã che, HỎI rồi mới tải lên Anthropic, mở MỘT phiên có trần ~$10.
# Chạy SAU khi đã `ant apply` agent.md + environment.yaml (tro-ly-may/README.md, bước 4). Lệnh này tốn tiền và gửi mã ra ngoài:
# chỉ chủ dự án chạy, sau khi duyệt ADR-0145.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
THU_MUC=tro-ly-may/tho-san-loi
GOI="${TMPDIR:-/tmp}/tourdao-ma-nguon.tar.gz"
FILE_ID=""
SID=""

# Khi thoát vì bất cứ lý do gì: xoá gói tạm; đã tải tệp lên mà chưa mở được phiên thì in mã tệp để dọn.
don_dep() {
  rm -f "$GOI"
  if [ -n "$FILE_ID" ] && [ -z "$SID" ]; then
    echo "Đã tải tệp lên nhưng chưa mở được phiên. Mã tệp cần dọn: $FILE_ID — báo AI mã này." >&2
  fi
}
trap don_dep EXIT

# Mã của một tài nguyên trong claude-lock.json (do `ant apply` ghi), tra theo đường dẫn tệp.
ma_trong_lock() {
  node -e '
    const fs = require("node:fs");
    if (!fs.existsSync("claude-lock.json")) { console.error("Chưa có claude-lock.json: chạy bước 4 của tro-ly-may/README.md trước."); process.exit(1); }
    const r = JSON.parse(fs.readFileSync("claude-lock.json", "utf8")).resources ?? {};
    const k = Object.keys(r).find((k) => k.replace(/^\.\//, "") === process.argv[1]);
    if (!k) { console.error(`claude-lock.json chưa có ${process.argv[1]}: chạy bước 4 của tro-ly-may/README.md trước.`); process.exit(1); }
    console.log(r[k].id);
  ' "$1"
}
AGENT_ID=$(ma_trong_lock "$THU_MUC/agent.md")
ENV_ID=$(ma_trong_lock "$THU_MUC/environment.yaml")

node scripts/goi-ma-tro-ly-may.mjs --ra "$GOI"
echo
read -r -p "Gửi gói này lên Anthropic và mở phiên (trần khoảng \$10)? Gõ y rồi Enter để gửi, phím khác để thôi: " DONG_Y
if [ "$DONG_Y" != "y" ]; then
  echo "Đã thôi, không gửi gì."
  exit 0
fi

FILE_ID=$(ant beta:files upload --file "$GOI" --transform id -r)
echo "Đã tải tệp mã lên: $FILE_ID"
SID=$(ant beta:sessions create \
  --agent "$AGENT_ID" \
  --environment-id "$ENV_ID" \
  --resource "{type: file, file_id: $FILE_ID, mount_path: /ma-nguon.tar.gz}" \
  --transform id -r < "$THU_MUC/session.yaml")

echo
echo "Đã mở phiên: $SID (tệp mã: $FILE_ID — giữ hai mã này để dọn sau)."
echo "Xem trên Console: https://platform.claude.com/workspaces/default/sessions/$SID"
echo "  (khoá của bạn không thuộc workspace «Default» thì thay chữ default bằng mã workspace trên thanh địa chỉ Console)"
echo "Hoặc xem ngay trong Terminal: ant beta:sessions connect $SID"
