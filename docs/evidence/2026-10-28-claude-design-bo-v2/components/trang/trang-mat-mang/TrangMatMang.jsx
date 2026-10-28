import React from "react";
import { BieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong.jsx";
import { Nut } from "../../hanh-dong/nut/Nut.jsx";

export function TrangMatMang({ lanXemCuoi, dangThu, onThuLai, className = "" }) {
  return (
    <main className={"ib-trang-bao " + className}>
      <span className="ib-trang-bao__bt ib-trang-bao__bt--cat"><BieuTuong ten="history" co={24} /></span>
      <h1 className="ib-trang-bao__tieu-de">Đang ngoài mạng</h1>
      <p className="ib-trang-bao__cau">Máy chưa lưu trang này từ lần xem trước. Kiểm tra kết nối mạng rồi bấm Thử lại.</p>
      {lanXemCuoi ? <p className="ib-trang-bao__phu">Lần đồng bộ gần nhất: {lanXemCuoi}</p> : null}
      <div className="ib-trang-bao__nut">
        <Nut cap="chinh" bieuTuong="swap" dangTai={dangThu} onClick={onThuLai}>{dangThu ? "Đang thử lại…" : "Thử lại"}</Nut>
      </div>
    </main>
  );
}
