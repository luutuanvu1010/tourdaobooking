/** Trang mất mạng — chỉ khi chưa có bản lưu; có bản lưu thì dùng DaiTrenTrang tông Cát. */
export interface TrangMatMangProps {
  lanXemCuoi?: string;
  dangThu?: boolean;
  onThuLai?: () => void;
  className?: string;
}
export declare function TrangMatMang(props: TrangMatMangProps): JSX.Element;
