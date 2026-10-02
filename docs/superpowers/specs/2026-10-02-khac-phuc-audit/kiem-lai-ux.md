# Kiểm lại thử nghiệp vụ 100 tình huống (1→2/10) trên main mới — 2026-10-02 chiều

**Người kiểm:** trợ lý con, vai kiểm (chỉ đọc kho, không sửa/commit gì trong kho).
**Mã:** worktree `quyet-dinh-thu-nghiep-vu`, HEAD = `main` = `origin/main` = `fc268abe` (lần chạy cũ: `0ba370d6`, cách 95 commit).
**Môi trường:** 10 bản Nền tảng tạm (D1 cục bộ TẠM trong `$TMPDIR/tourdao-ux-*`, `wrangler dev` cục bộ, Turnstile/Face ID/Web Push tắt, trợ lý AI trỏ cổng chết) — dựng bằng bản chép `may-chu.mjs` với `ROOT` = worktree. **Không** `--remote`, không gọi booking.tourdao.vn. Chạy 15:58–16:00 giờ VN (lần cũ ~23:30–00:30).

## 1. Kết luận ngắn
- **Mọi tình huống ❌ / MẤT TIỀN / MẤT VÉ / ⚠️ (59 dòng gắn cờ) đều cho KẾT QUẢ Y HỆT lần cũ** sau khi chuẩn hoá mã đơn, ngày, SĐT, chuỗi ngẫu nhiên. Không tình huống nào ĐÃ HẾT; không tình huống nào KHÔNG CHẠY ĐƯỢC (0 dòng ⏸, 0 `fetch failed`).
- Lý do: 95 commit từ `0ba370d6` → `fc268abe` **không đụng `src/modules/billing/`**, không thêm khoá chống gửi lặp, không đổi cách tính "phải thu" đơn huỷ, không đổi bên đặt của đơn Đối tác. Thay đổi chủ yếu: giao diện công ty / Trang chủ, chính sách đăng nhập, giấy tờ xe, đếm "thân cũ" (ADR-0047 §6).
- **Gốc G1–G6: cả 6 gốc mã còn nguyên trên main**, số dòng báo cáo dẫn vẫn đúng.
- Khác biệt số liệu giữa hai lần (tổng "đang giữ", số đơn hàng chờ, ô "Còn thiếu tiền") là do máy cũ đã tích dữ liệu của các lần chạy trước; máy mới sạch. Không phải đổi hành vi.
- So thêm **cả 100 dòng** (kể cả ✅): 46 giống hệt sau chuẩn hoá, phần còn lại chỉ khác mã chuyến/biển số/số tích luỹ — **trừ tình huống 35** (mốc 6 giờ): "Lách 1" nay bị chặn bằng 400 `invalid_input` ("ngày đón phải từ … sớm nhất 1 ngày trước ngày đi") thay vì 409 `short_notice_required` — do **giờ chạy** (16:00 thay vì 23:48 làm giờ đón +3 giờ rơi trước khung ngày đón), không do mã đổi; vẫn bị chặn, kết luận ⚖️ giữ nguyên. QT02, 34, DT03 giống hệt.

## 2. Bảng tình huống (gắn cờ ❌ / MẤT TIỀN / MẤT VÉ / ⚠️)
"Nhãn cũ" = nhãn nặng nhất trong `ket_luan` cũ. "Nay": VẪN LỖI (cùng hành vi), ĐÃ HẾT, KẾT QUẢ CŨ SAI, KHÔNG CHẠY ĐƯỢC.

