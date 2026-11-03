# ADR-0145 — Trợ lý AI chạy trên máy chủ Anthropic (Managed Agents): chạy thử «Thợ săn lỗi» chỉ đọc

- **Trạng thái:** **accepted** — chủ dự án, chat 2026-10-28: *«Duyệt cả ba»*, trả lời câu «Bạn duyệt ADR-0145 với ba khuyến nghị không?» sau khi xem báo cáo cuối việc (kiểm độc lập lượt 3 ĐẠT). Ba khuyến nghị được duyệt: mã chỉ gửi cho lượt thử, đọc xong xoá phiên (Đ3, Đ5); trần $10 mỗi phiên, khuyến nghị trần tháng $30 (Đ4); trợ lý chỉ đọc, không khoá, không đẩy mã, không triển khai (Đ1, Đ2). AI soạn bản đề xuất cùng ngày sau khi chủ bấm «Chuẩn bị chạy thử». Lượt thử chỉ bắt đầu khi chủ **tự chạy lệnh** theo `tro-ly-may/README.md`; tới lúc duyệt chưa chạy gì trên mây.
- **Ngày:** 2026-10-28.
- **Loại:** công cụ làm việc của AI, có dữ liệu đi ra ngoài (việc lớn: luật + dữ liệu). **Cửa:** hỗn hợp — cấu hình gỡ được (xoá thư mục `tro-ly-may/`, lưu trữ trợ lý trên Console); bản mã đã gửi lên là **một chiều mềm**: xoá được phiên và tệp, nhưng không thu lại được việc nhà cung cấp đã nhận.
- **Số:** 0145 — 0143 là số lớn nhất trên `main` ngày 28/10; 0144 đang dùng ở nhánh `claude/modest-sanderson-b148ce` (chưa gộp); 0140, 0142 như ghi ở mục lục.
- **Sửa / bổ sung:** không sửa ADR nào. Không đổi `CLAUDE.md` (§3, §8 giữ nguyên). Muốn đưa trợ lý trên mây vào quy trình thường lệ thì đề xuất riêng sau lượt thử (Đ7).
- **Kiểm độc lập:** lượt 1 ngày 28/10 CHƯA ĐẠT (một lỗi chặn: bộ che bỏ lọt số điện thoại có dấu phân cách — số hỗ trợ kỹ thuật và hotline công ty lọt ra ngoài; sáu mục sửa). Lượt 2 cùng ngày ĐẠT, kèm một mục sửa: số điện thoại bàn mã vùng 0258 trong bài kiểm không được che và ADR không nêu. Đã sửa (che cả số bàn, giữ mã vùng) cùng các điểm nhỏ. Lượt 3 cùng ngày ĐẠT, sẵn sàng trình chủ; còn vài mục nhỏ không chặn (ghi ở dòng `docs/SO-HANG-RAO.md`).

## Bối cảnh

- Chủ hỏi ngày 28/10 cách dùng Managed Agents của Anthropic cho lập kế hoạch, giám sát, kiểm toán, viết mã, rà lỗi. Managed Agents (beta) cho mô tả một trợ lý một lần (mô hình, lời dặn, công cụ), rồi mỗi lượt chạy trong một máy ảo riêng trên máy chủ Anthropic; có trần tiền cho từng lượt, lịch chạy, nhiều trợ lý phối hợp. Tiền tính theo tài khoản Claude Console, **tách** gói Claude chủ đang dùng. Lịch sử phiên lưu trên máy chủ Anthropic và **không** thuộc diện không lưu dữ liệu (ZDR); xoá được qua API.
- Hàng rào máy của dự án (hook `.claude/hooks/`, `permissions.deny`) chỉ chạy trong Claude Code trên máy của chủ; trên mây không có. Tài liệu Anthropic không nói phiên trên mây tự đọc `CLAUDE.md`.
- Kho có dữ liệu thật: mã Sheet trong `wrangler.jsonc`; số điện thoại hỗ trợ kỹ thuật (trong mã bảo trì và nhật ký thay đổi, viết cả liền lẫn cách quãng); tên, mã số thuế, địa chỉ, hotline của công ty chủ trong `migrations/0002_company_profile.sql` và vài bài kiểm; email dạng thật trong bài kiểm và một migration; tên chủ trong dữ liệu thử; đường dẫn tài khoản máy của chủ trong ca thử của hook; số điện thoại thật trong tài liệu và kịch bản.
- Mã (không kể bài kiểm) khoảng 100 nghìn dòng. Mẫu «Bug hunter» của Anthropic phủ khoảng 30 nghìn dòng mỗi lượt (tối đa 20 phần × ~1.500 dòng).

## Quyết định

**Đ1 — Chỉ đọc kho thật, chỉ báo cáo.** Trợ lý trên mây không có khoá Cloudflare, không có quyền GitHub, không đẩy mã, không triển khai. Trong máy ảo nó được chạy lệnh và ghi tệp (mẫu cần để chạy thử nghiệm), nhưng chỉ trên bản sao của gói. Sản phẩm duy nhất mang về là tệp báo cáo trong thư mục kết quả của phiên. Sửa mã vẫn theo §8: bản sao riêng trên máy, `npm run day-len`.

