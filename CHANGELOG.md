# Changelog

Tất cả những thay đổi đáng chú ý của dự án kiencang/Book-silaTranslator sẽ được ghi lại trong file này.

Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
và dự án này tuân thủ [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
- Mỗi khối có quyền tạo bảng đại từ & từ khó riêng.

## [v1.0.44]- 2026-05-16
### Fixed
- Chỉnh giao diện, để các Modal xuất hiện từ từ, thay vì đột ngột.

## [v1.0.43]- 2026-05-16
### Fixed
- Cập nhật SI bản mới nhất.
- Tinh chỉnh lại giao diện.

## [v1.0.42]- 2026-05-16
### Fixed
- Hạ chunk tối đa của phần thuật ngữ từ khó xuống 10 ngàn từ để nó tìm được danh sách từ khó đầy đủ hơn.
- Loại bỏ một chỉ thị SI dịch tổng rất khó thực thi trong thực tế.

## [v1.0.41]- 2026-05-15
### Fixed
- Cập nhật SI bản mới nhất, không kiểm duyệt các từ tục trong tác phẩm Văn học.
- Loại bỏ phần tỷ lệ trích xuất văn bản trong phần Đại từ & Từ khó, vì hiện tại chúng ta luôn lấy đầy đủ 100% nội dung.
- Lưu trữ tạm bảng Đại từ/Từ khó trong quá trình phân tích để đề phòng gián đoạn.

## [v1.0.40]- 2026-05-15
### Fixed
- Điều chỉnh giao diện ở phần chia khối dịch cho rõ ràng, dễ hiểu hơn.
- Chỉnh khoảng cách mỗi khối dịch ở trong phase Dịch thuật.
- Vô hiệu hóa một số button trong phase Đại từ & Từ khó khi quá trình trao đổi với AI đang diễn ra.
- Hạ số request gửi đồng thời ở model Pro xuống còn 2 khi phân tích Đại từ & Từ khó. Chỉ model Flash là còn giữ nguyên 4.

## [v1.0.39]- 2026-05-15
### Fixed
- Thêm tính năng cắt file PDF ngay trong giao diện.
- Thêm ước tính dung lượng file PDF.
- Thêm tính năng up lại file PDF.
- Bổ sung thêm thông tin các giới hạn của file tải lên.
- Sửa placeholder của phần Đại từ và phần Từ khó để nó phù hợp hơn.

## [v1.0.38]- 2026-05-15
### Fixed
- Cập nhật SI/Prompt phiên bản mới nhất. Điều chỉnh khả năng chuyển PDF sang markdown.
- Giảm chunk từ PDF sang markdown từ 50 trang xuống còn 30 trang mỗi lượt.
- Tính năng ước lượng số lượng token PDF đầu vào.

## [v1.0.37]- 2026-05-15
### Fixed
- Cập nhật SI/Prompt phiên bản mới nhất.
- Điều chỉnh tiêu đề trong phần chia sách phù hợp hơn nếu nó chỉ có một khối.

## [v1.0.36]- 2026-05-14
### Fixed
- Cập nhật SI/Prompt phiên bản mới nhất.

## [v1.0.35]- 2026-05-14
### Fixed
- Chuẩn hóa bảng đại từ, bằng bước trung gian để AI viết lại dựa trên bảng đại từ tổng thể sơ bộ (tổng hợp từ các chunk) & toàn bộ nội dung gốc, điều đó giúp có một bảng đại từ chất lượng tốt hơn so với việc loại bỏ trùng lặp thuần túy bằng code dễ có nhiều sai lầm.
- Sửa lại text trong các thông báo trong các phase đại từ/từ khó/dịch thuật để chúng dễ hiểu hơn.
- Thông báo rõ ràng hơn danh sách từ khó/thuật ngữ nào đang dùng tại phiên bản dịch cụ thể của khối/block.
- Đổi font chữ Nunito thành font chữ Lexend để tối ưu việc đọc cho người khó đọc.

## [v1.0.34]- 2026-05-14
### Fixed
- Xây dựng một quy tắc kinh nghiệm để kiểm tra độ tin cậy của tương đương ID trong khi xem ở chế độ song ngữ.
- Nếu quy tắc này thỏa mãn việc thao tác click xem giữa 2 bên được CSS mạnh hơn để việc đối chiếu rõ ràng hơn.
- Nếu không thảo mãn quay lại cách đơn giản là cho ID tiếng Anh tương ứng với ID tiếng Việt ra giữa màn hình.
- Điều chỉnh số lượng từ mỗi chunking trong phần xác định từ khó từ 30 ngàn từ tối đa xuống 20 ngàn từ.

## [v1.0.33]- 2026-05-14
### Fixed
- Bổ sung thinkingLevel là HIGH cho phần lọc thuật ngữ.
- Chế độ xem song ngữ Anh - Việt.

## [v1.0.32]- 2026-05-14
### Fixed
- Giảm tải danh sách từ khó/thuật ngữ theo từng khối dịch, không đưa toàn bộ danh sách cả cả cuốn sách cho từng khối.

## [v1.0.31]- 2026-05-14
### Fixed
- Chia tách mã nguồn phase2 (chia chương sách) thành các phần nhỏ hơn cho dễ quản lý.
- Sắp xếp danh sách từ khó, đại từ theo thứ tự ABC.

## [v1.0.30]- 2026-05-14
### Fixed
- Chuyển mặc định chuyển đổi PDF thành markdown bằng model `gemini-flash-lite-latest` cho tốc độ cao và rẻ hơn.
- Loại bỏ tính năng xuất nhanh Đại từ/Từ khó ở trong phase2, vì hiện các phase chuyên đang làm nhiệm vụ này tốt hơn nhiều.
- Điều chỉnh phần xác định cách chia sách bằng AI bằng các model rẻ hơn và lấy mẫu ít hơn do lúc này nhiệm vụ không còn phải gồng gánh phần Đại từ & Từ khó nữa.
- Đổi tên file SI & Prompt cho phù hợp với mục đích của nó (phân tích các chương sách).

## [v1.0.29]- 2026-05-14
### Fixed
- Đổi text ở button Đại từ và Từ khó để chúng rõ ràng hơn.
- Chia sách thành nhiều phần để phân tích Từ khó, sau đó gộp lại, loại bỏ trùng lặp, điều đó giúp chất lượng tốt hơn và xử lý nhanh hơn.
- Chia sách thành nhiều phần để phân tích Đại từ, sau đó gộp lại, loại bỏ trùng lặp, điều đó giúp chất lượng tốt hơn và xử lý nhanh hơn.

## [v1.0.28]- 2026-05-13
### Fixed
- Thêm đồng hồ đếm giờ trong phần dịch để đỡ nhàm chán và phát tín hiệu ứng dụng đang hoạt động rõ ràng hơn cho người dùng.
- Bổ sung thêm thông tin trong phần SI Đại từ nhân xưng và phân tích Từ khó.

## [v1.0.27]- 2026-05-13
### Fixed
- Điều chỉnh SI `all_in_one_system_instructions.md` để nó nhận ra heading h2 dạng gạch dưới chân.
- Chỉnh lại SI tổng cho việc dịch từ Anh sang Việt.

## [v1.0.26]- 2026-05-12
### Fixed
- Vô hiệu hóa header khi `Bắt đầu phân tích bằng AI` được kích hoạt nhằm chặn các thao tác không mong muốn (ví dụ khi click nhầm).
- Tính năng lưu version cho bảng Đại từ và Từ khó.
- Thay đổi temperature phù hợp hơn cho phần Đại từ (0.1) và Từ khó (0.2).
- Thiết kế lại nút ở phần `Phân tích toàn diện bằng AI (Đề xuất)` để nó thay đổi theo việc có dữ liệu ở bảng ĐT & TK hay chưa, mục đích là để tránh tạo lại dữ liệu do hiểu nhầm.

## [v1.0.25]- 2026-05-12
### Fixed
- Thêm `thinkingLevel: 'HIGH'` vào tất cả các model AI đem ra phân tích.
- Đồng bộ hóa việc trả về định dạng JSON khi phân tích riêng lẻ ở phase Đại từ & phase Từ khó.
- Chỉnh lại SI của phase phân tích toàn diện để nó chi tiết hơn.

## [v1.0.24]- 2026-05-12
### Fixed
- Bổ sung một bước để AI phân tích toàn diện trước khi dịch, giảm các thao tác thủ công.
- Điều chỉnh một chút ở phase Đại từ & Từ khó. Luôn phân tích 100% dữ liệu để đảm bảo chất lượng cao nhất có thể.

## [v1.0.23]- 2026-05-12
### Fixed
- Cung cấp khả năng đổi tên cho dự án.
- Cải tiến khả năng chia cắt sách bằng hàm đệ quy chia đôi với ngưỡng tối đa có thể điều chỉnh được.

## [v1.0.22]- 2026-05-12
### Fixed
- Refactoring phần chia chương sách để nó gọn gàng và rõ ràng hơn.
- Điều chỉnh phần `Tùy chọn 1: Chia theo Từ khóa Tiêu đề` để các thay đổi từ khóa được áp dụng luôn, đỡ cho người dùng một thao tác bấm.
- Sửa một số text thông báo trong phase tách sách thành các block để nó phù hợp hơn.
- Tinh chỉnh phần trích xuất đại từ và từ khó để khi hover qua các phần bị block trong quá trình tương tác với AI được rõ ràng hơn.

## [v1.0.21]- 2026-05-12
### Fixed
- Thêm nút áp dụng điều chỉnh số từ tiện dùng vào phase chia tách sách.
- Thay đổi số từ mặc định của phần `Số từ tối thiểu mỗi phần` từ 1000 lên 5000.
- Cải thiện tốc độ của hàm đếm số lượng từ mỗi chương để nó nhanh hơn.
- Đẩy khối cuối cùng có số lượng từ vụn lên khối liền kế, tránh phải dịch một khối có số lượng từ quá ít, ảnh hưởng đến ngữ cảnh (ví dụ dưới 1000 từ).
- Loại trừ các khối Gutenberg khỏi phần dịch và trích xuất đại từ và từ khó.
- Phần trước, phần sau ở chế độ toàn màn hình phải là các block liền kề, không được phép nhảy cóc.

## [v1.0.20]- 2026-05-11
### Fixed
- Cấu hình cách phân chia cuốn sách theo cách tốt hơn (áp dụng được cho nhiều trường hợp khác nhau).
- Cụ thể là chia được theo thẻ H2, H3, không nhất thiết chỉ chia theo từ khóa chapter, section, part, ..

## [v1.0.19]- 2026-05-11
### Fixed
- Cho phép xóa ngay lập tức hàng hoặc cột rỗng ở phần Đại từ nhân xưng và Từ khó.
- Bảo vệ luồng đọc tự nhiên của người dùng bằng cách thêm button `Phần trước` & `Phần sau` vào cuối chương/block.
- Thêm chú thích có thể bấm vào trong bài viết (click sẽ di chuyển tới phần cuối để xem chú thích).

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
