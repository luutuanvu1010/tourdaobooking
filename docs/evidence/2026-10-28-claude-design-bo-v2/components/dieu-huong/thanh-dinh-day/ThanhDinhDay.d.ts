/** Thanh dính đáy — nút chốt trong tầm ngón cái: 52 hết ngang ở điện thoại, 44 canh phải từ 768. */
export interface ThanhDinhDayProps {
  /** Dòng tóm tắt (tiền, số khách). */
  tomTat?: React.ReactNode;
  /** 1–2 Nut: Phụ trước, Chính sau. */
  children: React.ReactNode;
  className?: string;
}
export declare function ThanhDinhDay(props: ThanhDinhDayProps): JSX.Element;
