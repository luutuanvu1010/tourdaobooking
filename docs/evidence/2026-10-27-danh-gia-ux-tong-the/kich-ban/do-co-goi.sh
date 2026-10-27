#!/bin/sh
# Đo cỡ gói tĩnh từng trang (thô và gzip), phông, CSS; kiểm HTML có preload/prefetch/speculation/view-transition. Chỉ đọc.
cd "$1" || exit 1
printf "%-28s %8s %8s\n" "tệp" "thô" "gzip"
for f in public/js/*.js; do
  tho=$(wc -c < "$f")
  gz=$(gzip -c "$f" | wc -c)
  printf "%-28s %8d %8d\n" "$(basename "$f")" "$tho" "$gz"
done | sort -k2 -n -r
printf "%-28s %8d %8d\n" app.css "$(wc -c < public/app.css)" "$(gzip -c public/app.css | wc -c)"
printf "%-28s %8d %8d\n" sw.js "$(wc -c < public/sw.js)" "$(gzip -c public/sw.js | wc -c)"
echo "--- phông ---"
ls -l public/fonts/ 2>/dev/null | awk 'NR>1 {printf "%-28s %8d\n", $NF, $5; s+=$5} END {print "tổng phông byte:", s}'
echo "--- phông app.css khai @font-face ---"
grep -c "@font-face" public/app.css
grep -o "fonts/[A-Za-z0-9_.-]*\.woff2" public/app.css | sort -u
echo "--- HTML: preload/prefetch/speculationrules/view-transition/modulepreload ---"
grep -l 'rel="preload"' public/*.html | wc -l
grep -l 'rel="modulepreload"' public/*.html | wc -l
grep -l 'rel="prefetch"' public/*.html | wc -l
grep -l 'speculationrules' public/*.html | wc -l
grep -c "view-transition" public/app.css
echo "--- HTML cỡ ---"
wc -c public/*.html | tail -1
echo "--- script tag mỗi HTML (defer/module) ---"
grep -ho '<script[^>]*>' public/*.html | sort | uniq -c | sort -rn | head -12
echo "--- thẻ link css mỗi HTML ---"
grep -ho '<link[^>]*stylesheet[^>]*>' public/*.html | sort | uniq -c | sort -rn | head -5
