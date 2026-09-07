import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Input,
  inject,
  type OnInit,
  signal,
  type WritableSignal,
} from '@angular/core';
import {
  type FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { ModalGlobalService } from '../../../../../compartido/ui/modal-global/modal-global.service';
import { SelectGlobalComponent } from '../../../../../compartido/ui/select-global/select-global';
import { ErrorMensajeComponent } from '../../../../../compartido/ui/validacion/error-mensaje.component';
import {
  type SintomaCatalogo,
  SintomaService,
} from '../../../servicios/sintoma.service';
import {
  ETIQUETAS_SISTEMA,
  type GrupoSintomasVista,
} from '../constantes/formulario-soap.constantes';
import {
  type EtiquetaDolor,
  obtenerEtiquetaDolor,
  procesarValidacionEscalaDolor,
} from '../utilidades/formulario-soap-dolor.util';

@Component({
  selector: 'app-subjetivo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SelectGlobalComponent,
    ErrorMensajeComponent,
  ],
  templateUrl: './subjetivo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjetivoComponent implements OnInit {
  @Input({ required: true }) soapForm!: FormGroup;
  @Input() sintomasCatalogo: WritableSignal<SintomaCatalogo[]> = signal<
    SintomaCatalogo[]
  >([]);
  @Input() sintomasSeleccionados: WritableSignal<Set<number>> = signal<
    Set<number>
  >(new Set());

  private readonly sintomaService = inject(SintomaService);
  private readonly modalGlobal = inject(ModalGlobalService);

  public readonly sintomasCargando = signal<boolean>(false);
  public readonly grupoSintomasAbierto = signal<string>('general');
  public nuevoSintomaTexto = '';
  public nuevoSintomaSistema = 'general';

  readonly sintomasPorSistema = computed<GrupoSintomasVista[]>(() => {
    const mapaPorSistema = new Map<string, SintomaCatalogo[]>();
    for (const sintoma of this.sintomasCatalogo()) {
      const listadoExistente = mapaPorSistema.get(sintoma.sistema) ?? [];
      listadoExistente.push(sintoma);
      mapaPorSistema.set(sintoma.sistema, listadoExistente);
    }
    const gruposGenerados: GrupoSintomasVista[] = [];
    for (const [clave, lista] of mapaPorSistema) {
      gruposGenerados.push({
        clave,
        etiqueta: ETIQUETAS_SISTEMA[clave] ?? clave,
        sintomas: [...lista].sort(
          (sintomaA, sintomaB) => sintomaA.orden - sintomaB.orden,
        ),
      });
    }
    return gruposGenerados;
  });

  readonly totalSintomasSeleccionados = computed(
    () => this.sintomasSeleccionados().size,
  );

  ngOnInit(): void {
    void this.cargarSintomas();
  }

  async cargarSintomas(): Promise<void> {
    this.sintomasCargando.set(true);
    try {
      const catalogo = await this.sintomaService.listarCatalogo();
      this.sintomasCatalogo.set(catalogo);
    } finally {
      this.sintomasCargando.set(false);
    }
  }

  contarSintomasSistema(claveSistema: string): number {
    const seleccionados = this.sintomasSeleccionados();
    return this.sintomasCatalogo().filter(
      (sintoma) =>
        sintoma.sistema === claveSistema &&
        seleccionados.has(sintoma.idSintoma),
    ).length;
  }

  toggleSintoma(idSintoma: number): void {
    const nuevoConjunto = new Set(this.sintomasSeleccionados());
    if (nuevoConjunto.has(idSintoma)) {
      nuevoConjunto.delete(idSintoma);
    } else {
      nuevoConjunto.add(idSintoma);
    }
    this.sintomasSeleccionados.set(nuevoConjunto);
  }

  toggleGrupoSintomas(claveSistema: string): void {
    this.grupoSintomasAbierto.set(
      this.grupoSintomasAbierto() === claveSistema ? '' : claveSistema,
    );
  }

  async agregarSintomaNuevo(): Promise<void> {
    const textoIngresado = this.nuevoSintomaTexto.trim();
    if (textoIngresado.length < 3 || textoIngresado.length > 100) {
      this.modalGlobal.info(
        'El nombre del síntoma debe tener entre 3 y 100 caracteres.',
        'Síntoma inválido',
      );
      return;
    }
    const sistemaSeleccionado = this.nuevoSintomaSistema;
    const guardadoExitoso = await this.sintomaService.agregarSintoma(
      sistemaSeleccionado,
      textoIngresado,
    );
    if (guardadoExitoso) {
      await this.cargarSintomas();
      const sintomaAgregado = this.sintomasCatalogo().find(
        (sintoma) =>
          sintoma.sistema === sistemaSeleccionado &&
          sintoma.sintoma.toLowerCase() === textoIngresado.toLowerCase(),
      );
      if (sintomaAgregado) {
        const nuevoConjunto = new Set(this.sintomasSeleccionados());
        nuevoConjunto.add(sintomaAgregado.idSintoma);
        this.sintomasSeleccionados.set(nuevoConjunto);
      }
      this.grupoSintomasAbierto.set(sistemaSeleccionado);
      this.nuevoSintomaTexto = '';
    }
  }

  obtenerEtiquetaDolor(
    valor: number | string | null | undefined,
  ): EtiquetaDolor | null {
    return obtenerEtiquetaDolor(valor);
  }

  validarEscalaDolor(evento: Event): void {
    procesarValidacionEscalaDolor(evento, this.soapForm);
  }
}
