import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { interval } from 'rxjs';

import { FeatureCardComponent } from '../feature-card/feature-card.component';

export interface FeatureCardItem {
  icon: string;
  title: string;
  description: string;
  badge?: string;
}

@Component({
  selector: 'app-feature-carousel',
  standalone: true,
  imports: [CommonModule, FeatureCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="carousel">
      <div class="carousel__stage">
        <div
          *ngFor="let item of items; let i = index; trackBy: trackByIndex"
          class="carousel__slot"
          [class.is-active]="i === activeIndex()"
          [attr.aria-hidden]="i !== activeIndex()"
        >
          <app-feature-card
            [icon]="item.icon"
            [title]="item.title"
            [description]="item.description"
            [badge]="item.badge"
          />
        </div>
      </div>

      <div class="carousel__dots" role="tablist" aria-label="Indicadores del carrusel">
        <button
          *ngFor="let item of items; let i = index; trackBy: trackByIndex"
          type="button"
          role="tab"
          class="carousel__dot"
          [class.is-active]="i === activeIndex()"
          [attr.aria-selected]="i === activeIndex()"
          [attr.aria-label]="'Mostrar tarjeta ' + (i + 1)"
          (click)="goTo(i)"
        ></button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .carousel {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .carousel__stage {
      position: relative;
      height: 158px;
    }

    .carousel__slot {
      position: absolute;
      inset: 0;
      opacity: 0;
      transform: translateX(36px);
      transition: opacity 520ms ease, transform 520ms ease;
      pointer-events: none;
    }

    .carousel__slot.is-active {
      opacity: 1;
      transform: translateX(0);
      pointer-events: auto;
    }

    .carousel__dots {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      min-height: 12px;
    }

    .carousel__dot {
      width: 22px;
      height: 6px;
      padding: 0;
      border: 0;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.32);
      cursor: pointer;
      transition: background 320ms ease, width 320ms ease;
    }

    .carousel__dot:hover {
      background: rgba(255, 255, 255, 0.55);
    }

    .carousel__dot.is-active {
      background: rgba(255, 255, 255, 0.95);
      width: 28px;
    }

    .carousel__dot:focus-visible {
      outline: 2px solid rgba(255, 255, 255, 0.7);
      outline-offset: 2px;
    }
  `]
})
export class FeatureCarouselComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) items: FeatureCardItem[] = [];
  @Input() autoPlayMs = 4500;

  protected readonly activeIndex = signal(0);

  ngOnInit(): void {
    if (this.autoPlayMs <= 0 || this.items.length <= 1) {
      return;
    }

    interval(this.autoPlayMs)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.activeIndex.update((current) => (current + 1) % this.items.length);
      });
  }

  protected goTo(index: number): void {
    this.activeIndex.set(index);
  }

  protected trackByIndex(index: number): number {
    return index;
  }
}
