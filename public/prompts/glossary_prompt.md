**[YÊU CẦU THỰC THI - GLOSSARY EXTRACTION]**

Đầu vào là tài liệu cần xử lý. Hãy phân tích nội dung và trích xuất Bảng thuật ngữ chuyên ngành/Từ khó dịch tiếng Anh - Việt, tuân thủ tuyệt đối toàn bộ quy định trong System Instruction. Bảng này sẽ làm chuẩn để dịch toàn bộ sách.

<metadata>
- Tên sách: {{tên sách}}
- Tác giả: {{tên tác giả}}
</metadata>

<source_text>
{{nội dung}}
</source_text>

**TRÌNH TỰ THỰC THI BẮT BUỘC CỦA BẠN:**
1. **Bước 1 (Phân tích):** Đọc toàn bộ nội dung, xác định Thể loại (Genre), Đối tượng độc giả (Target Audience) và Văn phong (Tone of voice).
2. **Bước 2 (Trích xuất nháp):** Lọc ra các từ thuộc Tier 1 và Tier 2.
3. **Bước 3 (Tinh lọc):** Kiểm tra lại danh sách. Nếu từ nào có thể hiểu theo nghĩa phổ thông trong ngữ cảnh này, hãy loại bỏ. Nếu là cụm từ chuyên biệt (N-grams), hãy giữ cả cụm.
4. **Bước 4 (Định dạng):** Chuyển đổi sang JSON. Đảm bảo các từ loại (pos) và ghi chú (contextNotes) hỗ trợ tối đa cho việc dịch thuật sau này.