# Danh sách Kế toán xem lại hai khoá đáp án mới của sổ vàng "Sửa số khách"

> Hồ sơ có ngày (13/10/2026), viết xong là đóng băng. Điều kiện của chủ khi duyệt ADR-0114: "Kế toán xem lại hai khoá mới". Trạng thái từng ca nằm ở `golden/sua-so-khach-van-phong.json`, trường `xac_nhan_khoa_moi` (hiện cả 12 ca là `cho_xac_nhan`). AI không tự xác nhận.

## Việc cần Kế toán làm

Sổ vàng là bảng "đề bài và đáp án đúng" mà máy dùng để canh tiền khi sửa số khách. Đợt này thêm cho **mỗi ca** hai đáp án mới. Kế toán đọc từng dòng dưới đây và trả lời "đúng" hoặc "sai, vì…" cho **hai câu hỏi** của từng ca:

1. **Có nhắc đỏ khuyến mại không?** Quy ước: nhắc khi đơn có giảm giá **và** số khách trả tiền (người lớn + trẻ em + người cao tuổi, em bé không tính) sau lần sửa **ít hơn** số lúc xác nhận. Nhắc chỉ để Kế toán xem lại, không đổi một đồng nào và không chặn.
2. **Lịch sử số khách có đủ dòng không?** Quy ước: luôn có dòng "lúc xác nhận"; mỗi lần sửa thêm một dòng; dòng cuối là số hiện tại. Mỗi dòng ghi số khách và tạm tính của lúc đó.

Số tiền (tạm tính, phải thu, còn lại, dư) của các ca đã được Kế toán xác nhận trước đó **không đổi**; danh sách này không hỏi lại phần tiền.

## 12 ca

| Ca | Tình huống (nói gọn) | Khách trước → sau | Nhắc đỏ? | Lịch sử (tạm tính từng dòng) |
|---|---|---|---|---|
| SV-SK-01 | Khách đã trả đủ rồi bớt 1 người, không giảm giá | 4 → 3 người lớn | Không (đơn không giảm giá) | 2.000.000 → 1.500.000 |
| SV-SK-02 | Thêm khách, đơn có giảm giá 100.000 | 2 NL + 1 TE → 3 NL + 2 TE | Không (khách tăng) | 1.300.000 → 2.100.000 |
| SV-SK-03 | Có thêm dịch vụ nhập tay 200.000, bớt 1 người ở tour | 3 → 2 người lớn | Không (đơn không giảm giá) | 1.700.000 → 1.200.000 (xem ghi chú 1) |
| SV-SK-04 | Giảm giá 800.000 lớn hơn tiền dịch vụ sau khi bớt | 2 → 1 người lớn | **Có** | 1.000.000 → 500.000 |
| SV-SK-05 | Tính hoa hồng theo đầu người với 4 loại khách | 3 NL, 1 TE, 1 NCT, 1 EB → 2 NL, 1 TE, 1 NCT, 2 EB | Không (đơn không giảm giá) | 2.250.000 → 1.800.000 |
| SV-SK-06 | Bấm lưu mà không đổi số khách | 2 → 2 người lớn | Không | 1.000.000 → 1.000.000 |
| SV-SK-07 | Sửa lần hai, đã có lần sửa trước | 4 → 3 → 5 người lớn | Không (đơn không giảm giá) | 2.000.000 → 1.500.000 → 2.500.000 (ba dòng) |
| SV-SK-08 | Như SV-SK-04, sau đó hoàn tiền cho khách | 2 → 1 người lớn | **Có** | 1.000.000 → 500.000 |
| SV-SK-09 | Như SV-SK-04 nhưng khách chưa trả đồng nào | 2 → 1 người lớn | **Có** | 1.000.000 → 500.000 |
| SV-SK-10 | Bớt hết người lớn, chỉ còn em bé | 1 NL + 1 EB → 0 NL + 1 EB | Không (lần sửa **bị từ chối**) | Giữ nguyên 500.000 (hai dòng giống nhau) |
| SV-SK-11 | Như SV-SK-04, sau đó đơn bị huỷ | 2 → 1 người lớn | **Có** | 1.000.000 → 500.000 |
| SV-SK-12 | Ví dụ của chủ: 10 người, giảm giá 50.000, bớt còn 2 | 10 → 2 người lớn | **Có** (đúng ví dụ của chủ) | 5.000.000 → 1.000.000 |

Viết tắt: NL người lớn, TE trẻ em, NCT người cao tuổi, EB em bé.

## Ghi chú cho người xem

1. **SV-SK-03**: dòng lịch sử của dịch vụ nhập tay đang hiện "0 người". Đó là do bộ đề bài của sổ vàng không mang số khách của dịch vụ nhập tay; trên Nền tảng thật dòng này hiện số khách đã lưu của dịch vụ đó. Tạm tính (1.700.000 → 1.200.000) vẫn đúng. Kế toán cho biết cách hiện này có chấp nhận được không.
2. **SV-SK-10**: đây là ca **bị từ chối**, thay cho ca "tạm tính về 0" cũ. Lý do theo lời chủ: mỗi đơn phải có ít nhất một người lớn đi kèm; trẻ em và em bé không đi một mình. Câu hiện cho người dùng: "Đơn cần ít nhất một người lớn đi cùng; trẻ em và em bé không đi một mình."
3. **SV-SK-04, 08, 09, 11**: tạm tính sau khi bớt (500.000) nhỏ hơn giảm giá (800.000). Hai cảnh báo cùng hiện: câu cũ "giảm giá lớn hơn tiền dịch vụ" và câu mới "kế toán xem lại khuyến mại". Kế toán cho biết hai câu cùng lúc có làm rối không.
4. **Chưa có ca nào** cho trường hợp tạm tính về đúng 0 mà vẫn có giảm giá (rất hiếm, chỉ khi khách còn lại đều có đơn giá 0). Khi đó Nền tảng không hiện câu nhắc khuyến mại mà vẫn hiện câu "giảm giá lớn hơn tiền dịch vụ". Chủ đã được báo mục này để quyết.

## Sau khi Kế toán xem

Kế toán nói với chủ ca nào đúng. Chủ ra lệnh thì ghi tên Kế toán và ngày vào `xac_nhan_khoa_moi` của các ca đó (`trang_thai: da_xac_nhan`, `nguoi`, `ngay` dạng ISO). Ca nào sai thì sửa đáp án, rồi xem lại. Bài kiểm trong sổ vàng bắt buộc phải có tên và ngày khi một ca ghi "đã xác nhận".
