# Kế hoạch thi công Bước 1: đóng chỗ hở của bộ khung điều khiển AI

> **Cho trợ lý thi công:** làm lần lượt từng Task, mỗi bước một việc có kết quả kiểm được; đánh dấu ô `- [ ]` khi xong. Người thi công không tự nghiệm thu (N8): sau Task 2 có người kiểm độc lập.

**Mục tiêu:** lệnh cấm gõ qua công cụ Terminal của ứng dụng bị máy chặn như lệnh gõ qua Bash; người kiểm độc lập chạy trên bản sao riêng nên không thể sửa cây làm việc của người thi công.

**Cách làm:** dùng lại nguyên móc `guard-remote.mjs` cho thêm một tên công cụ (lớp 1) và thêm một luật cấm cả công cụ (lớp 2, P21). Không thêm regex, không đổi luật nào đang có. Tệp trợ lý kiểm thêm một dòng `isolation: worktree` và ba câu hướng dẫn.

**Công nghệ:** Node 22 (`node --test`, chạy `.ts` trực tiếp), cấu hình Claude Code (`.claude/settings.json`, `.claude/agents/`).

**Đặc tả:** `docs/superpowers/specs/2026-11-15-kiem-toan-harness-va-cach-thi-cong-mot-nguoi.md` (mục I.6 Bước 1, II.3, II.5). Chủ dự án duyệt làm Bước 1 ngày 15/11 (nút «Làm Bước 1»).

## Ràng buộc chung

- Chỉ **siết**, không nới (Hiến pháp 9.4): không gỡ, không sửa nghĩa luật cấm hay bài kiểm nào đang có.
- Tệp trong `.claude/` chỉ sửa bằng công cụ sửa tệp (Edit/Write) để chủ được hỏi; không dùng `sed -i`, `>`, `cp`.
- Không sửa `CLAUDE.md`, `playbook/`, `docs/adr/`.
- Tài liệu, thông điệp lần lưu, tên bài kiểm: tiếng Việt có dấu. Cuối thông điệp lần lưu: `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>` (trợ lý dùng đời AI khác thì ghi đúng tên đời AI của mình).
- Không chạy `npm test` đủ bộ trong Task 1–2 (chạy một lần ở Task 4). Không chạy e2e (không chạm API).
- Kho mã đang **công khai**: không ghi số điện thoại, tên người thật, mã bảng Google Sheet vào bất kỳ tệp nào.
- Hàng rào máy chỉ chặn nhầm/quên, không chạy đua chống cố ý lách (chủ dự án 5/10): không thêm luật cho các lối lách giả định.

## Điều người kiểm cần soi (đặc tả ngầm đòi, dễ sót)

1. Lệnh thường ngày gõ qua Terminal (`npm test`, `git status`, `npm run dev`) không bị chặn nhầm ở lớp móc.
2. Các công cụ Terminal khác (`mcp__terminal__read_terminal`…) và mọi công cụ không chạy lệnh: móc im lặng, thoát 0.
3. Đầu vào hỏng hoặc thiếu `tool_input.command` với tên công cụ Terminal: móc không ném lỗi, không khoá phiên.
4. `git merge` gõ qua Terminal: chặn trong mọi trường hợp, vì tab Terminal dùng lại có thể đang đứng ở thư mục khác nên không xác định được nhánh.
5. Hành vi với công cụ `Bash` không đổi một ca nào: cả ba tệp bài kiểm hàng rào hiện có vẫn xanh mà không sửa bài cũ.

---

### Task 1: Lớp chặn phủ công cụ Terminal

**Tệp:**
- Sửa: `.claude/hooks/guard-remote.mjs` (dòng chú thích đầu tệp; đoạn đọc `input` tới chỗ tính `branch`)
- Sửa: `.claude/settings.json` (`permissions.deny`, `hooks.PreToolUse`)
- Bài kiểm: `src/claude-guard.test.ts` (thêm hai bài ở cuối nhóm bài về «script móc»)
- Sửa: `docs/SO-HANG-RAO.md` (thêm một dòng bảng)

