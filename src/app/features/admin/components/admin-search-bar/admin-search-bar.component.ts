import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-admin-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <mat-form-field appearance="outline" class="search-bar">
      <mat-label>{{ label }}</mat-label>
      <input
        matInput
        [ngModel]="value"
        (ngModelChange)="valueChange.emit($event)"
        [placeholder]="placeholder"
      />
      <mat-icon matPrefix>search</mat-icon>
      <button
        *ngIf="value"
        type="button"
        mat-icon-button
        matSuffix
        aria-label="Limpiar busqueda"
        (click)="valueChange.emit('')"
      >
        <mat-icon>close</mat-icon>
      </button>
    </mat-form-field>
  `,
  styles: [`
    .search-bar {
      width: min(420px, 100%);
      margin-bottom: 18px;
    }
  `]
})
export class AdminSearchBarComponent {
  @Input() label = 'Buscar';
  @Input() placeholder = '';
  @Input() value = '';

  @Output() readonly valueChange = new EventEmitter<string>();
}
