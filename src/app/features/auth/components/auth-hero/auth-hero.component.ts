import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  FeatureCardItem,
  FeatureCarouselComponent
} from '../feature-carousel/feature-carousel.component';

@Component({
  selector: 'app-auth-hero',
  standalone: true,
  imports: [FeatureCarouselComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero-panel">
      <header class="hero-panel__header">
        <div class="brand-badge">
          <span class="brand-badge__logo">LF</span>
          <span class="brand-badge__name">LaneFlow Studio</span>
        </div>
      </header>

      <app-feature-carousel [items]="features" />

      <div class="hero-panel__copy">
        <h1>Bienvenido de nuevo</h1>
        <p>
          LaneFlow centraliza la operacion interna de la organizacion con una
          experiencia simple, clara y preparada para crecer con cada modulo.
        </p>
      </div>
    </section>
  `,
  styles: [`
    .hero-panel {
      position: relative;
      overflow: hidden;
      min-height: 100%;
      padding: 28px 24px;
      border-radius: 22px;
      background:
        radial-gradient(circle at top right, rgba(255, 255, 255, 0.08), transparent 24%),
        linear-gradient(180deg, #4b69b6 0%, #3f5ead 100%);
      color: #f6f7fb;
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 18px;
      box-shadow: 0 16px 32px rgba(63, 94, 173, 0.18);
    }

    .hero-panel::after {
      content: '';
      position: absolute;
      inset: auto -22px -22px auto;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.05);
    }

    .hero-panel__header {
      position: relative;
      z-index: 1;
      display: flex;
    }

    .brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }

    .brand-badge__logo {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      background: #f0b45a;
      color: #1d2433;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 3px 10px rgba(240, 180, 90, 0.35);
    }

    .brand-badge__name {
      font-size: 0.82rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      opacity: 0.92;
    }

    app-feature-carousel {
      position: relative;
      z-index: 1;
      align-self: center;
      width: 100%;
    }

    .hero-panel__copy {
      position: relative;
      z-index: 1;
      max-width: 320px;
    }

    .hero-panel__copy h1 {
      margin: 0 0 10px;
      font-size: clamp(1.5rem, 2vw, 2.1rem);
      line-height: 1.06;
    }

    .hero-panel__copy p {
      margin: 0;
      max-width: 32ch;
      font-size: 0.86rem;
      line-height: 1.58;
      color: rgba(244, 247, 251, 0.8);
    }

    @media (max-width: 960px) {
      .hero-panel {
        padding: 22px;
      }
    }
  `]
})
export class AuthHeroComponent {
  protected readonly features: FeatureCardItem[] = [
    {
      icon: 'timeline',
      title: 'Flujos y tramites',
      description:
        'Disena, ejecuta y supervisa procesos de principio a fin con etapas claras y responsables asignados.',
      badge: 'Procesos'
    },
    {
      icon: 'auto_awesome',
      title: 'Integracion de IA',
      description:
        'Asistencia inteligente para redactar pasos, sugerir validaciones y optimizar cuellos de botella.',
      badge: 'Copiloto'
    },
    {
      icon: 'device_hub',
      title: 'Diagramas claros',
      description:
        'Modelado visual con bloques reutilizables para representar trayectorias y decisiones del negocio.',
      badge: 'Visual'
    },
    {
      icon: 'monitoring',
      title: 'Analitica operativa',
      description:
        'Tableros con tiempos de ciclo, demoras y SLA para detectar problemas antes de que escalen.',
      badge: 'Insights'
    }
  ];
}