**Giao diện:**
- Dùng: `MUST_DENY`, `ROOT`, `read`, `spawnSync`, `assert`, `test` đang có trong `src/claude-guard.test.ts`.
- Tạo ra: tên công cụ được canh là đúng hai chuỗi `"Bash"` và `"mcp__terminal__run_in_terminal"`.

- [ ] **Bước 1: viết hai bài kiểm đỏ**

```ts
test("guard-remote: lệnh cấm gõ qua công cụ Terminal của ứng dụng cũng bị chặn; lệnh thường và công cụ Terminal khác thì im lặng", () => {
  const run = (tool_name: string, tool_input: Record<string, string>) =>
    spawnSync("node", [".claude/hooks/guard-remote.mjs"], { cwd: ROOT, input: JSON.stringify({ hook_event_name: "PreToolUse", tool_name, tool_input, cwd: ROOT }), encoding: "utf8" });
  for (const command of [...MUST_DENY, "git merge main", "git merge --no-ff nhanh-khac"]) {
    const r = run("mcp__terminal__run_in_terminal", { command });
    assert.equal(r.status, 0);
    assert.equal(JSON.parse(r.stdout || "{}").hookSpecificOutput?.permissionDecision, "deny", `phải chặn qua Terminal: ${command}`);
  }
  for (const command of ["npm test", "git status", "npm run dev"]) assert.equal(run("mcp__terminal__run_in_terminal", { command }).stdout, "", `chặn nhầm qua Terminal: ${command}`);
  assert.equal(run("mcp__terminal__run_in_terminal", {}).stdout, "", "thiếu command thì im lặng");
  assert.equal(run("mcp__terminal__read_terminal", { tab_id: "0" }).stdout, "", "công cụ đọc Terminal không bị xét");
});

test("settings.json: đường Terminal của ứng dụng có đủ hai lớp (móc guard-remote + luật deny cả công cụ)", () => {
  const s = JSON.parse(read(".claude/settings.json"));
  const nhom = (s.hooks?.PreToolUse ?? []).filter((h: { matcher: string }) => h.matcher === "mcp__terminal__run_in_terminal").flatMap((h: { hooks: { command: string }[] }) => h.hooks);
  assert.ok(nhom.some((h: { command: string }) => h.command.includes(".claude/hooks/guard-remote.mjs")), "thiếu móc guard-remote cho công cụ Terminal");
  assert.ok((s.permissions?.deny ?? []).includes("mcp__terminal__run_in_terminal"), "thiếu luật deny cho công cụ Terminal");
});
```

- [ ] **Bước 2: chạy, phải đỏ đúng hai bài mới**

Chạy: `node --test src/claude-guard.test.ts 2>&1 | grep -E "^not ok|^# (tests|pass|fail)"`
Mong đợi: `# fail 2`, hai dòng `not ok` mang tên hai bài trên. Ghi nguyên văn hai dòng đó vào mục Nhật ký cuối tệp này.

- [ ] **Bước 3: sửa `.claude/hooks/guard-remote.mjs`**

Thay dòng `if (input?.tool_name !== "Bash") process.exit(0);` bằng: một `Set` tên `CONG_CU_CHAY_LENH` chứa đúng hai chuỗi ở mục Giao diện; công cụ ngoài tập thì `process.exit(0)`. Đặt `const quaTerminal = input.tool_name !== "Bash"`. Với `quaTerminal`: `cwd` lấy `input.tool_input.cwd` nếu có, không thì như cũ; **không** gọi `git rev-parse`, để `branch = null` (luật `git-merge-main` sẵn có sẽ chặn vì không xác định được nhánh). Với `Bash`: giữ nguyên từng dòng. Sửa hai dòng chú thích đầu tệp cho đúng: móc canh công cụ Bash và công cụ gõ lệnh vào tab Terminal của ứng dụng (từ 2026-11-15).

