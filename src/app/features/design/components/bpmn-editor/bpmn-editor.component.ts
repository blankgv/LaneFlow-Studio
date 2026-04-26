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
  @Input() readonly = false;
  @Output() readonly xmlChange = new EventEmitter<string>();
  @Output() readonly flowSelected = new EventEmitter<SelectedFlowElement | null>();

  @ViewChild('canvas') private readonly canvasRef!: ElementRef<HTMLDivElement>;

  private readonly zone = inject(NgZone);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private modeler!: any;
  private initialized = false;
  private lastImportedXml = '';
  private suppressNextEmit = false;

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

  /** Aplica o elimina la condición de un flujo (solo en modo edición). */
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

  private importXml(xml: string): Promise<void> {
    this.lastImportedXml = xml;
    return this.modeler.importXML(xml).then(() => {});
  }
}