**Đ2 — Hàng rào là «không giao chìa», thay cho hook.** Môi trường `limited`, danh sách máy được phép **rỗng**, không mở kho gói, không MCP; công cụ `web_search`/`web_fetch` tắt. Mã đưa lên bằng **một tệp nén tải lên**, không dùng token GitHub. Môi trường không mạng chỉ được coi là hàng rào sau khi lượt thử quan sát nó chặn thật (Đ4).

**Đ3 — Gói mã tối thiểu, đã che, tự quét.** Gói làm bằng `scripts/goi-ma-tro-ly-may.mjs` (luật thuần `scripts/goi-ma-tro-ly-may-lib.mjs`, bài kiểm `src/goi-ma-tro-ly-may.test.ts`, dòng trong `docs/SO-HANG-RAO.md`).
- **Phạm vi:** chỉ `src/`, `web/`, `migrations/`, `tests/audit/` (khung thử D1 mà bài kiểm trong `src/` nhập), `package.json`, `tsconfig.json`, ba tệp `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/data-dictionary.json`, ba thư viện thuần mà bài kiểm nhập (`scripts/source-mask-lib.mjs`, `scripts/audit-checks.mjs`, `scripts/audit-thuong-mai.mjs`), lấy từ một commit (mặc định `main` trên máy; `NGUON.txt` ghi commit). Không gồm phần còn lại của `docs/` và `scripts/`, `tests/e2e/`, `wrangler.jsonc`, `.claude/`, `playbook/`, `node_modules/`.
- **Che:** số điện thoại Việt Nam, cả di động lẫn số bàn (mã vùng bắt đầu bằng 2), ở các dạng thường gặp (`0…`, `84…`, `+84…`, `(+84)`, viết liền hay có cách, chấm, gạch, ngoặc) thay bằng số giả cùng đầu số (số bàn: cùng ba chữ số đầu, gồm mã vùng), cùng độ dài, cùng cách viết, cùng số thì cùng số giả, không trùng số gốc nào; email (trừ miền `example.*`) thay phần trước `@`, giữ miền; tên chủ đầy đủ (`git config user.name`, cả bản không dấu) thay bằng «Chủ Dự Án»; đường dẫn `/Users/<tài khoản máy>/` thay bằng `/Users/nguoi-dung/`.
- **Tự quét rồi mới nén:** quét lại bằng một biểu thức rộng hơn bộ che; còn chuỗi giống số điện thoại chưa che, còn mã Sheet, không đọc được mã Sheet nào từ `wrangler.jsonc`, hoặc không đọc được tên chủ ⇒ dừng, không tạo gói, chỉ in tệp:dòng (không in giá trị).
- **Còn lại trong gói, chủ quyết khi duyệt:** tên, mã số thuế, địa chỉ của công ty chủ trong migration và bài kiểm (thông tin công khai của doanh nghiệp; hotline đã che); tên người khác trong dữ liệu thử (chưa rà hết, phần lớn là tên đặt ra); mảnh tên chủ ghép trong một bài kiểm (chỉ tên đầy đủ được thay); số dính liền chữ cái và dãy số nằm trong mã UUID (cố ý bỏ để không đụng mã băm, mã nhận dạng; ngày 28/10 chỉ có một số thử dính chữ); vài dạng số hiếm bộ che chưa bắt (`0084…`, `+84 (0)…`, dấu `/` làm phân cách — ngày 28/10 không có chỗ nào). Ngược lại, bộ che có thể che nhầm ngày viết bằng dấu chấm hay gạch kèm giờ hoặc ngày khác cách một dấu cách («02.02.2026 08:30», «28-02-2026 02-03-2026»): ngày 28/10 mã không có dạng này; nếu có thì chỉ làm sai chữ số trong bản gửi, không làm lộ dữ liệu.
- **Đã đo 28/10 trên `main` (714fe749 và ba3f366d, kết quả như nhau):** 1.298 tệp, 4,7 MB. Đối chiếu độc lập (gộp mọi cách viết rồi tìm lại): khoảng 184 số di động gốc và 3 số bàn gốc ⇒ 0 số còn trong gói, ngoài ba chỗ không phải số thật cần che (một số thử dính chữ, hai toạ độ hình vẽ biểu tượng). Bài kiểm phân hệ tiền vẫn xanh trên bản đã che khi có esbuild (426/426 theo tập tệp của người thi công, 436/436 theo tập của người kiểm); 108/108 bài kiểm có số bàn cũng xanh.