Ngay sau khi sửa móc, chạy lệnh ở Bước 2: bài thứ nhất phải xanh, bài thứ hai (settings) vẫn đỏ. Ghi dòng `not ok` còn lại vào Nhật ký. Hai lần chạy này (Bước 2 và ở đây) là lần quan sát từng bài tự đỏ khi thiếu đúng phần nó canh (P16), nên không cần phép đột biến riêng trên tệp luật: mỗi lần sửa tệp trong `.claude/` là một lần chủ bị hỏi, giữ số lần hỏi ở mức ít nhất.

- [ ] **Bước 4: sửa `.claude/settings.json`** (một lần ghi cả tệp bằng Write để chủ chỉ bị hỏi một lần; nội dung cũ giữ nguyên từng ký tự)

Thêm `"mcp__terminal__run_in_terminal"` vào cuối `permissions.deny`. Thêm vào `hooks.PreToolUse` một mục thứ ba, giữ nguyên hai mục cũ:

```json
{
  "matcher": "mcp__terminal__run_in_terminal",
  "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/guard-remote.mjs\"", "timeout": 10 }]
}
```

- [ ] **Bước 5: chạy lại, phải xanh hết, không sửa bài cũ**

Chạy: `node --test src/claude-guard.test.ts src/claude-guard-luat.test.ts src/claude-guard-tep.test.ts 2>&1 | grep -E "^not ok|^# (tests|pass|fail)"`
Mong đợi: `# fail 0`, số bài bằng số cũ (34) cộng 2.

- [ ] **Bước 6: thử khô móc thật với đầu vào giống Claude Code gửi**

Chạy: `printf '%s' '{"hook_event_name":"PreToolUse","tool_name":"mcp__terminal__run_in_terminal","tool_input":{"command":"npm run trien-khai"}}' > "$TMPDIR/thu-terminal.json"` rồi `node .claude/hooks/guard-remote.mjs < "$TMPDIR/thu-terminal.json"`.
Mong đợi: một dòng JSON có `"permissionDecision":"deny"`. Ghi dòng đó vào Nhật ký. `git diff --stat` chỉ còn các tệp của Task này.

- [ ] **Bước 7: thêm dòng vào `docs/SO-HANG-RAO.md`**

Chèn một dòng bảng ngay dưới dòng đầu bảng (dòng «Hook `guard-remote` + `permissions.deny`»), năm cột theo đúng khuôn bảng:
- Hàng rào: Đường Terminal của ứng dụng: `mcp__terminal__run_in_terminal` (từ 2026-11-15; kế hoạch này).
- Chặn cái gì: AI gõ lệnh cấm (`git push`, `wrangler deploy`, `npm run day-len`/`trien-khai`, ghi D1 remote…) vào tab Terminal của chủ, là đường không đi qua công cụ Bash nên trước 15/11 không lớp nào của kho canh.
- Cơ chế: lớp 1 là chính móc `guard-remote.mjs`, khai thêm một mục `PreToolUse` cho tên công cụ này; lớp 2 là luật `deny` cả công cụ trong `.claude/settings.json`. `git merge` qua đường này bị chặn mọi trường hợp.
- Đã thấy chặn thật: ngày làm + hai lần đỏ quan sát ở Bước 2 và Bước 3 (trước khi có móc: bài thứ nhất đỏ; có móc mà chưa có luật deny: bài thứ hai đỏ) + nguyên văn dòng đỏ + dòng `deny` của lần thử khô ở Bước 6. Ghi rõ: **Claude Code thật: CHƯA quan sát**; cấu hình chỉ có hiệu lực ở phiên mở sau khi nhánh vào `main`. Cách quan sát: ở phiên mới, xem công cụ còn trong danh sách của AI không; nếu còn thì nhờ AI gõ `git push --dry-run origin HEAD:refs/heads/thu-rao` qua Terminal và phải thấy bị từ chối.
- Ghi chú: chặn nhầm/quên. KHÔNG canh các đường khác có thể chạm bản chạy thật: trình duyệt của chủ (trang Cloudflare, GitHub), công cụ điều khiển máy tính, việc hẹn giờ, phiên chạy trên đám mây. Các đường đó dựa vào kỷ luật và bộ xét duyệt tự động.

