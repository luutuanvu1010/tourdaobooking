import React from "react";
import { BieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong.jsx";
import { Nut } from "../../hanh-dong/nut/Nut.jsx";

export function TrangRong({ bieuTuong = "orders", cau, phu, hanhDong, className = "" }) {
  return (
    <div className={"ib-rong " + className}>
      <span className="ib-rong__bt"><BieuTuong ten={bieuTuong} co={24} /></span>
      <p className="ib-rong__cau">{cau}</p>
      {phu ? <p className="ib-rong__phu">{phu}</p> : null}
      {hanhDong ? <Nut cap={hanhDong.cap || "chinh"} bieuTuong={hanhDong.bieuTuong} onClick={hanhDong.onClick}>{hanhDong.nhan}</Nut> : null}
    </div>
  );
}
