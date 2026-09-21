# WORKFLOW — Quy trình batch + QA gate

> **Vị trí:** Cầu nối giữa PROMPT_FACTORY (sinh prompt) và Claude Code (thực thi)
> **Nguyên lý:** QA gate là vật lý — không thể vượt vì prompt đợt sau chưa tồn tại
> **Ngày:** 2026-06-12

---

## 0. Tại sao cần file này

Prompt nhét cả 3 đợt vào một file → Claude Code chạy một mạch 18 file, không dừng QA giữa chừng.

Giải pháp: **mỗi đợt = một prompt riêng.** Cowork chỉ sinh prompt đợt N+1 sau khi đợt N đạt QA. Claude Code không thể chạy đợt tiếp vì prompt chưa tồn tại — đây là gate vật lý.

---

## 1. Cấu trúc prompt cho nhiệm vụ nhiều đợt

```
playbook/ai/prompts/
├── B8.1.1-SCHEMA-DOT1.md    ← Đợt 1: 6 file nền móng
├── B8.1.2-SCHEMA-DOT2.md    ← Đợt 2: 5 entity reference (CHỈ SINH SAU KHI ĐỢT 1 ĐẠT QA)
├── B8.1.3-SCHEMA-DOT3.md    ← Đợt 3: 5 entity + 2 config (CHỈ SINH SAU KHI ĐỢT 2 ĐẠT QA)
└── B8.1-COMPLETE.md         ← Merge + báo cáo tổng (CHỈ SINH SAU KHI ĐỢT 3 ĐẠT QA)
```

Mỗi prompt có cấu trúc 7 phần giống nhau (theo PROMPT_FACTORY §2), chỉ khác phần Phạm vi. Cuối mỗi prompt là khối PQ1–PQ6.

---

## 2. Sơ đồ — vòng lặp khép kín một đợt

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Cowork                        Claude Code (tự QA)          │
│  ──────                        ───────────────────          │
│                                                              │
│  1. Sinh prompt → lưu                                        │
│                                                              │
│           ──────────────────→  2. Nhận prompt                │
│                                   git checkout -b             │
│                                   đọc spec → viết code        │
│                                   git commit                  │
│                                                              │
│                                3. SPAWN QA AGENT (sub-agent) │
│                                   ├─ ĐẠT → ghi qa-reports/  │
│                                   │    + commit trỏ file    │
│                                   └─ TRƯỢT → sửa → QA lại   │
│                                                              │
│           ◄──────────────────  4. "Đợt N + QA đạt,          │
│                                    commit [hash]"            │
│                                                              │
│  5. Kiểm hậu kiểm: mở file báo cáo,                          │
│     đối chiếu bằng chứng trong đó → OK                      │
│                                                              │
│  6. Sinh prompt Đợt N+1                                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Cơ chế gate — tại sao không thể bỏ qua

| Cơ chế | Vật lý / Luận lý |
|---|---|
| **Prompt đợt N+1 chưa tồn tại** | Vật lý — file không có trên đĩa |
| **Prompt có khối PQ1–PQ6 bắt buộc** | Claude Code từ chối nếu thiếu |
| **QA agent là sub-agent độc lập** | Instance riêng (Haiku, không context code) — thỏa GOVERNANCE §4.3 |
| **QA agent ghi báo cáo thành file, commit message trỏ tới file** | Cowork kiểm hậu kiểm: không có file, hoặc file không có bằng chứng tái lập được = reject. **Không chống giả** — xem §3b |
| **Chỉ sinh prompt tiếp khi QA đạt** | Cowork là gatekeeper duy nhất cho prompt tiếp theo |

---

## 3b. Cơ chế bằng chứng QA mạnh tới đâu — nói thẳng

Bản trước của bảng trên ghi "commit message phải ghi QA agent ID, không giả được". Câu đó đã bị gỡ vì hai lý do, cả hai đều phát hiện khi vận hành thật (bản ghi quyết định của site gốc ngày 2026-07-31, không có trong Core):

