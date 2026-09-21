#!/usr/bin/env bash
# Khởi tạo một repo dự án mới từ playbook nguồn.
# Dùng: ./init-project.sh ten-du-an
set -euo pipefail

NAME="${1:?Thiếu tên dự án. Dùng: ./init-project.sh ten-du-an}"
SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="$(dirname "$SRC")/$NAME"

if [ -e "$DEST" ]; then echo "Đã tồn tại: $DEST"; exit 1; fi

echo "Tạo dự án: $DEST"
mkdir -p "$DEST"/{project/adr,docs/architecture-diagrams,src/web,src/api,.github/workflows,.specify/memory,.specify/specs}

# 1. Copy playbook nguồn kèm version (đọc tham chiếu, không sửa)
cp -R "$SRC" "$DEST/playbook"
rm -rf "$DEST/playbook/.git" "$DEST/playbook/project"   # không mang lịch sử git và file dự án khác vào bản pin
VER="$(git -C "$SRC" describe --tags --always 2>/dev/null || echo 'unknown')"
echo "Pinned playbook version: $VER ($(date +%F))" > "$DEST/playbook/.PINNED_VERSION"

# 2. Hiến pháp: symlink, KHÔNG copy (một nguồn sự thật)
ln -s "../../playbook/CONSTITUTION.md" "$DEST/.specify/memory/constitution.md"

# 3. 10 template để ĐIỀN, copy từ templates (9 artifact bước 0-8 + overlay Lớp 2)
cp "$SRC"/templates/*.md "$DEST/project/"
mv "$DEST/project/03-ADR-0001-template.md" "$DEST/project/adr/0001-template.md"
mv "$DEST/project/09-PROJECT_OVERLAY.md" "$DEST/project/PROJECT_OVERLAY-$NAME.md"

# 4. File khởi tạo cho dự án
cat > "$DEST/project/DRIFT_LOG.md" << 'INNER'
# DRIFT LOG — Sai lệch giữa code và spec
| Ngày | Chỗ lệch | Spec nói | Code đang làm | Kế hoạch kéo về |
|------|----------|----------|---------------|------------------|
INNER
touch "$DEST/project/adr/.gitkeep" "$DEST/docs/architecture-diagrams/.gitkeep" "$DEST/.specify/specs/.gitkeep"

cat > "$DEST/.github/CODEOWNERS" << 'INNER'
# Mặc định chủ dự án sở hữu mọi thứ
* @owner
INNER
cat > "$DEST/.github/SECURITY.md" << 'INNER'
# Security
Báo lỗ hổng riêng tư cho chủ dự án. Chính sách: playbook/governance/policies/security.md
INNER

cat > "$DEST/README.md" << INNER
# $NAME
Dự án khởi tạo từ AI Web Playbook (pinned: $VER).
- Luật và quy trình: thư mục \`playbook/\` (chỉ đọc).
- Artifact đặc tả của dự án: thư mục \`project/\` (điền vào đây, đi từ 00 đến 08).
- Mã nguồn: \`src/\`.
INNER

echo "Xong. Bước tiếp: điền project/00-PROJECT_BRIEF.md trước tiên."
