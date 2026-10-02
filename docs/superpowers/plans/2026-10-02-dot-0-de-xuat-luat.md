# Đợt 0 luồng L (ADR-0094) — ĐỀ XUẤT sửa luật cho chủ duyệt

> **Vai:** người thi công chỉ **đề xuất** (Hiến pháp N9, CLAUDE.md §3: không tự đổi luật chi phối chính mình). Chưa có hiệu lực tới khi chủ duyệt; chủ duyệt thì phiên sau áp đúng nguyên văn dưới đây (sửa `CLAUDE.md` / `docs/ARCHITECTURE.md` bằng công cụ sửa tệp để chủ được hỏi).
> **Căn cứ:** ADR-0094 (accepted 2026-10-02) — mục "Thay câu nào", A-8 (K17), đ8e (lệch hẹp 5.5). Kế hoạch Đợt 0 §7 L14.
> **Không có trong đề xuất này:** ngoại lệ xoá cứng thứ hai `XOA_CUNG_VE_HET_HAN` — chỉ vào ở BẢN SAU (A-11, màn thời hạn + Cron dọn). Bản mở rộng KHÔNG xoá vé nào.

## 1. `CLAUDE.md` §7 (thêm một gạch, sau gạch "Bảo mật")

```diff
 - **Bảo mật**: mặc định từ chối (route khai `access`; …
+- **Chống ghi trùng** (ADR-0094): mọi route ghi có đăng nhập tự đi qua lớp vé ở router (`Idempotency-Key`, bảng `lg_lan_gui`); route TẠO trả 201 kèm `Location`, một lệnh = một lô ghi, không ghi phụ trước lô chính (ngoại lệ có tên `dbNgoaiVe`). Công thức: `docs/CHANGE-GUIDE.md` z11.
```

## 2. `CLAUDE.md` §10 (thêm một gạch bẫy)

```diff
+- **Khoá `LAN_GUI_SECRET`** (ADR-0094 đ4): bí mật BẮT BUỘC ≥ 32 ký tự như `SESSION_SECRET` — thiếu thì MỌI API trả 500. `npm run trien-khai` tự kiểm tên khoá trước khi deploy (bước 1c). Máy mình: thêm `LAN_GUI_SECRET=…` vào `.dev.vars`; `npm run types` khi `.dev.vars` thiếu tên này làm mất dòng khai tay ở `worker-configuration.d.ts`.
```

## 3. Hiến chương `docs/ARCHITECTURE.md` Phần I — Điều 3 (A-8)

Câu dẫn dòng 54: "Tour Đảo có **16** khái niệm lõi" ⇒ "Tour Đảo có **17** khái niệm lõi". Thêm dòng sau K16:

```diff
 | K16 | **Thông báo** | Bảng tin (ADR-0022, …) — … |
+| K17 | **Lệnh ghi chạy đúng một lần** | Mỗi lệnh ghi có đăng nhập mang một vé do máy khách sinh; vé được ghi trong cùng lô với dữ liệu; gửi lại cùng vé không ghi lần hai (ADR-0094). Trùng "ngoài đời" (hai người, hai nội dung) là việc của lớp nghiệp vụ |
```

## 4. Hiến chương — bảng thi hành, dòng 5.5 (đ8e)

Chỉ ghi ở **bản sau** (khi có Cron dọn). Bản mở rộng chưa xoá vé nào nên CHƯA cần dòng lệch. Đề xuất sẵn câu để duyệt một lần cùng bản sau:

```diff
-… trigger `ord_*_no_delete` cấm xoá khi đơn không còn nháp | ADR-0003, ADR-0007, ADR-0047 |
+… trigger `ord_*_no_delete` cấm xoá khi đơn không còn nháp; **lệch hẹp có chủ ý thứ hai (ADR-0094 đ8e):** vé kỹ thuật `lg_lan_gui` (không dữ liệu nghiệp vụ, không dữ liệu cá nhân) dọn theo thời hạn do Toàn quyền chọn, sàn 90 ngày — ngoại lệ có tên `XOA_CUNG_VE_HET_HAN`, chỉ gọi từ Cron | ADR-0003, ADR-0007, ADR-0047, ADR-0094 |
```

## 5. `CLAUDE.md` §7 gạch "Dữ liệu" — chữ "ngoại lệ có tên duy nhất" (đ8e)

Cùng lúc với mục 4 (bản sau): "ngoại lệ có tên duy nhất: …`XOA_CUNG_NHAP`" ⇒ "hai ngoại lệ có tên: …`XOA_CUNG_NHAP`; vé kỹ thuật hết hạn — ADR-0094, `XOA_CUNG_VE_HET_HAN`".

## Cần chủ làm
Duyệt (hoặc bác) mục 1–3 bây giờ; mục 4–5 khi thi công bản sau. Trả lời một dòng là đủ (vd "duyệt 1–3").