**Đ4 — Lượt thử nhỏ, có trần.** Chỉ phân hệ tiền: `src/modules/billing`, `src/modules/pricing`, `src/modules/receipt`, `src/shared/order-lines.ts` (~6 nghìn dòng); trần **$10** giá niêm yết cho phiên. Trần **gần đúng**: lệnh gọi mô hình đang chạy lúc chạm trần vẫn chạy xong, nên tổng có thể vượt một ít (mỗi luồng đang chạy tối đa một lệnh gọi); chạm trần thì phiên chuyển sang **chờ** (`idle`, `budget_reached`), không kết thúc — chỉ nâng hoặc gỡ trần mới chạy tiếp. Trần tháng chủ tự đặt ở Claude Console (khuyến nghị **$30** tháng đầu). Việc đầu tiên của lượt thử là **một lệnh gọi mạng cố ý** để quan sát hàng rào chặn thật (P16); sau lượt, AI ghi dòng hàng rào mạng vào `docs/SO-HANG-RAO.md` kèm ngày quan sát. Trước khi tải lên, kịch bản chạy thử in tóm tắt gói và **hỏi chủ «y»**.

**Đ5 — Đọc xong thì dọn.** Tải báo cáo về `docs/evidence/<ngày>-tho-san-loi/` (hồ sơ có ngày), rồi xoá phiên, tệp đã tải lên và tệp kết quả của phiên. Mỗi lỗi trong báo cáo phải được **tái hiện bằng bài đỏ trên máy** trước khi sửa; bằng chứng trên mây không thay bài đỏ. Lỗi chạm an ninh mức Cao vào `docs/quyen-hoan.json` (luật dừng dây chuyền); lỗi khác vào `docs/BACKLOG.md`, chủ xếp thứ tự.

**Đ6 — Không thay người kiểm độc lập.** Trợ lý «chứng minh lỗi» hay giám khảo trên mây **không** tính là người kiểm độc lập của §3 (N8). Muốn tính thì phải đổi luật (N9), chủ quyết.

**Đ7 — Phần còn lại chờ kết quả thử.** Kiểm toán hằng tuần theo lịch, đội kiểm theo chuyên đề (quyền, tiền, dữ liệu), trợ lý nghiên cứu nền: chưa làm; chỉ mở bằng ADR hoặc bản sửa riêng sau khi chủ xem kết quả lượt thử và chi phí thật.

## Tiêu chí nghiệm thu lượt thử (viết trước, P20)

1. Dòng đầu báo cáo cho thấy lệnh gọi mạng cố ý **bị chặn**: lỗi kết nối, hoặc mã HTTP không thuộc 2xx/3xx.
2. Báo cáo bằng tiếng Việt có dấu; không có số điện thoại hay email nào ngoài số/email giả của gói.
3. Chi phí thật (giá niêm yết của phiên) ≤ $10 cộng phần vượt nhỏ nói ở Đ4, ghi vào báo cáo bàn giao.
4. Hoặc ít nhất một lỗi «đã chứng minh» được AI trên máy tái hiện bằng bài đỏ, hoặc báo cáo nói rõ không có lỗi nào đứng vững; lỗi bị bác có lý do.
5. Phiên, tệp đã tải lên và tệp kết quả đã xoá: Console không còn phiên; `ant beta:files list --scope-id <phiên> --beta managed-agents-2026-04-01` không còn tệp.

## Hệ quả

- Mã đã che (tên hàm, luật nghiệp vụ, cấu trúc bảng, thông tin công khai của công ty chủ) nằm trên máy chủ Anthropic tới khi xoá.
- Chi phí chỉ biết sau lượt thử. Chạm trần giữa chừng thì phiên chờ, báo cáo có thể chưa viết xong — mất tiền lượt đó, không mất gì khác.
- **Dựa vào kỷ luật:** chủ chạy lệnh ở đúng thư mục; không dùng `ant apply .` (theo tài liệu, lệnh nhận mọi tệp trong thư mục tên `agents` là trợ lý, nên có thể áp nhầm `.claude/agents/`); không thêm khoá hay máy được phép vào môi trường. **Không máy nào chặn AI tự chạy `ant …` hay `chay-thu.sh`** khi trên máy có sẵn đăng nhập `ant` của chủ; nếu chủ muốn, bước sau thêm dòng cấm vào `.claude/settings.json` (chỉ siết, Điều 9.4) kèm dòng sổ hàng rào.
- `main` trên máy có thể đi trước GitHub (thấy ngày 28/10); gói mang đúng commit ghi ở `NGUON.txt`.
- Managed Agents đang beta: hành vi có thể đổi giữa các bản.
- **Gỡ:** xoá `tro-ly-may/`, `scripts/goi-ma-tro-ly-may*.mjs`, bài kiểm, dòng sổ hàng rào, `claude-lock.json`; lưu trữ trợ lý và môi trường trên Console.

## Nguồn

Tài liệu Anthropic (đọc 28/10/2026): `platform.claude.com/docs/en/managed-agents/overview`, `…/cloud-sandboxes-reference` (Node 22 có sẵn, Ubuntu 24.04, 8 GB bộ nhớ), `…/environments` (mạng `limited`), `…/permission-policies`, `…/scheduled-deployments`, `…/define-outcomes`, `…/multiagent-orchestration`; phần trần tiền theo bản chép tài liệu trong bộ kỹ năng `claude-api` (`managed-agents-core.md` § Session budgets); mẫu «Bug hunter» của Console (bản chép trong cùng bộ kỹ năng).
