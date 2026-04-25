import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-auth-hero',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <section class="hero-panel">
      <div class="hero-header">
        <span class="eyebrow">LaneFlow Studio</span>
      </div>

      <div class="visual-stage">
        <div class="floating-card primary-card">
          <mat-icon>timeline</mat-icon>
          <div>
            <strong>Flujos y tramites</strong>
            <small>Disena, ejecuta y supervisa procesos de principio a fin.</small>
          </div>
        </div>

        <div class="floating-card secondary-card">
          <mat-icon>auto_awesome</mat-icon>
          <div>
            <strong>Integracion de IA</strong>
            <small>Asistencia para construir y optimizar procesos.</small>
          </div>
        </div>

        <div class="floating-card accent-card">
          <mat-icon>device_hub</mat-icon>
          <div>
            <strong>Diagramas claros</strong>
            <small>Modelado visual simple para flujos operativos.</small>
          </div>
        </div>

        <div class="floating-card analytics-card">
          <mat-icon>monitoring</mat-icon>
          <div>
            <strong>Analitica operativa</strong>
            <small>Deteccion temprana de cuellos de botella y demoras.</small>
          </div>
        </div>
      </div>

      <div class="hero-copy">
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
      padding: 24px;
      border-radius: 22px;
      background:
        radial-gradient(circle at top right, rgba(255, 255, 255, 0.08), transparent 24%),
        linear-gradient(180deg, #4b69b6 0%, #3f5ead 100%);
      color: #f6f7fb;
      display: grid;
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

    .hero-copy {
      position: relative;
      z-index: 1;
      max-width: 300px;
    }

    .hero-header {
      position: relative;
      z-index: 1;
      display: flex;
      justify-content: center;
      padding-top: 14px;
      padding-bottom: 14px;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      width: fit-content;
      padding: 0 18px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.12);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      line-height: 1;
      text-align: center;
    }

    .visual-stage {
      position: relative;
      z-index: 1;
      height: 264px;
      border-radius: 18px;
      margin-top: 4px;
    }

    .floating-card {
      position: absolute;
      display: grid;
      grid-template-columns: 20px 1fr;
      align-items: start;
      gap: 10px;
      width: 178px;
      padding: 12px 13px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.94);
      color: #2f3d60;
      box-shadow: 0 14px 30px rgba(33, 52, 99, 0.18);
    }

    .primary-card {
      left: 14px;
      top: 18px;
      transform: rotate(-8deg);
    }

    .secondary-card {
      right: 6px;
      top: 18px;
      transform: rotate(7deg);
    }

    .accent-card {
      left: 22px;
      bottom: 16px;
      transform: rotate(-4deg);
    }

    .analytics-card {
      right: 10px;
      bottom: 20px;
      transform: rotate(4deg);
    }

    .floating-card strong,
    .floating-card small {
      display: block;
    }

    .floating-card strong {
      margin-bottom: 8px;
      font-size: 0.8rem;
      line-height: 1.2;
      color: #2f3d60;
    }

    .floating-card small {
      color: #66748f;
      line-height: 1.35;
      font-size: 0.68rem;
    }

    .floating-card mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
      color: #4b69b6;
    }

    h1 {
      margin: 0 0 10px;
      font-size: clamp(1.5rem, 2vw, 2.1rem);
      line-height: 1.06;
    }

    p {
      margin: 0;
      max-width: 30ch;
      font-size: 0.86rem;
      line-height: 1.58;
      color: rgba(244, 247, 251, 0.8);
    }

    @media (max-width: 960px) {
      .hero-panel {
        padding: 22px;
      }

      .visual-stage {
        height: 320px;
      }

      .hero-header {
        padding-top: 10px;
        padding-bottom: 10px;
      }
    }
  `]
})
export class AuthHeroComponent {}
