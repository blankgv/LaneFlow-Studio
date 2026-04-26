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