- [ ] **Bước 8: lưu**

```bash
git add .claude/hooks/guard-remote.mjs .claude/settings.json src/claude-guard.test.ts docs/SO-HANG-RAO.md docs/superpowers/plans/2026-11-15-buoc-1-dong-cho-ho-harness.md
git commit -m "Lớp chặn lệnh cấm phủ thêm công cụ Terminal của ứng dụng" -m "<thân: vì sao — đường Terminal không qua Bash nên trước đây không lớp nào canh; hai lớp theo P21>"
```

### Task 2: Người kiểm độc lập chạy trên bản sao riêng

**Tệp:**
- Sửa: `.claude/agents/nguoi-kiem-doc-lap.md`
- Bài kiểm: `src/claude-guard.test.ts` (thêm một bài)

**Giao diện:**
- Dùng: `read`, `assert`, `test` trong `src/claude-guard.test.ts`.
- Tạo ra: phần đầu tệp trợ lý có đúng dòng `isolation: worktree`.

Kết quả phép thử ngày 15/11 (phiên điều phối chạy trợ lý với `isolation: "worktree"`): bản sao nằm ở `.claude/worktrees/agent-<mã>`, dựng từ đầu `main` chứ không từ nhánh của người thi công; lần lưu của người thi công có trong kho nên `git checkout --detach <mã>` chạy được; không có `node_modules` riêng nhưng `npm run typecheck` và `node --test` vẫn chạy nhờ thư mục cha; không có `.dev.vars` nên không chạy được e2e; lệnh ghép nhiều lệnh git bị từ chối, phải gõ từng lệnh; bản sao đã đổi HEAD thì không tự dọn.

- [ ] **Bước 1: viết bài kiểm đỏ**

```ts
test("trợ lý nguoi-kiem-doc-lap: chạy trên bản sao riêng, không có công cụ sửa tệp", () => {
  const dau = read(".claude/agents/nguoi-kiem-doc-lap.md").split("---")[1] ?? "";
  assert.match(dau, /^isolation: worktree$/m, "thiếu isolation: worktree");
  const congCu = (dau.match(/^tools: (.*)$/m)?.[1] ?? "").split(",").map((x) => x.trim());
  for (const cam of ["Edit", "Write", "MultiEdit", "NotebookEdit"]) assert.ok(!congCu.includes(cam), `người kiểm không được có công cụ ${cam}`);
});
```

- [ ] **Bước 2: chạy, phải đỏ** — `node --test src/claude-guard.test.ts 2>&1 | grep -E "^not ok|^# fail"` → `# fail 1`, lý do «thiếu isolation: worktree».

- [ ] **Bước 3: sửa `.claude/agents/nguoi-kiem-doc-lap.md`** (đọc tệp rồi ghi lại cả tệp một lần bằng Write để chủ chỉ bị hỏi một lần; chỗ không nêu dưới đây giữ nguyên từng chữ)

Phần đầu tệp: thêm dòng `isolation: worktree` (giữ `tools: Read, Glob, Grep, Bash` và `model`). Phần thân, chỉ đổi ba chỗ:
1. Thêm mục ngay sau câu mở đầu, tên «Bản sao riêng», nội dung: bạn chạy trong một bản sao riêng của kho; việc đầu tiên là `git checkout --detach <mã lần lưu ghi trong đề bài>` (đề bài không ghi mã thì DỪNG và báo lại); phần chưa lưu của người thi công không có ở đây; mỗi lệnh git gõ riêng, không ghép; bản sao không có `.dev.vars` nên không chạy e2e, nếu việc cần e2e thì ghi vào mục «không kiểm được».
2. Ở gạch đầu dòng về thử phá: thay cách «làm trên bản sao tạm bằng `git archive`» bằng: thử phá ngay trong bản sao riêng này rồi `git checkout -- .` để hoàn nguyên; vẫn không commit.
3. Ở mục «Cách làm việc»: thêm một bước đầu «so kết quả với từng ví dụ "xong khi" của đặc tả hoặc kế hoạch trước; bỏ qua câu chữ, văn phong», và một bước cuối «trước khi báo cáo: `git checkout -- .`, rồi `git checkout -` để trả bản sao về nhánh ban đầu cho Claude Code tự dọn».
Không đổi các luật cứng còn lại.

