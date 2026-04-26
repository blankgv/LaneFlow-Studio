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

export interface SelectedFlowElement {
  id: string;
  condition: string;
  name: string;
}

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
  `]
})
export class BpmnEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() xml = '';
  @Output() readonly xmlChange = new EventEmitter<string>();
  @Output() readonly flowSelected = new EventEmitter<SelectedFlowElement | null>();

  @ViewChild('canvas') private readonly canvasRef!: ElementRef<HTMLDivElement>;

  private readonly zone = inject(NgZone);
  private modeler!: BpmnModeler;
  private initialized = false;
  private lastImportedXml = '';
  private suppressNextEmit = false;

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.modeler = new BpmnModeler({
        container: this.canvasRef.nativeElement
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.modeler as any).on('commandStack.changed', () => {
        if (this.suppressNextEmit) {
          this.suppressNextEmit = false;
          return;
        }
        this.modeler.saveXML({ format: true }).then(({ xml }) => {
          if (xml) {
            this.lastImportedXml = xml;
            this.zone.run(() => this.xmlChange.emit(xml));
          }
        });
      });

      // Emitir cuando se selecciona un flujo de secuencia de un gateway exclusivo
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.modeler as any).on('selection.changed', ({ newSelection }: { newSelection: any[] }) => {
        const el = newSelection?.[0];

        const isConditionalFlow =
          el?.type === 'bpmn:SequenceFlow' &&
          el?.source?.type === 'bpmn:ExclusiveGateway';

        if (isConditionalFlow) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const bo = (el as any).businessObject;
          this.zone.run(() => this.flowSelected.emit({
            id: el.id,
            condition: bo?.conditionExpression?.body ?? '',
            name: bo?.name ?? ''
          }));
        } else {
          this.zone.run(() => this.flowSelected.emit(null));
        }
      });

      this.initialized = true;

      if (this.xml) {
        this.importXml(this.xml).catch(() => this.modeler.createDiagram());
      } else {
        this.modeler.createDiagram();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const xmlChange = changes['xml'];
    if (!xmlChange || xmlChange.firstChange || !this.initialized) {
      return;
    }

    const newXml = xmlChange.currentValue as string;
    if (newXml && newXml !== this.lastImportedXml) {
      this.zone.runOutsideAngular(() =>
        this.importXml(newXml).catch(() => this.modeler.createDiagram())
      );
    }
  }

  ngOnDestroy(): void {
    this.modeler?.destroy();
  }

  /**
   * Aplica o elimina la condición de un flujo de secuencia.
   * El cambio dispara commandStack.changed → xmlChange → autosave.
   */
  setCondition(elementId: string, expression: string): void {
    this.zone.runOutsideAngular(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modeling = (this.modeler as any).get('modeling');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const elementRegistry = (this.modeler as any).get('elementRegistry');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const moddle = (this.modeler as any).get('moddle');

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

  /**
   * Importa XML recibido de otro usuario sin disparar autosave.
   */
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

  private importXml(xml: string): Promise<void> {
    this.lastImportedXml = xml;
    return this.modeler.importXML(xml).then(() => {});
  }
}