| Mã | Nhãn cũ / nguy cơ | Nay | Bằng chứng ngắn (lần chạy mới) |
|---|---|---|---|
| 09 | ❌ (G1) | VẪN LỖI | Kịch bản tối giản `kiem-lai-09`: đơn 200.000, cọc 50.000, huỷ → sổ `{phaiThu:200000,daThu:50000,conLai:150000,du:0}`, biên nhận "Đã huỷ" còn lại 150.000. Nhóm-1 09: ghi thêm lần thu 10.000 **sau khi huỷ** → 201 |
| 26 | ❌ (G1) | VẪN LỖI | huỷ: phải thu 200000, đã thu 60000, còn lại 140000, dư 0; sổ Kế toán nhắc đơn 0 lần; ghi thêm thu vào đơn huỷ 201 |
| HD06 | ❌ MẤT TIỀN (G1) | VẪN LỖI | biến thể huỷ: phải thu 300.000/đã thu 300.000/dư 0; tin Kế toán 0 |
| HD08 | ⚠️+❌ MẤT VÉ (G1, G9) | VẪN LỖI | Từ chối → 404; "Huỷ" = huỷ đơn khách 200; xác nhận lại 409; cọc đơn huỷ: còn lại 100.000, dư 0 |
| QT05 | ❌ MẤT TIỀN (G1) | VẪN LỖI | đơn huỷ đã cọc 200.000: dư 0; GET /api/ledger không có đơn; QT hoàn 403 |
| 11 | ❌ (G2) | VẪN LỖI | gửi lặp / song song / huỷ-phía-khách rồi gửi lại: 201/201 → 2 đơn; `clientRequestId` bị bỏ qua |
| 12 | ❌ (G2) | VẪN LỖI | lần thu 60.000 gửi lại → 2 lần thu, đã thu 120.000, còn lại 80.000 |
| 13 | ⚠️ (G2) | VẪN LỖI | giống hệt cũ: 2 hồ sơ khách |
| HD10 | ✅+❌ MẤT TIỀN (G2) | VẪN LỖI (phần ❌) | "Ghi lần thu" gửi lại → 201, đã thu 400.000, sổ HDV giữ 400.000; lưới đỡ: Đã giao 409 "trả dư" tới khi Kế toán đảo. Phần "Đã giao kèm thu" chống lặp đúng (409) |
| KT03 | ❌ MẤT TIỀN (G2) | VẪN LỖI | hoàn 40.000 gửi lại → 201; đã thu 100.000→20.000; song song 201/201 |
| KT04 | ❌ MẤT TIỀN (G2, G4) | VẪN LỖI | nộp 500.000 khi giữ 200.000 → 201 + Hoàn thành 200 (sổ −300.000); nộp gửi lại → 201 (−200.000); nộp cho người không giữ → 201 |
| 15 | ⚠️ (G2 họ đồng thời) | VẪN LỖI | giống hệt cũ |
| 30 | ❌ (G3) | VẪN LỖI | đảo lần thu nhầm sau Đã giao 201 → ghi lại lần đúng 409 `order_delivered` → Hoàn thành 200 với còn lại 200000 |
| KD06 | ❌ MẤT TIỀN (G3) | VẪN LỖI | Y3: đảo, không điều chỉnh → Hoàn thành 200, còn lại 800.000đ; ghi lại 409 |
| DT05 | ⚠️ MẤT TIỀN (G3) | VẪN LỖI | Đối tác khai "Công ty thu – CK" khống → Đã giao 200; Kế toán đảo 201 → còn lại 200000, ghi lại 409 |
| 49 | ⚠️ (G3) | VẪN LỖI | giống hệt cũ |
| KT06 | ❌ MẤT TIỀN (G4) | VẪN LỖI | hoàn 100.000 rồi đảo lần thu gốc → đã thu −100.000, còn lại 300.000, biên nhận "đã trả −100.000" |
| KT05 | 🧩/⚠️ MẤT TIỀN (G4) | VẪN LỖI | giống hệt cũ (điều chỉnh lý do "." và 5 tỷ qua) |
| KT09 | ✅/⚠️ MẤT TIỀN (G4) | VẪN LỖI (phần ⚠️) | giống hệt cũ (hoàn sau Hoàn thành qua) |
| KT02 | ✅/⚠️ MẤT TIỀN (G4) | VẪN LỖI (phần ⚠️) | giống hệt cũ (hai người khai cùng một CK → Kế toán xác nhận cả hai → "dư" → hoàn) |
| KT10 | 🧩/⚠️ ĐIỂM MÙ (G4/G5) | VẪN LỖI | audit-invariants thoát 0 trong khi sổ có số dư âm (−5.000.000.000, −500.000…); 8/9 loại bất thường không có tín hiệu |
| 42 | ⚠️ (G4) | VẪN LỖI | giống hệt cũ (thu 100 triệu cho đơn 100 nghìn, không cảnh báo) |
| KT01 | ⚠️ ĐIỂM MÙ (G5) | VẪN LỖI | sổ không có dòng theo đơn, không mục "dư"/"đơn huỷ còn tiền" |
| KT08 | ⚠️ ĐIỂM MÙ (G5) | VẪN LỖI | giống hệt cũ |
| KD02/KD03 | ✅🧩 / ⚠️ (G5) | VẪN LỖI | giống hệt cũ |
| 45 | ❌ (G6) | VẪN LỖI | bên đặt = hồ sơ khách vai `CUSTOMER`, không CUSTOMER_OF; Quản trị Đã giao 200 |
| DT02 | ❌ MẤT TIỀN (G6) | VẪN LỖI | như 45 + Bán hàng tra thấy khách của Đối tác kèm SĐT; gắn hồ sơ Đối tác B → 201, lộ tên |
| QT04 | ⚠️ MẤT TIỀN (G7) | VẪN LỖI | QT thấy PIN mới, đăng nhập thay Kế toán, xác nhận + hoàn 500.000 dưới tên Kế toán |
| KT07, 02, 03, DT03, DT06 | ✅/⚠️ (G7) | VẪN LỖI | giống hệt cũ |
| KD08, QT06, DT08, 39, KD01, 34, QT02 | ⚠️/⚖️ MẤT VÉ (G8) | VẪN LỖI | giống hệt cũ (QT06: nhắc gọi khách 0→0 mục; đơn A KHÔNG) |
| 29, HD01, HD02, HD09, QT03, KD05, KD09, DT07, DT09 | ⚠️/✅ ĐIỂM MÙ / MẤT VÉ (G9) | VẪN LỖI | giống hệt cũ (HD02 vòng (c) thứ 3 nay 200 thay vì 409 — đua ngẫu nhiên, cùng kết cục "người phụ trách cuối: HDV B") |
| HD03, HD05, DT10, 06 | ✅/⚠️ MẤT TIỀN (G10) | VẪN LỖI | giống hệt cũ |
| KD04 | ⚖️ MẤT TIỀN (G11) | VẪN (theo quyết định) | giống hệt cũ |
| DT04, KD07, KD10, 10, 03 | ⚠️/🧩 | VẪN LỖI | giống hệt cũ |