- [ ] **Bước 4: chạy lệnh ở Task 1 Bước 5** → `# fail 0`, số bài bằng 34 cộng 3.

- [ ] **Bước 5: lưu** — `git add .claude/agents/nguoi-kiem-doc-lap.md src/claude-guard.test.ts docs/superpowers/plans/2026-11-15-buoc-1-dong-cho-ho-harness.md` rồi commit, tiêu đề «Người kiểm độc lập chạy trên bản sao riêng», thân nói vì sao (trước đây "không sửa" chỉ là lời dặn).

### Task 3: Kiểm độc lập (phiên điều phối giao)

Phiên điều phối gọi trợ lý `nguoi-kiem-doc-lap` với `isolation: "worktree"`, đưa mã lần lưu cuối của Task 2 và tệp kế hoạch này. Người kiểm so với mục «Điều người kiểm cần soi», tự chạy lại ba tệp bài kiểm hàng rào và `npm run typecheck`, tự làm một phép đột biến của riêng mình. Sau khi người kiểm xong, phiên điều phối chạy `git status --short` ở cây làm việc này: phải rỗng. Đó là lần quan sát cho Task 2 (người kiểm thử phá mà cây của người thi công không đổi). Ghi kết quả vào Nhật ký và thêm vào dòng sổ hàng rào của trợ lý kiểm nếu có, không thì ghi ở Nhật ký.

### Task 4: Nhận bản chính mới, chạy đủ bộ (phiên điều phối)

`git fetch origin` → `git merge origin/main` vào nhánh này → đổi số mục 71 của nhánh trong `docs/BACKLOG.md` thành số kế tiếp còn trống → `npm run typecheck` → `npm test` đủ bộ một lần, chạy nền, ghi đầu ra ra tệp tạm → báo số bài, số đỏ. Không cần mục nhật ký phiên bản vì không triển khai gì (chỉ đổi cấu hình AI, bài kiểm, tài liệu).

## Phần chủ dự án tự làm (AI chỉ soạn)

**A. Khoá bản chính trên GitHub** (chỉ có khi kho công khai, hoặc kho riêng tư có gói GitHub Pro trở lên):
1. Mở `github.com/luutuanvu1010/tourdaobooking` → **Settings** → cột trái **Branches** → **Add classic branch protection rule**.
2. **Branch name pattern**: gõ `main`.
3. Tích **Require status checks to pass before merging** → ô tìm gõ `Gom kết quả kiểm` → chọn. **Không** tích «Require branches to be up to date before merging».
4. Tích **Do not allow bypassing the above settings**. Để trống «Allow force pushes» và «Allow deletions».
5. Bấm **Create**.
6. Quan sát chặn thật, không rủi ro: trên GitHub mở một tệp bất kỳ ở `main`, bấm hình cây bút để sửa, thử lưu thẳng vào `main`. GitHub phải từ chối hoặc bắt tạo nhánh khác. Huỷ, không lưu gì.
7. Lần `npm run day-len` kế tiếp: nếu bước cuối báo `git push origin main` lỗi và nhắc tới «protected branch», mở lại trang trên, bỏ tích mục ở bước 3, chạy lại, rồi báo AI. Tài liệu GitHub không nói rõ trường hợp lần lưu đã xanh ở nhánh `cho-kiem/…` rồi mới đẩy vào `main`, nên bước này **chưa kiểm**.

