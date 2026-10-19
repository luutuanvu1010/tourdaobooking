#!/bin/sh
# Dùng làm CHROME_BIN cho kịch bản Chrome: chạy Chrome như chrome-wrap.sh (cùng đối số, đường dẫn Chrome của macOS) NHƯNG tự đóng Chrome khi
# tiến trình cha (node của kịch bản) chết — sập, hết giờ, bị dừng, kể cả SIGKILL — để không để lại Chrome mồ côi chạy hàng chục giờ.
#   CHROME_BIN="$PWD/scripts/chrome-tu-dong-dong.sh" node docs/evidence/…/kịch-bản.mjs
# Biến CHROME_THAT đổi Chrome thật (chỉ để thử bằng tiến trình giả; mặc định Chrome macOS). CHROME_CANH_GIAY đổi chu kỳ canh (mặc định 2 giây).
# Giới hạn: macOS không có prctl(PR_SET_PDEATHSIG) nên đây là canh theo chu kỳ (Chrome sống thêm tối đa ~chu kỳ canh sau khi cha chết); nếu cả
# bộ canh bị SIGKILL cùng lúc thì không còn ai dọn — lưới cuối là `npm run don-may`.
# An toàn pid: macOS cấp lại pid tuần tự rất nhanh. Trước khi gửi tín hiệu cho một pid, đối chiếu lại "giờ khởi chạy + dòng lệnh" với bản đã ghi
# lúc nhận dạng; khác ⇒ pid đã thuộc tiến trình khác ⇒ KHÔNG gửi.
CHROME="${CHROME_THAT:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
CANH="${CHROME_CANH_GIAY:-2}"
WRAP=$$
CHA=$PPID
SIGCON=""

# Chữ ký một pid: giờ khởi chạy + dòng lệnh (rỗng nếu pid không còn).
chu_ky() { ps -ww -o lstart=,command= -p "$1" 2>/dev/null; }

# Mọi hậu duệ của pid $1, in "pid|chữ ký" mỗi dòng (một lần gọi ps để dựng cây; không dùng nhóm tiến trình vì Chrome tự tách nhóm).
hau_due() {
  ps -axo pid=,ppid= | awk -v root="$1" '{ p[$1] = $2; n[++k] = $1 }
    END { s[root] = 1; ch = 1
          while (ch) { ch = 0; for (i = 1; i <= k; i++) { id = n[i]; if (!(id in s) && (p[id] in s)) { s[id] = 1; ch = 1 } } }
          for (id in s) if (id != root) print id }' | while read -r id; do printf '%s|%s\n' "$id" "$(chu_ky "$id")"; done
}

# Gửi tín hiệu $1 cho các "pid|chữ ký" trong $2 CHỈ khi chữ ký hiện tại còn khớp.
gui_neu_khop() {
  printf '%s\n' "$2" | while IFS='|' read -r id ck; do
    [ -n "$id" ] || continue
    [ -n "$ck" ] && [ "$(chu_ky "$id")" = "$ck" ] && kill "-$1" "$id" 2>/dev/null
  done
  return 0
}

giet_cay() {
  # Chữ ký Chrome chính: bản ghi lúc canh (sau khi đã exec thành Chrome); chưa có (bị TERM quá sớm) thì lấy ngay bây giờ — con của chính ta nên pid chưa thể bị cấp lại.
  [ -n "$SIGCON" ] || SIGCON="$CON|$(chu_ky "$CON")"
  CAY="$SIGCON
$(hau_due "$CON")"
  gui_neu_khop TERM "$CAY"
  sleep 1
  gui_neu_khop KILL "$CAY"
  return 0
}

"$CHROME" "$@" &
CON=$!

# Bộ canh chạy nền: bộ bọc còn sống và vẫn do CHA sinh ra thì thôi; bộ bọc chết, hoặc đã được launchd nhận (cha chết) thì dọn Chrome.
(
  while :; do
    sleep "$CANH"
    kill -0 "$CON" 2>/dev/null || exit 0
    [ -n "$SIGCON" ] || SIGCON="$CON|$(chu_ky "$CON")"
    if ! kill -0 "$WRAP" 2>/dev/null; then giet_cay; exit 0; fi
    PP=$(ps -o ppid= -p "$WRAP" 2>/dev/null | tr -d ' ')
    [ -n "$PP" ] || continue # ps lỗi tạm thời: KHÔNG coi là cha đã chết, thử lại vòng sau
    if [ "$PP" != "$CHA" ]; then giet_cay; exit 0; fi
  done
) &
WD=$!

# Bị TERM/INT/HUP (ví dụ kịch bản gọi chrome.kill()) thì giết cả cây Chrome, không chỉ bộ bọc.
trap 'kill "$WD" 2>/dev/null; giet_cay; exit 143' TERM INT HUP

wait "$CON"
MA=$?
kill "$WD" 2>/dev/null
exit "$MA"
