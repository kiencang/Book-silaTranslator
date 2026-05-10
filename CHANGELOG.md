# Changelog

Tất cả những thay đổi đáng chú ý của dự án kiencang/Book-silaTranslator sẽ được ghi lại trong file này.

Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
và dự án này tuân thủ [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
- Yêu cầu không kiểm duyệt khi dịch (bổ sung vào SI).

## [v1.0.18]- 2026-05-11
### Fixed
- Dọn dẹp một số file trung gian đã hoàn thành nhiệm vụ, và do vậy không còn cần thiết nữa.
- Bổ sung giao diện chỉnh sửa trực quan hơn cho phần Đại từ nhân xưng & Thuật ngữ / Từ khó.

## [v1.0.17]- 2026-05-11
### Fixed
- Thu gọn lại không gian các phase trên header.
- Thay đổi màu sắc của giao diện.
- Bổ sung nút `Dừng dịch` ở phase Dịch thuật.
- Bổ sung yêu cầu xác nhận ở tất cả các yêu cầu dịch nhiều chương hoặc toàn bộ sách (để tránh người dùng tốn token).

## [v1.0.16]- 2026-05-10
### Fixed
- Tách chức năng thu gọn màn hình khỏi bộ công cụ điều chỉnh font, nền.
- Có ID cho thứ tự các chương để nó luôn sắp xếp đúng tuần tự khi hiển thị.
- Vô hiệu hóa hoàn toàn header khi có các thao tác dịch, trích xuất (chống chuyển phase khi đang tương tác với AI ở phase nào đó).

## [v1.0.15]- 2026-05-10
### Fixed
- Tối ưu mã nguồn, khắc phục các thông báo lỗi lặt vặt.
- Tối ưu IndexedDB, chia để trị, chỉnh sửa phần nào thao tác phân vùng db phần đó, không can thiệp toàn bộ db.
- Điều chỉnh vị trí của phần điều chỉnh font, cỡ chữ, màu nền (chuyển từ phải sang trái).

## [v1.0.14]- 2026-05-10
### Fixed
- Chế độ toàn màn hình và download cho từng chương/block đã dịch.
- Tăng khả năng điều chỉnh giao diện (font, cỡ chữ, màu nền) cho chế độ toàn màn hình.
- Cung cấp khả năng điều chỉnh tương tự cho cả file .html tải về (dự phòng cả trường hợp không có kết nối mạng internet).

## [v1.0.13]- 2026-05-10
### Fixed
- Thiết lập lưu tự động cho tính năng đại từ & từ khó. Tránh để người dùng bị mất dữ liệu.

## [v1.0.12]- 2026-05-10
### Fixed
- Điều chỉnh phase2/Chia sách để nó chỉ block khu vực thích hợp trong trường hợp đã có bản dịch.
- Quá trình chuyển đổi PDF -> markdown cần có phase trung gian để tránh việc gián đoạn làm mất công sức chuyển đổi trước đó.

## [v1.0.11]- 2026-05-09
### Fixed
- Kiểm soát các toast tốt hơn.
- Cải tiến việc di chuyển qua lại giữa các phase.
- Điều chỉnh text thông báo ở các phase.

## [v1.0.10]- 2026-05-09
### Fixed
- Tách file PDF dài thành các phần, gửi lên nhận về kết quả rồi ghép lại.
- Triển khai tính năng xuất/nhập dự án.
- Lưu lại cấu hình thiết lập đại từ và từ khó để hiển thị chính xác khi người dùng quay lại để điều chỉnh.

## [v1.0.9]- 2026-05-09
### Fixed
- Tái cấu trúc lại mã nguồn để phục vụ nhu cầu mở rộng sau này.
- Bổ sung SI/Prompt chuyên dụng để chuyển PDF thành markdown.
- Loại bỏ các thẻ rác (style, script,...) trong HTML khi chuyển sang markdown.
- Tách bạch thông tin thuộc dự án, nằm ở đầu và cuối thuộc Project Gutenberg. Để việc dịch tập trung đúng mục tiêu vào phần nội dung chính của sách.
- Thêm phần ước đoán số lượng token đầu vào và đầu ra.

## [v1.0.8]- 2026-05-09
### Fixed
- Vô hiệu hóa các nút bấm trong quá trình tạo Đại từ / Thuật ngữ; Tránh thao tác nhầm.
- Thực hiện các tinh chỉnh nhỏ khác cho giao diện.

## [v1.0.7]- 2026-05-08
### Fixed
- Bổ sung bảng thuật ngữ / từ khó dịch.

## [v1.0.6]- 2026-05-08
### Fixed
- Sửa lỗi % ở phần trích xuất dữ liệu đem đi phân tích đại từ nhân xưng (lỗi 1 và 1.0).
- Tăng độ rộng ở phase2 / Đại từ nhân xưng.
- Điều chỉnh lại thông báo khi người dùng muốn 'Dịch lại toàn bộ cuốn sách'.

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