**B. Mô tả môi trường cho bộ xét duyệt tự động** (`~/.claude/settings.json`, khoá `autoMode.environment`): AI soạn các dòng cần thay và đưa trong cuộc trò chuyện, không lưu vào kho. Chủ tự dán, hoặc ra lệnh cho AI sửa và duyệt phần thay đổi máy hiện ra.

**C. Dọn bản làm việc riêng.** Bảng đo ngày 15/11 (21 bản, kể cả thư mục gốc). AI không tự lưu trữ phiên, không xoá nhánh chưa nhập; chủ nói làm nhóm nào thì AI làm nhóm đó. «Không thấy phiên» nghĩa là thư mục không gắn với phiên nào đang mở trong ứng dụng.

| Thư mục → nhánh | Phiên trong ứng dụng | Tình trạng | Khuyến nghị |
|---|---|---|---|
| **Nhóm 1: đóng được ngay, không mất gì (sạch, đã nằm trong bản chính)** | | | |
| `admin-role-accounting-role-bug-bf505e` → `claude/project-director-review-prompt-58bc10` | «ok vậy-ended» (13/11) | sạch, đã nhập | lưu trữ phiên |
| `modest-lovelace-09b5ba` → `claude/redesign-maintenance-screen-325ff8` | «Thiết kế lại màn hình bảo trì- end» (14/11) | sạch, đã nhập; còn 6 tiến trình thử chạy sót | chủ tắt tiến trình sót, rồi lưu trữ phiên |
| `multi-role-admin-view-8030d2` | «Màn hình đa vai trò quản trị-ended» (13/11) | sạch, đã nhập | lưu trữ phiên |
| `partner-type-ta-oracle-18-efd687` → `claude/trang-thai-2-73` | «Áp dụng TA theo loại đối tác và Oracle 18-ended» (7/11) | sạch, đã nhập | lưu trữ phiên |
| `two-factor-auth-expiry-328f96` | «Bảo mật 2 lớp hết hạn 30 ngày» (6/11) | sạch, đã nhập | lưu trữ phiên |
| `admin-delete-data-decision-31f0fc` → `claude/init-7dd303` | «Audit giao diện» (14/11) | sạch, đã nhập | lưu trữ nếu việc đã chuyển hẳn sang phiên «bước 2» |
| `xoa-muc-tra-sau-no` | không thấy phiên | sạch, đã nhập, 9 ngày | gỡ thư mục, xoá nhánh đã nhập |
| **Nhóm 2: còn lần lưu chưa nhập, chủ quyết nhập hay bỏ** | | | |
| `adr-0199-van-phong-nhap-coc` | không thấy phiên | 27 lần lưu chưa nhập; thi công xong 13/11, chờ chủ nhập và phát hành | nhập khi chủ duyệt phát hành |
| `dot-0b-khung-tai` | không thấy phiên | 17 lần lưu, 179 tệp, từ 30/10; việc đã gác (BACKLOG mục 55) | gỡ thư mục, GIỮ nhánh |
| `order-edit-shipment-button-d582be` | «…-paused» (9/11) | 1 lần lưu, sửa hai dòng bảng từ | nhập (nhỏ) hoặc bỏ |
| `quirky-faraday-88277b` | «…-ended» (8/11) | 1 lần lưu ghi chú kế hoạch ADR-0178 phần B, nay phần B đã phát hành | bỏ: lưu trữ phiên, giữ nhánh |
| `friendly-franklin-4c7098` → `claude/tour-account-qr-scan-setup-533817` | không thấy phiên | 3 lần lưu từ 18/10 (sơ đồ kiến trúc, bài tình huống) và 1 tệp cấu hình chưa lưu | chủ xem còn cần không; không thì gỡ thư mục, giữ nhánh |
| `rut-gon-claude-md` | không thấy phiên | 4 lần lưu và 3 bản nháp chưa lưu (ADR-0160) | giữ tới Bước 3 (rút gọn CLAUDE.md) rồi quyết |
| **Nhóm 3: còn tệp chưa lưu** | | | |
| `adr-0184-thi-cong` | không thấy phiên | 30 ảnh bằng chứng chưa lưu; ADR-0184 đã phát hành | bỏ ảnh rồi gỡ thư mục (kho đang công khai và đã nặng), hoặc lưu nếu chủ cần giữ bằng chứng |
| `luot-a-gop-y-69dd26` | không thấy phiên | 2 tệp mã sửa dở từ ba tuần trước (`src/shared/loc-don.ts` và bài kiểm của nó) | chủ quyết xem lại hay bỏ |
| **Nhóm 4: đang làm, để nguyên** | | | |
| `soan-adr-a-b-ed0d40`, `fix-receipt-service-edit-4f4aae`, `vibrant-keller-5d0659`, `reverent-kilby-7333f6`, `vibe-coding-audit-2bdc6e` | năm phiên có hoạt động 14–15/11 | | không đụng |

