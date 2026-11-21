#!/bin/sh
# CHROME_BIN cho lượt kiểm trên máy GitHub (Linux, ubuntu-latest) — dùng ở phần riêng của .github/workflows/kiem.yml cho lệnh đo khung gốc
# (scripts/giao-dien/do-khung-ci.mjs). Máy Mac vẫn dùng scripts/chrome-tu-dong-dong.sh (đường dẫn Chrome macOS + tự đóng khi cha chết); máy GitHub là máy
# dùng một lần nên không cần bộ canh mồ côi. --no-sandbox: Ubuntu 24.04 chặn không gian tên người dùng không đặc quyền mà hộp cát của Chrome cần.
# Chỉ mở trang của máy thử tạm 127.0.0.1 (lệnh đo từ chối địa chỉ khác).
CHROME="${CHROME_THAT:-$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser)}"
if [ -z "$CHROME" ]; then echo "chrome-ci.sh: không thấy Chrome trên máy (google-chrome / chromium)" >&2; exit 127; fi
exec "$CHROME" --no-sandbox --disable-dev-shm-usage "$@"
