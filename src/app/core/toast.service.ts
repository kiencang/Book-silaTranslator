import { Injectable, signal } from '@angular/core';

export type ToastType = 'error' | 'success' | 'info';

export interface ToastConfig {
  message: string;
  type: ToastType;
}

/**
 * ToastService - Hệ thống quản lý thông báo tập trung
 * Ý tưởng "Cách tiếp cận hỗn hợp": 
 * - Quản lý trạng thái và logic hiển thị ở một nơi (ToastService).
 * - Component UI được tách riêng giúp dễ tái sử dụng và tinh chỉnh giao diện.
 * - Các thông báo tĩnh (static) được định nghĩa sẵn qua object `Messages` với comment rõ ràng.
 * - Vẫn cho phép truyền thông báo động (dynamic) khi cần thiết (ví dụ: lỗi từ máy chủ).
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly currentToast = signal<ToastConfig | null>(null);
  private timeoutId: any = null;

  /**
   * Từ điển các thông báo (Toast) chuẩn trong hệ thống.
   * Việc tập trung các chuỗi thông báo tại đây giúp:
   * 1. Nhất quán nội dung hiển thị trên toàn hệ thống.
   * 2. Dễ dàng đổi mới, chỉnh sửa thông điệp (hay thậm chí đa ngôn ngữ sau này).
   * 3. Team dễ theo dõi các loại thông báo đang có.
   */
  readonly Messages = {
    // -- Lỗi tải file --
    FILE_INVALID_FORMAT: 'Định dạng file không được hỗ trợ. Vui lòng tải lên file TXT, HTML hoặc PDF.',
    FILE_TOO_LARGE: (limitMB: number, ext: string) => `Dung lượng file vượt giới hạn (${limitMB}MB đối với file .${ext}). Vui lòng chọn file nhẹ hơn.`,
    FILE_PROCESS_SUCCESS: 'Xử lý file thành công!',
    FILE_PROCESS_ERROR: (msg: string) => `Lỗi khi xử lý file: ${msg}`,
    FILE_PROCESSING_PAGE: (start: number, end: number, total: number) => `Đang xử lý trang ${start} đến ${end} / ${total}...`,
    
    // -- Quản lý dự án --
    PROJECT_IMPORT_SUCCESS: 'Đã nhập dự án thành công!',
    PROJECT_IMPORT_DRAFT_ERROR: 'File không hợp lệ hoặc dữ liệu bị lỗi.',
    PROJECT_IMPORT_ERROR: 'Có lỗi xảy ra khi đọc file dự án.',
    PROJECT_BACKUP_SUCCESS: 'Đã sao lưu dự án thành công!',
    PROJECT_DELETE_SUCCESS: 'Đã xóa dự án thành công!',

    // -- Export --
    EXPORT_HTML_SUCCESS: 'Đã xuất file bản dịch HTML thành công!',
    EXPORT_HTML_ERROR: 'Có lỗi xảy ra khi xuất file HTML',
    DOWNLOAD_MARKDOWN_SUCCESS: 'Đã tải về file Markdown thành công!',
    DOWNLOAD_MARKDOWN_ERROR: 'Có lỗi xảy ra khi tải file Markdown',

    // -- Trích xuất siêu dữ liệu (Thuật ngữ, Xưng hô) --
    NO_CONTENT_TO_ANALYZE: 'Không có nội dung sách để phân tích.',
    GLOSSARY_SUCCESS: 'Tạo bảng thuật ngữ thành công!',
    GLOSSARY_ERROR: (err: string) => `Lỗi tạo bảng thuật ngữ: ${err}`,
    PRONOUNS_SUCCESS: 'Tạo bảng xưng hô thành công!',
    PRONOUNS_ERROR: (err: string) => `Lỗi tạo bảng đại từ: ${err}`,

    // -- Dịch thuật --
    TRANSLATION_COMPLETED: 'Dịch hoàn tất toàn bộ!',
    TRANSLATION_ERROR: (title: string, err: string) => `Dịch thất bại đối với ${title}: ${err}`
  };

  /**
   * Hiển thị thông báo Thành công
   * @param message Nội dung thông báo
   */
  success(message: string) {
    this.show(message, 'success');
  }

  /**
   * Hiển thị thông báo Lỗi
   * @param message Nội dung thông báo
   */
  error(message: string) {
    this.show(message, 'error');
  }

  /**
   * Hiển thị thông báo Thông tin / Đang xử lý
   * @param message Nội dung thông báo
   */
  info(message: string) {
    this.show(message, 'info');
  }

  /**
   * Đóng Toast hiện tại
   */
  close() {
    this.currentToast.set(null);
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  private show(message: string, type: ToastType) {
    this.currentToast.set({ message, type });
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    // Đóng tự động sau 7 giây để người dùng kịp đọc các thông báo lỗi dài
    this.timeoutId = setTimeout(() => {
      const current = this.currentToast();
      if (current && current.message === message) {
        this.currentToast.set(null);
      }
    }, 7000);
  }
}
