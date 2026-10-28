import React from "react";
import { BieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong.jsx";
import { BIEU_TUONG_TONG } from "../../hien-thi/huy-hieu/HuyHieu.jsx";
import { Nut } from "../../hanh-dong/nut/Nut.jsx";

export function DaiThongBao({ ton = "bien", tieuDe, hanhDong, onDong, children, className = "" }) {
  return (
    <div className={"ib-dai ib-dai--" + ton + " " + className} role={ton === "do" ? "alert" : "status"}>
      <BieuTuong ten={BIEU_TUONG_TONG[ton]} className="ib-dai__bt" />
      <div className="ib-dai__chu">
        {tieuDe ? <p className="ib-dai__tieu-de">{tieuDe}</p> : null}
        {children ? <p className="ib-dai__noi-dung">{children}</p> : null}
        {hanhDong ? <div className="ib-dai__hd"><Nut cap="loi-nho" bieuTuong={hanhDong.bieuTuong} dangTai={hanhDong.dangTai} onClick={hanhDong.onClick}>{hanhDong.nhan}</Nut></div> : null}
      </div>
      {onDong ? <Nut cap="loi-nho" bieuTuong="close" nhan="Ẩn thông báo" className="ib-dai__dong" onClick={onDong} /> : null}
    </div>
  );
}
