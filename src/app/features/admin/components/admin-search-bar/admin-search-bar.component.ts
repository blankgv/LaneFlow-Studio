import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="search-bar">
      <mat-icon class="search-bar__icon" aria-hidden="true">search</mat-icon>
      <input
        type="search"
        class="search-bar__input"
        [ngModel]="value"
        (ngModelChange)="valueChange.emit($event)"
        [placeholder]="placeholder || label"
        [attr.aria-label]="label"
      />
      <button
        *ngIf="value"
        type="button"
        class="search-bar__clear"
        aria-label="Limpiar busqueda"
        (click)="valueChange.emit('')"
      >
        <mat-icon>close</mat-icon>
      </button>
    </label>
  `,
  styles: [`
    .search-bar {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: min(360px, 100%);
      padding: 0 10px;
      height: 36px;
      border-radius: var(--radius);
      background: var(--surface);
      border: 1px solid var(--border);
      transition: border-color 120ms ease, box-shadow 120ms ease;
    }

    .search-bar:focus-within {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }

    .search-bar__icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .search-bar__input {
      flex: 1;
      min-width: 0;
      border: 0;
      outline: 0;
      background: transparent;
      font-size: 0.86rem;
      color: var(--text);
    }

    .search-bar__input::placeholder {
      color: var(--text-subtle);
    }

    .search-bar__input::-webkit-search-cancel-button {
      display: none;
    }

    .search-bar__clear {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: background 120ms ease, color 120ms ease;
    }

    .search-bar__clear:hover {
      background: var(--surface-hover);
      color: var(--text);
    }

    .search-bar__clear mat-icon {
      width: 14px;
      height: 14px;
      font-size: 14px;
    }
  `]
})
export class AdminSearchBarComponent {
  @Input() label = 'Buscar';
  @Input() placeholder = '';
  @Input() value = '';

  @Output() readonly valueChange = new EventEmitter<string>();
}
