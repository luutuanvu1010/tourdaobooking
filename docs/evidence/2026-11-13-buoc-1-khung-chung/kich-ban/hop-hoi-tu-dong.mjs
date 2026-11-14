// Bước 1 khung chung (13/11/2026): Nền tảng bỏ hết hộp hỏi của trình duyệt (`confirm()`), thay bằng hộp hỏi chung trong trang (`hoiXacNhan`, web/bang-truot.ts:
// `.sheet[role=alertdialog]`, nút đỏ `.sheet-foot-xac-nhan .btn-danger`, nút giữ `.sheet-foot-xac-nhan .btn:not(.btn-danger)`, câu hỏi = `<p>` trong `.sheet-body`).
// Các kịch bản Chrome cũ tự trả lời `window.confirm` (ghi câu, trả true/false). Đoạn này chạy TRONG TRANG: mỗi khi hộp hỏi trong trang hiện, nó hỏi lại đúng hàm trả lời
// mà kịch bản đã cài (`window.__traLoiHopHoi` nếu có, không thì `window.confirm` — kịch bản phải cài sẵn hàm giả, không bao giờ để confirm gốc của trình duyệt) với
// câu hỏi, rồi bấm nút đỏ (đồng ý) hoặc nút giữ (không). Nhờ vậy cách ghi câu và đáp án của từng kịch bản giữ nguyên; chỉ thêm một dòng tiêm đoạn này.
export const HOP_HOI_TU_DONG = `(() => {
  if (window.__hopHoiTuDong) return true;
  window.__hopHoiTuDong = true;
  const tra = () => {
    const hop = document.querySelector('.sheet[role="alertdialog"]:not([data-da-tra])');
    const nguy = hop && hop.querySelector('.sheet-foot-xac-nhan .btn-danger');
    if (!nguy) return;
    hop.setAttribute('data-da-tra', '1');
    const cau = (hop.querySelector('.sheet-body p') || {}).textContent || '';
    const hoi = typeof window.__traLoiHopHoi === 'function' ? window.__traLoiHopHoi : window.confirm;
    const dongY = !!hoi(cau.trim());
    setTimeout(() => (dongY ? nguy : hop.querySelector('.sheet-foot-xac-nhan .btn:not(.btn-danger)')).click(), 0);
  };
  new MutationObserver(tra).observe(document, { childList: true, subtree: true });
  return true;
})();`;