1. **Không lấy ra được.** Harness đánh dấu agent ID là định danh nội bộ, không đưa ra ngoài. Một cổng đòi thứ không lấy được thì hoặc bị bỏ qua, hoặc bị lấp bằng lời khai. Cả hai đều tệ hơn không có cổng, vì luật vẫn ghi là có.
2. **Không nói gì.** Kể cả lấy được, ID chỉ chứng minh có một agent từng chạy. Nó không chứng minh agent đó kiểm gì, kiểm đúng hay kiểm bừa. Đó là bằng chứng về sự tồn tại, rỗng về nội dung.

Cơ chế thay thế **không chống giả**. Tác nhân thực thi hoàn toàn có thể tự viết file báo cáo mà không spawn agent nào. Đừng tự nhủ là nó an toàn.

Cái nó đổi lấy: bằng chứng chuyển từ *không giả được nhưng rỗng nghĩa* sang *giả được nhưng bị bắt khi đối chiếu*. Điều kiện để vế sau thành thật là nội dung báo cáo phải **tái lập được**: hash commit được audit, lệnh đã chạy kèm output thật, mỗi phát hiện trỏ `file:dòng` cụ thể. Ai đọc cũng chạy lại được và bắt được nếu có chỗ bịa.

Hệ quả phải chấp nhận: gánh nặng chuyển một phần sang Cowork, vì file bịa chỉ bị bắt khi thật sự có người đối chiếu. Cowork không đọc thì cơ chế này rỗng y như cái cũ. Một báo cáo chỉ ghi "đã kiểm R1 đến R6, ĐẠT" không phải bằng chứng và phải bị reject như khi không có file.

---

## 4. Prompt B8.1 được tách như thế nào

### B8.1.1 — Đợt 1: Nền móng

```
playbook/ai/prompts/B8.1.1-SCHEMA-DOT1.md
```

**Phạm vi:** 6 file (baseFields, lodgingBase, category, person, touristDestination, place)

**Sau khi xong:** commit, báo Cowork. Cowork spawn QA. Nếu đạt → Cowork sinh B8.1.2.

### B8.1.2 — Đợt 2: Reference phức tạp

```
playbook/ai/prompts/B8.1.2-SCHEMA-DOT2.md
```

**Phạm vi:** 5 file (attraction, restaurant, specialty, hotel, resort)

**Sau khi xong:** commit, báo Cowork. Nếu QA đạt → Cowork sinh B8.1.3.

### B8.1.3 — Đợt 3: Cấu trúc lồng + i18n

```
playbook/ai/prompts/B8.1.3-SCHEMA-DOT3.md
```

**Phạm vi:** 7 file (experience, organization, event, tour, article, index.ts, sanity.config.ts)

**Sau khi xong:** commit, báo Cowork. Nếu QA đạt → Cowork sinh B8.1-COMPLETE.

### B8.1-COMPLETE — Merge

```
playbook/ai/prompts/B8.1-COMPLETE.md
```

**Phạm vi:** `git checkout main && git merge feat/b8.1-schema && git push`

---

## 5. Tích hợp vào PROMPT_FACTORY

PROMPT_FACTORY.md §5 (Tích hợp vào quy trình Cowork) được cập nhật:

```
Bước N hoàn tất spec/mockup/plan
  │
  ├─→ Cowork xác định: nhiệm vụ này có mấy đợt?
  │
  ├─→ Với mỗi đợt:
  │     │
  │     ├─ Sinh prompt theo template §2
  │     ├─ QA prompt PQ1–PQ6
  │     ├─ Lưu vào playbook/ai/prompts/
  │     ├─ Bàn giao Claude Code
  │     ├─ Claude Code viết code → commit → báo
  │     ├─ Cowork spawn QA agent audit G2
  │     │
  │     ├─ ĐẠT → sinh prompt đợt tiếp
  │     └─ TRƯỢT → báo lỗi, Claude Code sửa, QA lại
  │
  └─→ Đợt cuối đạt QA → prompt COMPLETE (merge)
```

---

## 6. Prompt B8.1.1 mẫu (thay thế B8.1 cũ)

Prompt cũ `B8.1-SCHEMA.md` chứa cả 3 đợt → thay bằng file B8.1.1 chỉ chứa Đợt 1. Các đợt sau được sinh động khi đợt trước đạt QA.