KẾT QUẢ CŨ SAI: **không thấy dòng nào** — kết luận cũ tái hiện đúng. KHÔNG CHẠY ĐƯỢC: **0**.

## 3. Bảng gốc G1–G6 trên main `fc268abe`
| Gốc | Chỗ báo cáo dẫn | Còn đúng? | Ghi chú |
|---|---|---|---|
| G1 đơn huỷ còn tiền | `src/modules/orders/hoan-tat.ts:9-17,64` | CÒN | `phaiThuCua` không xét `status = cancelled`; `phaiThuNhieuDon` dòng 64 y nguyên. Nút "Ghi hoàn" chỉ khi `t.du > 0` (`web/order.ts:567`) → đơn huỷ không có nút hoàn trên màn. Thêm: máy chủ vẫn nhận **ghi lần thu vào đơn đã huỷ** (201) |
| G2 không chống gửi lặp | (F-02) | CÒN | không có khoá lần gửi nào ở orders/billing (grep `idempot`/`request_key`: chỉ feedback, thongbao). `src/modules/billing/` không đổi một dòng từ `0ba370d6` |
| G3 sửa sai sau Đã giao | `src/modules/billing/service.ts:218-222` | CÒN | `DA_GIAO` dòng 218, `ghiLanThu` chặn khi `deliveredAt` dòng 221–222. R-BIL-1 vẫn so "TẠI MỐC" (`scripts/audit-checks.mjs:226-229`) |
| G4 sổ thiếu ràng buộc | `service.ts:461-486`; trigger `0045:210-216` | CÒN | nhánh `dao_lan_thu` không kiểm "đã thu sau đảo ≥ 0"; trigger `refund_exceeds_paid` chỉ chạy ở INSERT lần hoàn. `audit-checks.mjs` đổi từ lần cũ chỉ ở R-VC-11, R-ORD-12, thêm R-AUT-SESSION-3 — không thêm kiểm sổ tiền |
| G5 Kế toán không có màn sổ | "không trang web gọi `GET /api/ledger` / `/mine`" | CÒN | grep `web/` trên main: chỉ `POST /api/ledger/balances`, `/unpaid-summary`, các lệnh ghi ở `order.ts`; không trang nào gọi `GET /api/ledger` hay `/api/ledger/mine`. `web/home.ts` đổi nhiều (Trang chủ mới) nhưng chỉ dùng `unpaid-summary` |
| G6 đơn Đối tác sai bên đặt | (báo cáo không dẫn tệp:dòng) | CÒN | gốc thật: `src/modules/orders/service.ts:396` — hồ sơ tạo khi lập đơn luôn mang vai `CUSTOMER`, không xét người lập là Đối tác, không tạo quan hệ CUSTOMER_OF |

