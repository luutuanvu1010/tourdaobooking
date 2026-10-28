import React from "react";
import { BieuTuong } from "../bieu-tuong/BieuTuong.jsx";

// Từ vựng trạng thái — "một ý nghĩa, một hình": mỗi trạng thái đúng một chữ, một tông, một biểu tượng.
export const TU_VUNG_TRANG_THAI = {
  "cho-xac-nhan": ["cat", "Chờ xác nhận"], "chua-xep": ["cat", "Chưa xếp"], "sap-het-han": ["cat", "Sắp hết hạn"], "chua-ai-nhan": ["cat", "Chưa ai nhận"], "ve-moi": ["cat", "Vé mới"],
  "dang-xu-ly": ["bien", "Đang xử lý"], "dang-chay": ["bien", "Đang chạy"], "da-xep": ["bien", "Đã xếp"], "da-giao": ["bien", "Đã giao"],
  "da-xac-nhan": ["la", "Đã xác nhận"], "hoan-tat": ["la", "Hoàn tất"], "con-han": ["la", "Còn hạn"], "da-thu-du": ["la", "Đã thu đủ"], "ve-xong": ["la", "Vé xong"],
  "da-huy": ["do", "Đã huỷ"], "tu-choi": ["do", "Từ chối"], "het-han": ["do", "Hết hạn"], "qua-han": ["do", "Quá hạn"], "giu-lai": ["do", "Giữ lại"],
  "nhap": ["xam", "Nháp"], "ngung-dung": ["xam", "Ngưng dùng"], "da-khoa": ["xam", "Đã khoá"], "khong-con-trong-sheet": ["xam", "Không còn trong Sheet"],
};
export const BIEU_TUONG_TONG = { cat: "clock", bien: "swap", la: "check", do: "alert", xam: "ban" };

export function HuyHieu({ trangThai, ton, children, className = "" }) {
  const tv = TU_VUNG_TRANG_THAI[trangThai];
  const t = tv ? tv[0] : ton || "xam";
  return (
    <span className={"ib-hh ib-hh--" + t + " " + className}>
      <BieuTuong ten={BIEU_TUONG_TONG[t]} co={14} />
      <span>{tv ? tv[1] : children}</span>
    </span>
  );
}
