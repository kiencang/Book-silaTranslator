import { Component, input, output, model } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-ai-analysis',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="mb-6 p-5 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-white shadow-sm flex flex-col gap-4">
      <div>
        <h4 class="text-sm font-bold text-indigo-900 mb-1 flex items-center space-x-2">
          <mat-icon class="!text-base !w-5 !h-5 text-indigo-600">auto_awesome</mat-icon>
          <span>Quét mã nguồn sách để chia khối (Tùy chọn)</span>
        </h4>
        <div class="text-xs text-indigo-700 leading-relaxed mb-3 space-y-1.5">
          <p>AI sẽ quét mã nguồn sách để chọn phương án chia khối chuẩn nhất, giúp việc dịch thuật sau này được liền mạch và không bị gián đoạn.</p>
          <p>Hữu ích nếu bạn không rõ cách phân chia thế nào cho hợp lý. Trường hợp đã nắm rõ, bạn nên thực hiện việc phân chia thủ công trong mục "Điều chỉnh cách phân chia" bằng các tùy chọn bên dưới, điều đó sẽ giúp tiết kiệm một khoản token miễn phí dùng để phân tích. Ngay cả khi bạn đã phân tích tự động, bạn vẫn có quyền điều chỉnh lại cách chia bằng thao tác thủ công.</p>
        </div>
        <div class="flex items-center gap-4 text-xs font-medium text-indigo-800">
          <div class="flex items-center gap-1.5 bg-white/60 px-2.5 py-1 rounded-md border border-indigo-100">
            <mat-icon class="!text-[14px] !w-3.5 !h-3.5 text-indigo-500">article</mat-icon>
            <span>~{{ formatNumber(totalWords()) }} từ</span>
          </div>
          <div class="flex items-center gap-1.5 bg-white/60 px-2.5 py-1 rounded-md border border-indigo-100">
            <mat-icon class="!text-[14px] !w-3.5 !h-3.5 text-indigo-500">token</mat-icon>
            <span>~{{ formatNumber(estimatedTokens()) }} token</span>
          </div>
        </div>
        
        <div class="mt-3 flex items-center gap-3">
          <div class="max-w-[250px] flex-1">
            <select [value]="analysisModel()" (change)="analysisModel.set($any($event.target).value)" [disabled]="isAnalyzing()" class="w-full pl-3 pr-8 py-1.5 text-xs text-indigo-900 bg-white/80 border-indigo-200 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-lg border disabled:cursor-not-allowed">
              <option value="gemini-flash-lite-latest">Lite (Rẻ & Nhanh nhất)</option>
              <option value="gemini-flash-latest">Flash (Cân bằng & Tinh tế)</option>
            </select>
          </div>
          <div class="max-w-[150px] flex-1">
            <select [value]="samplePercentage()" (change)="samplePercentage.set(+$any($event.target).value)" [disabled]="isAnalyzing()" class="w-full pl-3 pr-8 py-1.5 text-xs text-indigo-900 bg-white/80 border-indigo-200 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-lg border disabled:cursor-not-allowed">
              <option value="25">Lấy mẫu 25%</option>
              <option value="50">Lấy mẫu 50%</option>
              <option value="100">Lấy mẫu 100%</option>
            </select>
          </div>
        </div>
      </div>
      <div class="flex justify-end mt-2">
        <button 
          (click)="analyze.emit()"
          [disabled]="isAnalyzing()"
          class="flex-shrink-0 w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-wait">
          @if (isAnalyzing()) {
            <mat-icon class="animate-spin !text-base !w-5 !h-5 hidden sm:block">autorenew</mat-icon>
            <span>Đang phân tích...</span>
          } @else {
            <mat-icon class="!text-base !w-5 !h-5 hidden sm:block">memory</mat-icon>
            <span>Bắt đầu phân tích bằng AI</span>
          }
        </button>
      </div>
    </div>
  `
})
export class AiAnalysisComponent {
  isAnalyzing = input.required<boolean>();
  totalWords = input.required<number>();
  estimatedTokens = input.required<number>();
  
  analysisModel = model.required<string>();
  samplePercentage = model.required<number>();

  analyze = output<void>();

  formatNumber(val: number): string {
    if (val === 0) return '0';
    if (val < 1000) return Math.round(val).toString();
    return (val / 1000).toFixed(1) + 'K';
  }
}
