#!/bin/sh
# Dùng làm CHROME_BIN cho kịch bản Chrome: chạy Chrome như chrome-wrap.sh (cùng đối số, đường dẫn Chrome của macOS) NHƯNG tự đóng Chrome khi
# tiến trình cha (node của kịch bản) chết — sập, hết giờ, bị dừng, kể cả SIGKILL — để không để lại Chrome mồ côi chạy hàng chục giờ.
#   CHROME_BIN="$PWD/scripts/chrome-tu-dong-dong.sh" node docs/evidence/…/kịch-bản.mjs
# Biến CHROME_THAT đổi Chrome thật (chỉ để thử bằng tiến trình giả; mặc định Chrome macOS). CHROME_CANH_GIAY đổi chu kỳ canh (mặc định 2 giây).
# Giới hạn: macOS không có prctl(PR_SET_PDEATHSIG) nên đây là canh theo chu kỳ (Chrome sống thêm tối đa ~chu kỳ canh sau khi cha chết); nếu cả
# bộ canh bị SIGKILL cùng lúc thì không còn ai dọn — lưới cuối là `npm run don-may`.
CHROME="${CHROME_THAT:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
CANH="${CHROME_CANH_GIAY:-2}"
WRAP=$$
CHA=$PPID

# Mọi hậu duệ của pid $1 (một lần gọi ps; không dùng nhóm tiến trình vì Chrome tự tách nhóm cho tiến trình phụ).
hau_due() {
  ps -axo pid=,ppid= | awk -v root="$1" '{ p[$1] = $2; n[++k] = $1 }
    END { s[root] = 1; ch = 1
          while (ch) { ch = 0; for (i = 1; i <= k; i++) { id = n[i]; if (!(id in s) && (p[id] in s)) { s[id] = 1; ch = 1 } } }
          for (id in s) if (id != root) print id }'
}

giet_cay() {
  DS=$(hau_due "$CON")
  # shellcheck disable=SC2086
  kill -TERM "$CON" $DS 2>/dev/null
  sleep 1
  # shellcheck disable=SC2086
  kill -KILL "$CON" $DS 2>/dev/null
  return 0
}

"$CHROME" "$@" &
CON=$!

# Bộ canh chạy nền: bộ bọc còn đó và vẫn do CHA sinh ra thì thôi; ngược lại (cha chết ⇒ bộ bọc được launchd nhận, hoặc bộ bọc bị giết) thì dọn Chrome.
(
  while :; do
    sleep "$CANH"
    PP=$(ps -o ppid= -p "$WRAP" 2>/dev/null | tr -d ' ')
    if [ "$PP" != "$CHA" ]; then giet_cay; exit 0; fi
    kill -0 "$CON" 2>/dev/null || exit 0
  done
) &
WD=$!

# Bị TERM/INT/HUP (ví dụ kịch bản gọi chrome.kill()) thì giết cả cây Chrome, không chỉ bộ bọc.
trap 'kill "$WD" 2>/dev/null; giet_cay; exit 143' TERM INT HUP

wait "$CON"
MA=$?
kill "$WD" 2>/dev/null
exit "$MA"
