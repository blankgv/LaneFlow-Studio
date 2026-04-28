import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { DynamicForm, FieldType } from '../../models/dynamic-form.model';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FlowConditionDialogData {
  id: string;
  name: string;
  condition: string;
  forms: DynamicForm[];
}

type VarKind = 'action' | 'string' | 'number' | 'boolean' | 'date';

interface ConditionVar {
  name: string;
  label: string;
  group: string;
  kind: VarKind;
  options?: string[];
}

interface ConditionOp {
  value: string;
  label: string;
  hasValue: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ACTION_OPTIONS = ['APPROVE', 'REJECT', 'OBSERVE', 'COMPLETE'];
const ACTION_LABELS: Record<string, string> = {
  APPROVE: 'Aprobado (APPROVE)',
  REJECT: 'Rechazado (REJECT)',
  OBSERVE: 'Observado (OBSERVE)',
  COMPLETE: 'Completado (COMPLETE)',
};

const SYSTEM_VARS: ConditionVar[] = [
  { name: 'lastAction', label: 'Acción anterior', group: 'Sistema', kind: 'action', options: ACTION_OPTIONS },
  { name: 'lastCompletedBy', label: 'Completado por (username)', group: 'Sistema', kind: 'string' },
  { name: 'lastComment', label: 'Comentario', group: 'Sistema', kind: 'string' },
  { name: 'procedureCode', label: 'Código de trámite', group: 'Sistema', kind: 'string' },
  { name: 'applicantDocumentNumber', label: 'Doc. del solicitante', group: 'Sistema', kind: 'string' },
  { name: 'startedBy', label: 'Iniciado por (username)', group: 'Sistema', kind: 'string' },
];

const OPS_STRING: ConditionOp[] = [
  { value: '==', label: 'igual a', hasValue: true },
  { value: '!=', label: 'diferente de', hasValue: true },
];

const OPS_NUMBER: ConditionOp[] = [
  { value: '==', label: 'igual a', hasValue: true },
  { value: '!=', label: 'diferente de', hasValue: true },
  { value: '>',  label: 'mayor que', hasValue: true },
  { value: '<',  label: 'menor que', hasValue: true },
  { value: '>=', label: 'mayor o igual a', hasValue: true },
  { value: '<=', label: 'menor o igual a', hasValue: true },
];

const OPS_BOOLEAN: ConditionOp[] = [
  { value: '== true',  label: 'es verdadero (true)',  hasValue: false },
  { value: '== false', label: 'es falso (false)', hasValue: false },
];

// Types that shouldn't appear as condition variables
const SKIP_TYPES = new Set<FieldType>(['FILE', 'IMAGE', 'PHOTO', 'AUDIO', 'VIDEO', 'DOCUMENT']);

function fieldKind(type: FieldType): VarKind | null {
  if (SKIP_TYPES.has(type)) return null;
  if (type === 'NUMBER') return 'number';
  if (type === 'CHECKBOX') return 'boolean';
  if (type === 'DATE') return 'date';
  return 'string';
}

function opsForKind(kind: VarKind): ConditionOp[] {
  if (kind === 'boolean') return OPS_BOOLEAN;
  if (kind === 'number' || kind === 'date') return OPS_NUMBER;
  return OPS_STRING;
}

function buildVarsFromForms(forms: DynamicForm[]): ConditionVar[] {
  const vars: ConditionVar[] = [];
  for (const form of forms) {
    const group = `Formulario: ${form.nodeName || form.title}`;
    for (const field of (form.fields ?? [])) {
      const kind = fieldKind(field.type);
      if (!kind) continue;
      vars.push({
        name: field.name,
        label: field.label || field.name,
        group,
        kind,
        options: (field.options && field.options.length > 0) ? field.options : undefined,
      });
    }
  }
  return vars;
}

// Try to parse a simple JUEL expression like ${varName op value}
function tryParse(expr: string): { varName: string; op: string; rawValue: string } | null {
  const m = expr.trim().match(/^\$\{(\w+)\s*(==|!=|>=|<=|>|<)\s*'?([^'}\s]*)'?\s*\}$/);
  if (!m) return null;
  return { varName: m[1], op: m[2], rawValue: m[3] };
}

// ─── Component ──────────────────────────────────────────────────────────────

