import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  forwardRef,
  Input,
  Output,
} from '@angular/core';
import {
  type ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

@Component({
  selector: 'app-select-global',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectGlobalComponent),
      multi: true,
    },
  ],
  host: {
    '[attr.id]': 'null',
    class: 'block',
  },
  template: `
    <div class="relative w-full">
      <select
        [id]="id"
        [disabled]="disabled"
        [ngModel]="value"
        (ngModelChange)="onValueChange($event)"
        (blur)="onTouched()"
        [ngClass]="customClass"
        class="w-full bg-slate-50/80 hover:bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 text-[12px] font-semibold rounded-md focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 block py-1.5 px-2.5 outline-none transition-all appearance-none pr-8 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer truncate shadow-2xs"
      >
        <ng-content></ng-content>
      </select>
      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-3.5 h-3.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </div>
  `,
})
export class SelectGlobalComponent implements ControlValueAccessor {
  @Input() id = '';
  @Input() customClass = '';
  @Output() readonly cambio = new EventEmitter<unknown>();

  value: unknown = '';
  disabled = false;

  onChange: (value: unknown) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(val: unknown): void {
    this.value = val;
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onValueChange(val: unknown) {
    this.value = val;
    this.onChange(val);
    this.cambio.emit(val);
  }
}