Làm xong Nhóm 1 thì còn 14 bản; muốn về ba bản thì phải quyết hết Nhóm 2 và Nhóm 3.

## Nhật ký

(người thi công và phiên điều phối ghi ở đây: dòng đỏ quan sát được, quyết định giữa chừng, việc còn nợ)

### Task 1 (người thi công, 2026-11-15)

- Lần chạy đỏ, trước khi sửa móc (`# tests 21`, `# pass 19`, `# fail 2`):
  - `not ok 10 - guard-remote: lệnh cấm gõ qua công cụ Terminal của ứng dụng cũng bị chặn; lệnh thường và công cụ Terminal khác thì im lặng`
  - `not ok 11 - settings.json: đường Terminal của ứng dụng có đủ hai lớp (móc guard-remote + luật deny cả công cụ)`
- Sau khi sửa móc, chưa sửa settings (`# pass 20`, `# fail 1`): `not ok 11 - settings.json: đường Terminal của ứng dụng có đủ hai lớp (móc guard-remote + luật deny cả công cụ)`
- Sau khi ghi settings: ba tệp bài kiểm hàng rào `# tests 36`, `# pass 36`, `# fail 0` (34 + 2).
- Thử khô (Bước 6): `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Bị chặn: npm run day-len / trien-khai / len-chinh-thuc / lam-moi-dev …"}}` (lý do rút gọn ở đây).
- Quyết định khác kế hoạch: viết bài kiểm Task 2 sau, không cùng lúc, để lần lưu Task 1 không chứa bài đỏ. Dòng sổ hàng rào chèn ngay dưới dòng dữ liệu đầu tiên (dòng «Hook `guard-remote`…»).
- [x] Task 1 Bước 1–8 xong.

### Task 2 (người thi công, 2026-11-15)

- Lần chạy đỏ (`# fail 1`): `not ok 12 - trợ lý nguoi-kiem-doc-lap: chạy trên bản sao riêng, không có công cụ sửa tệp`, lý do `'thiếu isolation: worktree'`.
- Sau khi ghi tệp trợ lý: ba tệp bài kiểm hàng rào `# tests 37`, `# pass 37`, `# fail 0` (34 + 3). `npm run typecheck`: 0 lỗi.
- Quyết định khác kế hoạch: trong tệp trợ lý, mục «Bản sao riêng» đặt ngay sau câu mở đầu, và bước «so kết quả…» thành bước 1 nên các bước sau đánh số lại 2–7 (bước «trả bản sao» là bước 7). Không đổi luật cứng nào ngoài hai chỗ kế hoạch nêu.
- [x] Task 2 Bước 1–5 xong. Task 3, Task 4 chưa làm (phiên điều phối).

### Task 3 (phiên điều phối, 2026-11-15): kiểm độc lập

