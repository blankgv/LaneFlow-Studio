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
    }

    .bpmn-canvas {
      width: 100%;
      height: 100%;
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

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.modeler = new BpmnModeler({
        container: this.canvasRef.nativeElement
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.modeler as any).on('commandStack.changed', () => {
        this.modeler.saveXML({ format: true }).then(({ xml }) => {
          if (xml) {
            this.lastImportedXml = xml;
            this.zone.run(() => this.xmlChange.emit(xml));
          }
        });
      });

      this.initialized = true;

      if (this.xml) {
        this.importXml(this.xml);
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
      this.zone.runOutsideAngular(() => this.importXml(newXml));
    }
  }

  ngOnDestroy(): void {
    this.modeler?.destroy();
  }

  private importXml(xml: string): void {
    this.lastImportedXml = xml;
    this.modeler.importXML(xml).catch(() => {
      // import errors surface via backend validation on save
    });
  }
}