@Component({
  selector: 'app-flow-condition-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="dialog">

      <header>
        <div class="header-title">
          <mat-icon>device_hub</mat-icon>
          <h2>Condición del flujo</h2>
        </div>
        <p *ngIf="data.name">Flujo: <strong>{{ data.name }}</strong></p>
        <p *ngIf="!data.name">Define qué condición debe cumplirse para tomar este camino.</p>
      </header>

      <!-- Mode toggle -->
      <div class="mode-tabs">
        <button
          class="mode-tab"
          [class.active]="mode() === 'visual'"
          (click)="switchMode('visual')"
          type="button"
        >
          <mat-icon>tune</mat-icon>
          Visual
        </button>
        <button
          class="mode-tab"
          [class.active]="mode() === 'advanced'"
          (click)="switchMode('advanced')"
          type="button"
        >
          <mat-icon>code</mat-icon>
          Expresión
        </button>
      </div>

      <div class="body">

        <!-- ── VISUAL MODE ─────────────────────────────────────────── -->
        <ng-container *ngIf="mode() === 'visual'">

          <!-- Variable selector -->
          <div class="field-group">
            <label class="field-label">Variable</label>
            <select class="sel" [ngModel]="selectedVarName()" (ngModelChange)="onVarChange($event)">
              <option value="">— Seleccionar variable —</option>
              <optgroup
                *ngFor="let group of varGroups()"
                [label]="group.name"
              >
                <option *ngFor="let v of group.vars" [value]="v.name">
                  {{ v.label }} <ng-container *ngIf="v.name !== v.label">({{ v.name }})</ng-container>
                </option>
              </optgroup>
            </select>
          </div>

          <ng-container *ngIf="selectedVar() as v">

            <!-- Operator selector (hidden for boolean) -->
            <div class="field-group" *ngIf="v.kind !== 'boolean'">
              <label class="field-label">Operador</label>
              <select class="sel" [ngModel]="selectedOp()" (ngModelChange)="selectedOp.set($event)">
                <option *ngFor="let op of availableOps()" [value]="op.value">{{ op.label }}</option>
              </select>
            </div>

            <!-- Boolean: special op selector with no value -->
            <div class="field-group" *ngIf="v.kind === 'boolean'">
              <label class="field-label">Condición</label>
              <select class="sel" [ngModel]="selectedOp()" (ngModelChange)="selectedOp.set($event)">
                <option *ngFor="let op of availableOps()" [value]="op.value">{{ op.label }}</option>
              </select>
            </div>

            <!-- Value: action dropdown -->
            <div class="field-group" *ngIf="v.kind === 'action' && currentOp()?.hasValue">
              <label class="field-label">Valor</label>
              <select class="sel" [ngModel]="conditionValue()" (ngModelChange)="conditionValue.set($event)">
                <option value="">— Seleccionar acción —</option>
                <option *ngFor="let opt of v.options" [value]="opt">{{ actionLabel(opt) }}</option>
              </select>
            </div>

            <!-- Value: SELECT/RADIO with options dropdown -->
            <div class="field-group" *ngIf="v.kind === 'string' && v.options && currentOp()?.hasValue">
              <label class="field-label">Valor</label>
              <select class="sel" [ngModel]="conditionValue()" (ngModelChange)="conditionValue.set($event)">
                <option value="">— Seleccionar —</option>
                <option *ngFor="let opt of v.options" [value]="opt">{{ opt }}</option>
              </select>
            </div>

            <!-- Value: free text string -->
            <div class="field-group" *ngIf="v.kind === 'string' && !v.options && currentOp()?.hasValue">
              <label class="field-label">Valor</label>
              <input
                class="inp"
                type="text"
                placeholder="Texto a comparar"
                [ngModel]="conditionValue()"
                (ngModelChange)="conditionValue.set($event)"
              >
            </div>

            <!-- Value: number input -->
            <div class="field-group" *ngIf="v.kind === 'number' && currentOp()?.hasValue">
              <label class="field-label">Valor</label>
              <input
                class="inp"
                type="number"
                placeholder="0"
                [ngModel]="conditionValue()"
                (ngModelChange)="conditionValue.set($event)"
              >
            </div>

            <!-- Value: date input -->
            <div class="field-group" *ngIf="v.kind === 'date' && currentOp()?.hasValue">
              <label class="field-label">Valor (YYYY-MM-DD)</label>
              <input
                class="inp"
                type="date"
                [ngModel]="conditionValue()"
                (ngModelChange)="conditionValue.set($event)"
              >
            </div>

          </ng-container>

          <!-- Preview expression -->
          <div class="preview" *ngIf="builtExpression()">
            <span class="preview__label">Expresión generada</span>
            <code class="preview__code">{{ builtExpression() }}</code>
          </div>

          <p class="no-vars-hint" *ngIf="allVars().length === SYSTEM_VARS_COUNT">
            <mat-icon>info</mat-icon>
            No hay formularios asignados a las tareas. Solo variables del sistema disponibles.
          </p>

        </ng-container>

        <!-- ── ADVANCED MODE ───────────────────────────────────────── -->
        <ng-container *ngIf="mode() === 'advanced'">
          <label class="field-label">Expresión JUEL (Camunda)</label>
          <textarea
            class="expr-input"
            rows="5"
            placeholder="ej: ${'$'}{lastAction == 'APPROVE'}"
            [ngModel]="rawExpr()"
            (ngModelChange)="rawExpr.set($event)"
          ></textarea>

          <div class="hints">
            <p class="hint-title">Variables del sistema siempre disponibles:</p>
            <ul>
              <li><code>lastAction</code> → <code>'APPROVE'</code>, <code>'REJECT'</code>, <code>'OBSERVE'</code>, <code>'COMPLETE'</code></li>
              <li><code>lastCompletedBy</code>, <code>lastComment</code></li>
              <li><code>procedureCode</code>, <code>applicantDocumentNumber</code></li>
            </ul>
            <p>Campos de formularios se agregan como variables con el mismo nombre del campo.</p>
          </div>
        </ng-container>

      </div>

      <footer>
        <button mat-stroked-button type="button" (click)="cancel()">Cancelar</button>
        <button
          mat-flat-button
          color="primary"
          type="button"
          [disabled]="!canApply()"
          (click)="apply()"
        >
          <mat-icon>check</mat-icon>
          Aplicar
        </button>
      </footer>

    </div>
  `,
  styles: [`
    .dialog {
      width: 520px;
      max-width: 100%;
      display: flex;
      flex-direction: column;
    }

    header {
      padding: 18px 20px 12px;
      border-bottom: 1px solid var(--border);
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .header-title mat-icon {
      color: var(--accent);
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }

    h2 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text);
    }

    header p {
      margin: 4px 0 0;
      font-size: 0.82rem;
      color: var(--text-muted);
    }

    .mode-tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
      background: var(--surface-raised, #f8f9fa);
    }

    .mode-tab {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 12px;
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 0.82rem;
      color: var(--text-muted);
      border-bottom: 2px solid transparent;
      transition: color 150ms, border-color 150ms;
    }

    .mode-tab mat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }

    .mode-tab.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
      font-weight: 600;
    }

    .body {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 380px;
      overflow-y: auto;
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .field-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .sel, .inp {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: var(--text);
      font-size: 0.87rem;
    }

    .sel:focus, .inp:focus {
      outline: none;
      border-color: var(--accent);
    }

    .preview {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 10px 12px;
      background: var(--surface-raised, #f0f4ff);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
    }

    .preview__label {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .preview__code {
      font-family: 'Courier New', monospace;
      font-size: 0.88rem;
      color: var(--accent-strong, #0055cc);
      word-break: break-all;
    }

    .expr-input {
      width: 100%;
      box-sizing: border-box;
      font-family: 'Courier New', monospace;
      font-size: 0.88rem;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: var(--text);
      resize: vertical;
      line-height: 1.5;
    }

    .expr-input:focus {
      outline: none;
      border-color: var(--accent);
    }

    .hints {
      background: var(--surface-raised, #f8f9fa);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px 12px;
      font-size: 0.79rem;
      color: var(--text-muted);
    }

    .hint-title {
      margin: 0 0 5px;
      font-weight: 600;
    }

    ul {
      margin: 0 0 6px;
      padding-left: 16px;
      line-height: 1.75;
    }

    .hints p:last-child { margin: 0; }

    code {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 3px;
      padding: 1px 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.78rem;
      color: var(--accent-strong, #0055cc);
    }

    .no-vars-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      color: var(--text-muted);
      margin: 0;
    }

    .no-vars-hint mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 20px;
      border-top: 1px solid var(--border);
    }
  `]
})
export class FlowConditionDialogComponent implements OnInit {

  protected readonly data = inject<FlowConditionDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<FlowConditionDialogComponent>);

  // expose constant to template
  protected readonly SYSTEM_VARS_COUNT = SYSTEM_VARS.length;

  // All available variables (system + form fields)
  protected readonly allVars = computed<ConditionVar[]>(() => [
    ...SYSTEM_VARS,
    ...buildVarsFromForms(this.data.forms ?? []),
  ]);

  // Grouped for the select optgroup
  protected readonly varGroups = computed(() => {
    const groups = new Map<string, ConditionVar[]>();
    for (const v of this.allVars()) {
      if (!groups.has(v.group)) groups.set(v.group, []);
      groups.get(v.group)!.push(v);
    }
    return Array.from(groups.entries()).map(([name, vars]) => ({ name, vars }));
  });

  // ── State ──────────────────────────────────────────────────────────────────
  protected readonly mode = signal<'visual' | 'advanced'>('visual');
  protected readonly selectedVarName = signal('');
  protected readonly selectedOp = signal('');
  protected readonly conditionValue = signal('');
  protected readonly rawExpr = signal('');

  // ── Derived ───────────────────────────────────────────────────────────────
  protected readonly selectedVar = computed<ConditionVar | undefined>(() =>
    this.allVars().find(v => v.name === this.selectedVarName())
  );

  protected readonly availableOps = computed<ConditionOp[]>(() => {
    const v = this.selectedVar();
    return v ? opsForKind(v.kind) : [];
  });

  protected readonly currentOp = computed<ConditionOp | undefined>(() =>
    this.availableOps().find(o => o.value === this.selectedOp())
  );

  protected readonly builtExpression = computed<string>(() => {
    const v = this.selectedVar();
    const op = this.selectedOp();
    if (!v || !op) return '';

    const opDef = this.currentOp();
    if (!opDef) return '';

    if (v.kind === 'boolean') {
      return `\${${v.name} ${op}}`;
    }
    if (!opDef.hasValue) return '';
    const val = this.conditionValue();
    if (!val.trim()) return '';
    if (v.kind === 'number') {
      return `\${${v.name} ${op} ${val}}`;
    }
    // string, action, date
    return `\${${v.name} ${op} '${val}'}`;
  });

  protected readonly canApply = computed<boolean>(() => {
    if (this.mode() === 'advanced') return true; // allow empty to clear condition
    return !!this.builtExpression();
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const expr = this.data.condition?.trim() ?? '';
    this.rawExpr.set(expr);

    if (expr) {
      const parsed = tryParse(expr);
      if (parsed) {
        const found = this.allVars().find(v => v.name === parsed.varName);
        if (found) {
          this.selectedVarName.set(parsed.varName);
          this.selectedOp.set(parsed.op);
          this.conditionValue.set(parsed.rawValue);
          return; // stay in visual mode
        }
      }
      // Can't parse → open in advanced mode
      this.mode.set('advanced');
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  protected onVarChange(name: string): void {
    this.selectedVarName.set(name);
    const v = this.allVars().find(vr => vr.name === name);
    if (!v) { this.selectedOp.set(''); this.conditionValue.set(''); return; }

    const ops = opsForKind(v.kind);
    this.selectedOp.set(ops[0]?.value ?? '');
    // Pre-set first option for action/select fields
    if (v.kind === 'action' && v.options?.length) {
      this.conditionValue.set(v.options[0]);
    } else if (v.kind === 'string' && v.options?.length) {
      this.conditionValue.set(v.options[0]);
    } else {
      this.conditionValue.set('');
    }
  }

  protected switchMode(m: 'visual' | 'advanced'): void {
    if (m === 'advanced' && this.mode() === 'visual') {
      // Carry over built expression to raw textarea
      const built = this.builtExpression();
      if (built) this.rawExpr.set(built);
    }
    if (m === 'visual' && this.mode() === 'advanced') {
      // Try to parse raw back into builder
      const parsed = tryParse(this.rawExpr());
      if (parsed) {
        const found = this.allVars().find(v => v.name === parsed.varName);
        if (found) {
          this.selectedVarName.set(parsed.varName);
          this.selectedOp.set(parsed.op);
          this.conditionValue.set(parsed.rawValue);
        }
      }
    }
    this.mode.set(m);
  }

  protected actionLabel(opt: string): string {
    return ACTION_LABELS[opt] ?? opt;
  }

  protected apply(): void {
    const expr = this.mode() === 'advanced'
      ? this.rawExpr().trim()
      : this.builtExpression();
    this.dialogRef.close(expr);
  }

  protected cancel(): void {
    this.dialogRef.close(undefined);
  }
}
