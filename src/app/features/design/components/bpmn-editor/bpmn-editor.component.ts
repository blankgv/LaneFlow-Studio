import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject
} from '@angular/core';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import BpmnNavigatedViewer from 'bpmn-js/lib/NavigatedViewer';

export interface SelectedFlowElement {
  id: string;
  condition: string;
  name: string;
}

export interface LaneAddedEvent {
  elementId: string;
  elementType: 'lane';
}

export interface LaneInsertRequest {
  targetElementId: string;
  location: 'top' | 'bottom';
}

export interface BpmnValidationSummary {
  pools: number;
  lanes: Array<{ id: string; name: string }>;
  tasksOutsideLane: number;
}

const LANE_HEIGHT = 250;
const LANE_INDENTATION = 30;
const POOL_MIN_WIDTH = 750;

@Component({
  selector: 'app-bpmn-editor',
  standalone: true,
  template: `<div #canvas class="bpmn-canvas"></div>`,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      background: #fff;
    }

    .bpmn-canvas {
      width: 100%;
      height: 100%;
      background: #fff;
    }

    :host ::ng-deep .djs-context-pad .entry.bpmn-icon-lane-divide-two,
    :host ::ng-deep .djs-context-pad .entry.bpmn-icon-lane-divide-three {
      display: none !important;
    }
  `]
})
export class BpmnEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() xml = '';
  @Input() readonly = false;
  @Output() readonly xmlChange = new EventEmitter<string>();
  @Output() readonly flowSelected = new EventEmitter<SelectedFlowElement | null>();
  @Output() readonly laneAdded = new EventEmitter<LaneAddedEvent>();
  @Output() readonly poolCreated = new EventEmitter<string>();
  @Output() readonly laneInsertRequested = new EventEmitter<LaneInsertRequest>();
  @Output() readonly multiplePoolsBlocked = new EventEmitter<void>();
  @Output() readonly taskOutsideLane = new EventEmitter<{ elementId: string }>();

  @ViewChild('canvas') private readonly canvasRef!: ElementRef<HTMLDivElement>;

  private readonly zone = inject(NgZone);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private modeler!: any;
  private initialized = false;
  private lastImportedXml = '';
  private suppressNextEmit = false;
  private suppressLaneEmit = false;
  private readonly recentlyEmittedLaneIds = new Set<string>();

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      if (this.readonly) {
        this.modeler = new BpmnNavigatedViewer({
          container: this.canvasRef.nativeElement
        });
      } else {
        this.modeler = new BpmnModeler({
          container: this.canvasRef.nativeElement
        });

        this.modeler.on('commandStack.changed', () => {
          if (this.suppressNextEmit) {
            this.suppressNextEmit = false;
            return;
          }
          this.modeler.saveXML({ format: true }).then(({ xml }: { xml: string }) => {
            if (xml) {
              this.lastImportedXml = xml;
              this.zone.run(() => this.xmlChange.emit(xml));
            }
          });
        });

        this.registerLaneContextPadOverrides();

        // ── Creación de shapes ──────────────────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.modeler.on('commandStack.shape.create.postExecuted', ({ context }: any) => {
          const shape = context?.shape;
          if (!shape) return;

          if (shape.type === 'bpmn:Participant') {
            // Bloquear segundo pool
            const elementRegistry = this.modeler.get('elementRegistry');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pools = elementRegistry.filter((el: any) => el.type === 'bpmn:Participant');
            if (pools.length > 1) {
              const modeling = this.modeler.get('modeling');
              modeling.removeElements([shape]);
              this.zone.run(() => this.multiplePoolsBlocked.emit());
            } else {
              // Suprimir la lane vacía que bpmn-js auto-crea con el pool
              // para que no dispare el selector de departamento de forma redundante.
              this.suppressLaneEmit = true;
              Promise.resolve().then(() => { this.suppressLaneEmit = false; });
              this.zone.run(() => this.poolCreated.emit(shape.id));
            }
            return;
          }

          if (shape.type === 'bpmn:Lane') {
            return;
          }

          // Task fuera de lane
          const taskTypes = ['bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:ManualTask', 'bpmn:SendTask', 'bpmn:ReceiveTask'];
          if (taskTypes.includes(shape.type) && !this.isElementInsideAnyLane(shape)) {
            this.zone.run(() => this.taskOutsideLane.emit({ elementId: shape.id }));
          }
        });

        // ── Lane añadido vía botón "Dividir" del pool (evento diferente a shape.create) ─
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.modeler.on('commandStack.lane.add.postExecuted', ({ context }: any) => {
          if (this.suppressLaneEmit) return;
          const shape = context?.newLane ?? context?.shape;
          if (!shape) return;
          // Diferimos al siguiente tick para que bpmn-js registre la lane nueva.
          setTimeout(() => {
            this.normalizeTopLevelLaneHeights();
            this.emitLaneAddedOnce(shape.id);
          }, 0);
        });

        // ── Interceptar doble clic en lane/pool: bloquear edición libre de texto ─
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.modeler.on('commandStack.shape.delete.postExecuted', ({ context }: any) => {
          const shape = context?.shape;
          if (shape?.type !== 'bpmn:Lane') return;
          setTimeout(() => this.normalizeTopLevelLaneHeights(), 0);
        });

        this.modeler.on('directEditing.activate', ({ active }: any) => {
          const element = active?.element;
          const target = element?.labelTarget ?? element;

          if (target?.type === 'bpmn:Lane') {
            // Lane: cancelar editor y abrir selector de departamento
            Promise.resolve().then(() => {
              this.modeler.get('directEditing').cancel();
            });
            this.emitLaneAddedOnce(target.id);
          } else if (target?.type === 'bpmn:Participant') {
            // Pool: cancelar editor — el nombre lo gestiona la app, no el usuario
            Promise.resolve().then(() => {
              this.modeler.get('directEditing').cancel();
            });
          }
        });

        // ── Flujo condicional seleccionado ──────────────────────────────────
        this.modeler.on('selection.changed', ({ newSelection }: { newSelection: unknown[] }) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const el = newSelection?.[0] as any;
          const isConditionalFlow =
            el?.type === 'bpmn:SequenceFlow' &&
            el?.source?.type === 'bpmn:ExclusiveGateway';

          if (isConditionalFlow) {
            const bo = el.businessObject;
            this.zone.run(() => this.flowSelected.emit({
              id: el.id,
              condition: bo?.conditionExpression?.body ?? '',
              name: bo?.name ?? ''
            }));
          } else {
            this.zone.run(() => this.flowSelected.emit(null));
          }
        });
      }

      this.initialized = true;

      if (this.xml) {
        this.importXml(this.xml).catch(() => {
          if (!this.readonly) this.modeler.createDiagram();
        });
      } else if (!this.readonly) {
        this.modeler.createDiagram();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const xmlChange = changes['xml'];
    if (!xmlChange || xmlChange.firstChange || !this.initialized) return;

    const newXml = xmlChange.currentValue as string;
    if (newXml && newXml !== this.lastImportedXml) {
      this.zone.runOutsideAngular(() =>
        this.importXml(newXml).catch(() => {
          if (!this.readonly) this.modeler.createDiagram();
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.modeler?.destroy();
  }

  /** Aplica XML remoto sin disparar autosave (solo en modo edición). */
  applyRemoteXml(xml: string): void {
    if (!this.initialized || !xml) return;
    this.zone.runOutsideAngular(() => {
      this.suppressNextEmit = true;
      this.lastImportedXml = xml;
      this.modeler.importXML(xml)
        .then(() => { this.suppressNextEmit = false; })
        .catch(() => { this.suppressNextEmit = false; });
    });
  }

  /** Sincroniza el nombre del pool con el nombre de la política (sin disparar autosave). */
  syncPoolName(name: string): void {
    if (this.readonly || !this.initialized) return;
    this.zone.runOutsideAngular(() => {
      const elementRegistry = this.modeler.get('elementRegistry');
      const modeling = this.modeler.get('modeling');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const participants: any[] = elementRegistry.filter((el: any) => el.type === 'bpmn:Participant');
      if (participants.length === 0) return;
      const participant = participants[0];
      if (participant.businessObject?.name === name) return; // ya sincronizado
      this.suppressNextEmit = true;
      modeling.updateProperties(participant, { name });
    });
  }

  /** Asigna un nombre a la primera lane vacía del pool, o crea una nueva si no existe ninguna. */
  addLaneToPool(poolId: string, laneName: string): void {
    if (this.readonly) return;
    this.zone.runOutsideAngular(() => {
      const elementRegistry = this.modeler.get('elementRegistry');
      const modeling = this.modeler.get('modeling');
      const pool = elementRegistry.get(poolId);
      if (!pool) return;

      // bpmn-js auto-crea una lane vacía cuando se crea el pool.
      // La reutilizamos renombrándola en lugar de crear una segunda.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingLanes: any[] = elementRegistry.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (el: any) => el.type === 'bpmn:Lane'
      );

      if (existingLanes.length > 0) {
        // Renombrar la primera lane existente (sin nombre o la primera del pool)
        const target = existingLanes.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (l: any) => !l.businessObject?.name
        ) ?? existingLanes[0];
        modeling.updateProperties(target, { name: laneName });
        this.normalizeTopLevelLaneHeights();
      } else {
        // No hay ninguna lane aún — crearla sin disparar el selector
        // No hay ninguna lane aun: bpmn-js crea una lane nueva y un resto vacio.
        // Nombramos la nueva y removemos el resto para dejar un solo departamento.
        try {
          this.suppressLaneEmit = true;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newLane: any = modeling.createShape(
            {
              type: 'bpmn:Lane',
              isHorizontal: true
            },
            {
              x: pool.x + LANE_INDENTATION,
              y: pool.y,
              width: pool.width - LANE_INDENTATION,
              height: LANE_HEIGHT
            },
            pool
          );
          if (newLane && laneName) {
            modeling.updateProperties(newLane, { name: laneName });
            this.normalizeTopLevelLaneHeights();
          }
        } finally {
          this.suppressLaneEmit = false;
        }
      }
    });
  }

  /** Actualiza el nombre (label) de un elemento — lane, pool, task, etc. */
  addLaneNear(targetElementId: string, location: 'top' | 'bottom', laneName: string): void {
    if (this.readonly) return;
    this.zone.runOutsideAngular(() => {
      const elementRegistry = this.modeler.get('elementRegistry');
      const modeling = this.modeler.get('modeling');
      const target = elementRegistry.get(targetElementId);
      if (!target) return;

      try {
        this.suppressLaneEmit = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newLane: any = modeling.addLane(target, location);
        if (!newLane) return;
        modeling.updateProperties(newLane, { name: laneName });
        this.normalizeTopLevelLaneHeights();
      } finally {
        this.suppressLaneEmit = false;
      }
    });
  }

  setElementName(elementId: string, name: string): void {
    if (this.readonly) return;
    this.zone.runOutsideAngular(() => {
      const modeling = this.modeler.get('modeling');
      const elementRegistry = this.modeler.get('elementRegistry');
      const element = elementRegistry.get(elementId);
      if (!element) return;
      modeling.updateProperties(element, { name });
    });
  }

  /** Aplica o elimina la condición de un flujo (solo modo edición). */
  removeElement(elementId: string): void {
    if (this.readonly) return;
    this.zone.runOutsideAngular(() => {
      const modeling = this.modeler.get('modeling');
      const elementRegistry = this.modeler.get('elementRegistry');
      const element = elementRegistry.get(elementId);
      if (!element) return;
      modeling.removeElements([element]);
    });
  }

  setCondition(elementId: string, expression: string): void {
    if (this.readonly) return;
    this.zone.runOutsideAngular(() => {
      const modeling = this.modeler.get('modeling');
      const elementRegistry = this.modeler.get('elementRegistry');
      const moddle = this.modeler.get('moddle');

      const element = elementRegistry.get(elementId);
      if (!element) return;

      if (!expression.trim()) {
        modeling.updateProperties(element, { conditionExpression: undefined });
      } else {
        const conditionExpression = moddle.create('bpmn:FormalExpression', {
          body: expression.trim()
        });
        modeling.updateProperties(element, { conditionExpression });
      }
    });
  }

  /** Devuelve un resumen de validación estructural del diagrama actual. */
  getValidationSummary(): BpmnValidationSummary {
    if (!this.initialized) {
      return { pools: 0, lanes: [], tasksOutsideLane: 0 };
    }

    const elementRegistry = this.modeler.get('elementRegistry');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pools: number = elementRegistry.filter((el: any) => el.type === 'bpmn:Participant').length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lanes: { id: string; name: string }[] = elementRegistry
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((el: any) => el.type === 'bpmn:Lane')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((el: any) => ({ id: el.id, name: el.businessObject?.name ?? '' }));

    const taskTypes = ['bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask',
                       'bpmn:ManualTask', 'bpmn:SendTask', 'bpmn:ReceiveTask'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tasksOutsideLane: number = elementRegistry
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((el: any) => taskTypes.includes(el.type) && !this.isElementInsideAnyLane(el))
      .length;

    return { pools, lanes, tasksOutsideLane };
  }

  prepareXmlForPersistence(): Promise<string> {
    if (!this.initialized) return Promise.resolve(this.xml);
    this.sanitizeModelIdsForCamunda();
    const assignments = this.getLaneTaskAssignments();
    return this.modeler.saveXML({ format: true }).then(({ xml }: { xml: string }) =>
      this.sanitizeXmlForCamunda(this.applyLaneTaskAssignments(xml ?? this.xml, assignments))
    );
  }

  // ── Privado ───────────────────────────────────────────────────────────────

  private registerLaneContextPadOverrides(): void {
    const contextPad = this.modeler.get('contextPad');

    contextPad.registerProvider(500, {
      getContextPadEntries: (element: any) => (entries: any) => {
        delete entries['lane-divide-two'];
        delete entries['lane-divide-three'];

        if (element?.type !== 'bpmn:Lane' && element?.type !== 'bpmn:Participant') {
          return entries;
        }

        const requestInsert = (location: 'top' | 'bottom') => (event: Event) => {
          event?.preventDefault();
          event?.stopPropagation();
          contextPad.close();
          this.zone.run(() => this.laneInsertRequested.emit({
            targetElementId: element.id,
            location
          }));
        };

        if (entries['lane-insert-above']) {
          entries['lane-insert-above'].action = { click: requestInsert('top') };
        }

        if (entries['lane-insert-below']) {
          entries['lane-insert-below'].action = { click: requestInsert('bottom') };
        }

        return entries;
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private normalizeTopLevelLaneHeights(): void {
    if (!this.initialized) return;
    const elementRegistry = this.modeler.get('elementRegistry');
    const modeling = this.modeler.get('modeling');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pool = elementRegistry.filter((el: any) => el.type === 'bpmn:Participant')[0];
    if (!pool) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lanes: any[] = elementRegistry
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((el: any) => el.type === 'bpmn:Lane')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => a.y - b.y);

    if (lanes.length === 0) return;

    const poolWidth = Math.max(pool.width, POOL_MIN_WIDTH);
    const poolHeight = lanes.length * LANE_HEIGHT;
    if (pool.width !== poolWidth || pool.height !== poolHeight) {
      modeling.resizeShape(pool, {
        x: pool.x,
        y: pool.y,
        width: poolWidth,
        height: poolHeight
      });
    }

    lanes.forEach((lane, index) => {
      const bounds = {
        x: pool.x + LANE_INDENTATION,
        y: pool.y + index * LANE_HEIGHT,
        width: poolWidth - LANE_INDENTATION,
        height: LANE_HEIGHT
      };

      if (
        lane.x !== bounds.x ||
        lane.y !== bounds.y ||
        lane.width !== bounds.width ||
        lane.height !== bounds.height
      ) {
        modeling.resizeShape(lane, bounds);
      }
    });
  }

  private emitLaneAddedOnce(elementId: string): void {
    if (this.recentlyEmittedLaneIds.has(elementId)) return;

    this.recentlyEmittedLaneIds.add(elementId);
    window.setTimeout(() => {
      this.recentlyEmittedLaneIds.delete(elementId);
    }, 250);

    this.zone.run(() => this.laneAdded.emit({ elementId, elementType: 'lane' }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isElementInsideAnyLane(element: any): boolean {
    const elementRegistry = this.modeler.get('elementRegistry');
    const centerX = element.x + element.width / 2;
    const centerY = element.y + element.height / 2;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return elementRegistry.filter((el: any) => el.type === 'bpmn:Lane').some((lane: any) =>
      centerX >= lane.x &&
      centerX <= lane.x + lane.width &&
      centerY >= lane.y &&
      centerY <= lane.y + lane.height
    );
  }

  private getLaneTaskAssignments(): Array<{ laneId: string; taskIds: string[] }> {
    const elementRegistry = this.modeler.get('elementRegistry');
    const taskTypes = ['bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask',
                       'bpmn:ManualTask', 'bpmn:SendTask', 'bpmn:ReceiveTask'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lanes: any[] = elementRegistry.filter((el: any) => el.type === 'bpmn:Lane');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tasks: any[] = elementRegistry.filter((el: any) => taskTypes.includes(el.type));
    return lanes.map((lane) => ({
      laneId: lane.id,
      taskIds: tasks.filter((task) => this.isElementInsideLane(task, lane)).map((task) => task.id)
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isElementInsideLane(element: any, lane: any): boolean {
    const centerX = element.x + element.width / 2;
    const centerY = element.y + element.height / 2;
    return centerX >= lane.x &&
      centerX <= lane.x + lane.width &&
      centerY >= lane.y &&
      centerY <= lane.y + lane.height;
  }

  private applyLaneTaskAssignments(xml: string, assignments: Array<{ laneId: string; taskIds: string[] }>): string {
    if (!xml || typeof DOMParser === 'undefined') return xml;
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) return xml;

    assignments.forEach(({ laneId, taskIds }) => {
      const lane = doc.querySelector(`[id="${laneId}"]`);
      if (!lane) return;
      Array.from(lane.getElementsByTagNameNS('*', 'flowNodeRef')).forEach((node) => node.remove());
      taskIds.forEach((taskId) => {
        const ref = doc.createElementNS('http://www.omg.org/spec/BPMN/20100524/MODEL', 'bpmn:flowNodeRef');
        ref.textContent = taskId;
        lane.appendChild(ref);
      });
    });

    return new XMLSerializer().serializeToString(doc);
  }

  private sanitizeXmlForCamunda(xml: string): string {
    return xml.replace(/\b(id|processRef|bpmnElement)="([^"]+)"/g, (_match, attr: string, value: string) =>
      `${attr}="${this.safeBpmnId(value)}"`
    );
  }

  private sanitizeModelIdsForCamunda(): void {
    const definitions = this.modeler.getDefinitions?.();
    if (!definitions) return;
    const seen = new Set<string>();
    this.walkModdle(definitions, (node) => {
      if (typeof node.id === 'string') {
        node.id = this.uniqueBpmnId(this.safeBpmnId(node.id), seen);
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private walkModdle(node: any, visit: (node: any) => void, seen = new Set<any>()): void {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    visit(node);
    Object.keys(node).forEach((key) => {
      if (key.startsWith('$')) return;
      const value = node[key];
      if (Array.isArray(value)) value.forEach((item) => this.walkModdle(item, visit, seen));
      else if (value && typeof value === 'object') this.walkModdle(value, visit, seen);
    });
  }

  private safeBpmnId(value: string): string {
    const normalized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9_.-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    return /^[A-Za-z_]/.test(normalized) ? normalized : `id_${normalized || 'element'}`;
  }

  private uniqueBpmnId(value: string, seen: Set<string>): string {
    let candidate = value;
    let index = 1;
    while (seen.has(candidate)) {
      candidate = `${value}_${index++}`;
    }
    seen.add(candidate);
    return candidate;
  }

  private importXml(xml: string): Promise<void> {
    this.lastImportedXml = xml;
    return this.modeler.importXML(xml).then(() => {});
  }
}
