# Changelog

Tất cả những thay đổi đáng chú ý của dự án kiencang/Book-silaTranslator sẽ được ghi lại trong file này.

Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
và dự án này tuân thủ [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.6]- 2026-05-08
### Fixed
- Sửa lỗi % ở phần trích xuất dữ liệu đem đi phân tích đại từ nhân xưng (lỗi 1 và 1.0).
- Tăng độ rộng ở phase2 / Đại từ nhân xưng.

## [v1.0.5]- 2026-05-08
### Fixed
- Cập nhật SI/Prompt.
- Bổ sung bảng đại từ nhân xưng.
- Thêm Thinking level HIGH vào mọi model và mọi phase.
- Thiết lập mặc temperature của phân tích đại từ nhân xưng là 0.3

## [v1.0.4]- 2026-05-08
### Fixed
- Tùy chỉnh việc chia khối dịch / phase2 (điều chỉnh từ khóa chia và số lượng từ mỗi khối).
- Điều chỉnh giao diện phase2 để nó có khả năng xem trước, giúp phát hiện vấn đề chia khối được tốt hơn.

## [v1.0.3]- 2026-05-08
### Fixed
- Sử dụng SI/Prompt riêng cho dịch sách.
- Đổi giao diện nhập dự án thành nhập Tác phẩm + Tác giả.

## [v1.0.2]- 2026-05-07
### Fixed
- Thêm thông tin phiên bản dịch cho từng khối dịch (tối đa 3 phiên bản, có thông tin model, temp, ngày giờ).
- Enter để tạo dự án mới, chứ không bắt buộc click vào button.

## [v1.0.1]- 2026-05-07
### Fixed
- Tải lại phiên bản đầu tiên bị thiếu file!