- Người kiểm: trợ lý `nguoi-kiem-doc-lap`, gọi với `isolation: "worktree"`, kiểm lần lưu `0959edd0f` trên bản sao riêng. Kết luận nguyên văn: «Sẵn sàng trình chủ? Có.» Không có phát hiện Critical hay Important.
- Người kiểm tự chạy: ba tệp bài kiểm hàng rào `# tests 37`, `pass 37`, `fail 0`; `npm run typecheck` 0 lỗi; năm đầu vào lạ cho móc thật (thiếu `tool_input`, `tool_input` là `null`, `command` là số, `cwd` không tồn tại, lệnh vô hại chỉ nhắc chuỗi cấm) đều thoát 0, không ném lỗi; ca `git push origin main` với `cwd` không tồn tại trả `deny`; lệnh vô hại chỉ nhắc chuỗi cấm được cho qua ở cả Terminal lẫn Bash (hai đường xử lý như nhau).
- Người kiểm xác nhận không nới: luật `deny` cũ, danh sách `ask` và hai mục `PreToolUse` cũ không đổi; luồng xử lý cho `Bash` giữ nguyên.
- Phép đột biến riêng của người kiểm KHÔNG làm được: lệnh `perl -pi` sửa `.claude/hooks/guard-remote.mjs` trong bản sao bị chính lớp chặn của kho từ chối («Bị chặn: sửa/xoá/ghi đè tệp luật … bằng dòng lệnh»). Ghi nhận như một lần quan sát lớp chặn tệp luật chạy thật, cả trong bản sao của trợ lý. Hai lần đỏ ở Task 1 vì thế chỉ có người thi công quan sát.
- Quan sát cho Task 2: sau khi người kiểm xong, `git status --short` ở cây làm việc của người thi công rỗng. Người kiểm trả bản sao về nhánh ban đầu trước khi báo cáo, và Claude Code đã tự dọn bản sao cùng nhánh tạm của nó. Lần thử trước đó (bản sao để ở trạng thái đã đổi HEAD) thì không được tự dọn, phiên điều phối phải gỡ tay.
- Người kiểm không kiểm được: Claude Code thật (chưa có phiên mới nạp cấu hình); e2e (bản sao không có `.dev.vars`); `npm test` đủ bộ (đề bài không cho).

### Yêu cầu của chủ giữa chừng (2026-11-15): «sửa cấu hình để bypass mọi câu hỏi của bạn dành cho tôi»

- Phiên điều phối KHÔNG tự sửa. Lý do: hộp hỏi khi AI sửa tệp luật là công tắc an ninh của chính AI; quy tắc an toàn của Claude để cài đặt an ninh cho người dùng tự đổi, và Hiến pháp N9 không cho AI tự nới luật chi phối mình. Tiền lệ: ngày 9/11 chủ tự xoá `Edit(docs/adr/**)` khỏi `permissions.ask`.
- Hiện trạng đo được: hộp hỏi đến từ mười dòng `permissions.ask` trong `.claude/settings.json`. Lệnh `npm run day-len` chỉ đòi lý do khi các tệp trong `TEP_DIEU_KHIEN` (`scripts/kiem-phan.mjs`) đổi; danh sách đó KHÔNG gồm `.claude/**`, `CLAUDE.md`, `playbook/**`. Nghĩa là nếu bỏ hộp hỏi hôm nay thì không còn điểm nào chủ nhìn thấy AI sửa tệp luật.
- Đề xuất cho Bước 2 (siết trước, nới sau): đưa các tệp luật vào danh sách mà `day-len` liệt kê và đòi chủ gõ lý do khi đổi. Khi đó chủ có thể tự bỏ khối `ask`, và việc duyệt tệp luật dồn về đúng một lần lúc nhập bản chính.
- Các câu hỏi ở cuối lượt của AI: từ 15/11 phiên này không hỏi nữa; tự chọn phương án khuyến nghị và ghi lại (đúng ghi chú «Đừng hỏi câu chủ nên đồng ý»).