## 4. Chỗ báo cáo cũ nói quá tay hoặc cần nói rõ
1. **Số 15 ❌ đúng** theo cách đếm "nhãn nặng nhất": HD08 và HD10 có ❌ bên trong nhãn ghép (dù mở đầu bằng ⚠️/✅). Không có chênh lệch đếm.
2. **"MẤT TIỀN: 23 kịch bản" là số đếm trường `nguy_co` — kịch bản NHẮM vào tiền, không phải 23 lần mất tiền được thấy.** Sáu dòng mang MẤT TIỀN mở đầu bằng ✅ ĐÚNG (HD03, HD05, HD10, KT02, KT07, KT09): đường chính bị chặn đúng, nhưng mỗi dòng vẫn còn một phát hiện ⚠️/❌ phụ (KT02 có đường thật để công ty hoàn số tiền chưa từng nhận). Các chuyển động sổ sai THẬT là những dòng ở mục 4–6 dưới đây.
3. **G1 gắn "MẤT TIỀN (khách)" là quá tay một nửa.** Trong Nền tảng, tiền cọc được ghi đúng là "đã thu"; không có đồng nào bị chuyển sai. Cái sai là: biên nhận đơn huỷ ghi "Còn lại 150.000" (hiển thị sai, gửi ra ngoài), không có dấu "cần hoàn", và **không có nút Ghi hoàn trên màn** cho đơn huỷ (Kế toán chỉ hoàn được qua API — tình huống 26 cho thấy route hoàn vẫn 201). Thiệt hại thật chỉ xảy ra nếu không ai nhớ hoàn ngoài hệ thống. Chủ đã quyết G1 (2/10) nên không cần bàn lại; chỉ ghi phân biệt.
4. **Mức thật của G2 khác nhau theo lệnh:**
   - 12 (thu ghi gấp đôi trước Đã giao): sổ báo "còn lại 80.000" thay vì 140.000 → HDV thu thiếu 60.000 ngoài đời = **mất tiền thật** nếu không ai phát hiện.
   - HD10 (thu ghi gấp đôi rồi Đã giao): **có lưới đỡ** — Đã giao bị chặn "khách trả dư" tới khi Kế toán đảo; nên là sổ sai tạm thời, không mất tiền.
   - KT03 (hoàn gửi lặp): một lần hoàn ngoài đời bị ghi thành hai → **sổ sai** (đã thu thấp hơn thật, sổ người giữ thấp hơn thật 40.000); chỉ thành mất tiền nếu ai đó theo sổ mà đòi/chi.
   - KT04 (nộp gửi lặp / nộp quá): sổ ghi công ty nợ HDV; mất tiền thật khi Kế toán "công ty trả" theo số sổ (kịch bản đã chứng minh đường này 201).
5. **G3 tình huống 30 / KD06** chủ yếu là **sổ không ghi lại được sự thật** (tiền CK thật đã về nhưng không ghi được sau Đã giao; đơn Hoàn thành với "còn lại" > 0). Mất tiền thật rõ nhất ở **DT05** (Đối tác khai khống CK, Đã giao qua, đảo xong không đòi được trong sổ) và **KD06 cặp 2** (HDV tin sổ "còn thu 0" nên không thu khách).
6. **G4 KT06 (đã thu âm) và KT04 (số dư âm) là sai sổ thật**, đúng như báo cáo.
7. Báo cáo §2 ghi "đã chạy lại 09 … HD10 cùng gốc với 12" — đúng; lần này mọi ❌ đều được chạy lại trực tiếp (không suy theo gốc).

## 5. Điều chưa chạy được / giới hạn
- Không có dòng ⏸. Mọi tình huống chạy tầng API (như lần cũ), **không bấm giao diện**; các khẳng định về nút/màn (nút hoàn `web/order.ts:567`, G5) là đọc mã, chưa thử giao diện.
- Nhãn `ket_luan` phần lớn do kịch bản **tính từ quan sát** (ví dụ `trung ? "❌…" : "✅ ĐÚNG"` ở nhom-2), nhưng phần chữ kèm theo viết sẵn; vì vậy kết luận "VẪN LỖI" dựa trên so `thuc_te` (mã HTTP + số tiền) đã chuẩn hoá, không dựa vào nhãn.
- Một số kịch bản có câu chữ cứng (ví dụ "máy 2" trong KT10) — chỉ là chữ, lệnh chạy đúng `E2E_PERSIST_TO` của máy mới.
- Giờ chạy khác (16:00 thay vì ~00:00); không tình huống mốc 6 giờ nào đổi kết quả.
- Chưa có người kiểm độc lập thứ hai cho chính lần kiểm này.

## 6. Lệnh đã dùng (đứng ở worktree)
```
# chuẩn bị: chép kịch bản + may-chu.mjs ra tmp, trỏ ROOT/import về worktree, OUT về tmp
bash /Users/tuanbao/.claude/jobs/2270daa1/tmp/kiem-lai-ux/chuan-bi.sh
# bật 10 máy tạm (D1 cục bộ tạm)
node /Users/tuanbao/.claude/jobs/2270daa1/tmp/kiem-lai-ux/may-chu.mjs 10 may-chu
# chạy 10 kịch bản song song, mỗi kịch bản một máy (nhom-1..5 → k1..5; vai-kd,kt,qt,hd,dt → k6..10)
bash /Users/tuanbao/.claude/jobs/2270daa1/tmp/kiem-lai-ux/chay-tat-ca.sh
# G1 tối giản
E2E_BASE_URL=<k1> E2E_PERSIST_TO=<k1> node .../kich-ban/kiem-lai-09.mjs
# so sánh cũ/mới
node .../so-sanh-chuan.cjs   # chuẩn hoá rồi so token
node .../so-sanh.cjs <mã,...> <độ dài>
# đối chiếu mã
git diff --stat 0ba370d6 main -- src/ migrations/ scripts/ web/ tests/e2e/
grep -rn "/api/ledger" web/ ; sed -n 1,80p src/modules/orders/hoan-tat.ts ; sed -n 205,230p,455,490p src/modules/billing/service.ts
# dọn
kill -TERM <pid may-chu.mjs>   # bộ dọn của may-chu tắt nhóm tiến trình wrangler của nó + xoá thư mục D1 tạm
```
Tệp: kết quả mới `tmp/kiem-lai-ux/kich-ban/*.ket-qua.jsonl`; kết quả cũ chép `tmp/kiem-lai-ux/cu/`; log chạy `tmp/kiem-lai-ux/log/`; so sánh `tmp/kiem-lai-ux/so-sanh.txt`, `so-sanh-chuan.txt`.

## 7. Dọn dẹp
- Đã dừng `may-chu.mjs` (SIGTERM theo PID riêng) → 10 `wrangler dev` tắt, thư mục `tourdao-ux-*` đã xoá; không còn tiến trình wrangler/workerd nào.
- Lúc bắt đầu có một `wrangler dev` cổng 50021 của phiên khác (worktree `thi-giac-nen-tang`, thư mục `tourdao-a2-*` — máy tạm của e2e); tôi **không đụng** nó; lúc kết thúc nó cũng đã tắt (nhiều khả năng lượt e2e đó chạy xong).
- `git status` worktree sạch; không sửa/commit gì trong kho. Thư mục `danh-gia-ux/2026-10-01/` không bị ghi (kịch bản chạy từ bản chép, OUT trỏ về tmp).
