import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  inject,
  type OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MaestrosApiService } from '../../../../../../../compartido/api/maestros.api.service';
import { ApiRequestError } from '../../../../../../../compartido/api-client/api-client.service';
import { ColumnaTemplateDirective } from '../../../../../../../compartido/componentes/tabla/columna-template.directive';
import {
  type ColumnaTabla,
  TablaComponent,
} from '../../../../../../../compartido/componentes/tabla/tabla.component';
import type {
  ICatalogoNombre,
  IFilaBackend,
} from '../../../../../../../compartido/tipos/api-tipos';
import { BotonesFiltroComponent } from '../../../../../../../compartido/ui/botones-filtro/botones-filtro';
import { FiltrosGlobal } from '../../../../../../../compartido/ui/filtros-global/filtros-global';
import { SelectGlobalComponent } from '../../../../../../../compartido/ui/select-global/select-global';
import { VentanaModal } from '../../../../../../../compartido/ui/ventana-modal/ventana-modal';
import { AuthService } from '../../../../../../auth/aplicacion/auth.service';
import {
  TriajeObstetricoApiService,
  type TriajeObstetricoConsultaPayload,
} from '../../../../salida/http/triaje-obstetrico.api.service';

function campo(
  item: IFilaBackend | null | undefined,
  claves: string[],
): string {
  if (!item) return '';
  for (const k of claves) {
    const v = item[k];
    if (v !== undefined && v !== null && v !== '') {
      if (typeof v === 'string') return v;
      if (typeof v === 'number' || typeof v === 'boolean') return String(v);
      return JSON.stringify(v);
    }
  }
  return '';
}

function campoNum(
  item: IFilaBackend | null | undefined,
  claves: string[],
): number {
  const v = Number(campo(item, claves));
  return Number.isNaN(v) ? 0 : v;
}

interface FormSignosVitales {
  talla: string;
  peso: string;
  temperatura: string;
  pulso: string;
  frecRespiratoria: string;
  frecCardiaca: string;
  frecCardiacaFetal: string;
  perimCefalico: string;
  origen: string;
  perimAbdominal: string;
  sat02: string;
  fi02: string;
  presionArterial: string;
  hemoglobina: string;
  observacion: string;
  gestante: string;
}

function formVacio(): FormSignosVitales {
  return {
    talla: '',
    peso: '',
    temperatura: '',
    pulso: '',
    frecRespiratoria: '',
    frecCardiaca: '',
    frecCardiacaFetal: '',
    perimCefalico: '',
    origen: '',
    perimAbdominal: '',
    sat02: '',
    fi02: '',
    presionArterial: '',
    hemoglobina: '',
    observacion: '',
    gestante: '0',
  };
}

@Component({
  selector: 'app-triaje-consulta',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    VentanaModal,
    TablaComponent,
    ColumnaTemplateDirective,
    FiltrosGlobal,
    SelectGlobalComponent,
    BotonesFiltroComponent,
  ],
  templateUrl: './triaje-obstetrico-consulta.component.html',
})
export class TriajeObstetricoConsultaComponent implements OnInit {
  private readonly triajeApi = inject(TriajeObstetricoApiService);
  private readonly maestrosApi = inject(MaestrosApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  public readonly authService = inject(AuthService);

  atenciones: IFilaBackend[] = [];
  cargando = false;
  error = '';
  mensajeExito = '';
  buscado = false;

  filtro = '';
  fechaInicio = ((d) =>
    `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`)(
    new Date(),
  );
  fechaFin = ((d) =>
    `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`)(
    new Date(),
  );
  servicioFiltro = '';
  serviciosFiltro: ICatalogoNombre[] = [];

  columnasTabla: ColumnaTabla[] = [
    { campo: 'cuentaCustom', cabecera: 'Cuenta' },
    { campo: 'fechaHoraCustom', cabecera: 'Fecha y hora' },
    { campo: 'documentoCustom', cabecera: 'Documento' },
    { campo: 'pacienteCustom', cabecera: 'Paciente' },
    { campo: 'edadCustom', cabecera: 'Edad' },
    { campo: 'sexoCustom', cabecera: 'Sexo' },
    { campo: 'consultorioCustom', cabecera: 'Consultorio' },
    { campo: 'financiadorCustom', cabecera: 'Financiador' },
    { campo: 'triajeCustom', cabecera: 'Triaje', alineacion: 'center' },
    { campo: 'accionCustom', cabecera: 'Acción', alineacion: 'right' },
  ];

  modalTriaje = false;
  atencionActual: IFilaBackend | null = null;
  idTriajeExistente = 0;
  form: FormSignosVitales = formVacio();
  guardando = false;
  errorGuardado = '';

  ngOnInit() {
    this.cargarServicios();
    this.cargarLista();
  }

  async cargarServicios() {
    try {
      const serv = await this.maestrosApi.getServicios(2);
      if (Array.isArray(serv)) this.serviciosFiltro = serv;
    } catch {}
  }

  async cargarLista() {
    this.cargando = true;
    this.error = '';
    this.buscado = true;
    try {
      const items = await this.triajeApi.listarTriajeConsulta({
        fini: this.fechaInicio,
        ffin: this.fechaFin,
        filtro: this.filtro || undefined,
        idServicio: Number(this.servicioFiltro) || undefined,
      });
      this.atenciones = Array.isArray(items) ? items : [];
    } catch (error: unknown) {
      this.error =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudo cargar la bandeja de triaje.';
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  campo(item: IFilaBackend | null, claves: string[]): string {
    return campo(item, claves);
  }

  idAtencion(item: IFilaBackend): number {
    return campoNum(item, ['IdAtencion', 'idAtencion']);
  }

  idPaciente(item: IFilaBackend): number {
    return campoNum(item, ['IdPaciente', 'idPaciente']);
  }

  nombrePaciente(item: IFilaBackend | null): string {
    if (!item) return '—';
    const completo = campo(item, [
      'NombreCompleto',
      'nombreCompleto',
      'Paciente',
      'paciente',
    ]);
    if (completo) return completo;
    return (
      [
        campo(item, ['ApellidoPaterno', 'apellidoPaterno']),
        campo(item, ['ApellidoMaterno', 'apellidoMaterno']),
        campo(item, ['PrimerNombre', 'primerNombre']),
        campo(item, ['SegundoNombre', 'segundoNombre']),
      ]
        .filter(Boolean)
        .join(' ') || '—'
    );
  }

  documento(item: IFilaBackend): string {
    return campo(item, ['NroDocumento', 'nroDocumento']);
  }

  cuenta(item: IFilaBackend): string {
    return campo(item, ['IdCuentaAtencion', 'idCuentaAtencion', 'Cuenta']);
  }

  fechaHora(item: IFilaBackend): string {
    return campo(item, [
      'FechaIngresoHora',
      'fechaIngresoHora',
      'FechaIngreso',
      'fechaIngreso',
    ]);
  }

  tieneTriaje(item: IFilaBackend): boolean {
    return campoNum(item, ['Triaje', 'triaje']) > 0;
  }

  async abrirModal(item: IFilaBackend) {
    this.atencionActual = item;
    this.form = formVacio();
    this.idTriajeExistente = 0;
    this.errorGuardado = '';

    const idAtencion = this.idAtencion(item);
    if (idAtencion > 0) {
      try {
        const existente =
          await this.triajeApi.obtenerTriajeConsultaPorAtencion(idAtencion);
        if (existente) {
          this.cargarDatosExistentes(existente);
          this.idTriajeExistente = campoNum(existente, [
            'IdTriaje',
            'idTriaje',
          ]);
        }
      } catch {}
    }

    this.modalTriaje = true;
    this.cdr.detectChanges();
  }

  private cargarDatosExistentes(existente: IFilaBackend) {
    const texto = (k: string) => {
      const v = existente[k];
      if (v === null || v === undefined) return '';
      if (typeof v === 'string') return v;
      if (typeof v === 'number' || typeof v === 'boolean') return String(v);
      return '';
    };
    this.form = {
      talla: texto('Talla'),
      peso: texto('Peso'),
      temperatura: texto('Temperatura'),
      pulso: texto('Pulso'),
      frecRespiratoria: texto('FrecRespiratoria'),
      frecCardiaca: texto('FrecCardiaca'),
      frecCardiacaFetal: texto('FrecCardiacaFetal'),
      perimCefalico: texto('PerimCefalico'),
      origen: texto('Origen'),
      perimAbdominal: texto('PerimAbdominal'),
      sat02: texto('SAT02'),
      fi02: texto('FI02'),
      presionArterial: texto('PresionArterial'),
      hemoglobina: texto('Hemoglobina'),
      observacion: texto('Observacion'),
      gestante: texto('Gestante') || '0',
    };
  }

  cerrarModal() {
    this.modalTriaje = false;
    this.atencionActual = null;
    this.idTriajeExistente = 0;
    this.errorGuardado = '';
  }

  calcularImc(): string {
    const peso = Number(this.form.peso.replace(',', '.'));
    const talla = Number(this.form.talla.replace(',', '.'));
    if (!peso || !talla || talla <= 0) return '';
    const imc = peso / (talla / 100) ** 2;
    return (Math.round(imc * 100) / 100).toString();
  }

  private textoOpcional(v: string): string | undefined {
    const t = v.trim();
    return t === '' ? undefined : t;
  }

  async guardar() {
    const item = this.atencionActual;
    if (!item) return;
    const idAtencion = this.idAtencion(item);
    const idPaciente = this.idPaciente(item);
    if (!idAtencion || !idPaciente) {
      this.errorGuardado =
        'El registro no tiene una atención o paciente válido.';
      return;
    }
    if (!this.form.peso.trim() || !this.form.talla.trim()) {
      this.errorGuardado = 'El peso y la talla son obligatorios.';
      return;
    }

    const imc = this.calcularImc();
    const payload: TriajeObstetricoConsultaPayload = {
      idAtencion,
      idPaciente,
      idEmpleado:
        this.authService.getIdEmpleado() > 0
          ? this.authService.getIdEmpleado()
          : 1,
      talla: this.form.talla.trim(),
      peso: this.form.peso.trim(),
      temperatura: this.textoOpcional(this.form.temperatura),
      pulso: this.textoOpcional(this.form.pulso),
      frecRespiratoria: this.textoOpcional(this.form.frecRespiratoria),
      frecCardiaca: this.textoOpcional(this.form.frecCardiaca),
      frecCardiacaFetal: this.textoOpcional(this.form.frecCardiacaFetal),
      perimCefalico: this.textoOpcional(this.form.perimCefalico),
      origen: this.textoOpcional(this.form.origen),
      perimAbdominal: this.textoOpcional(this.form.perimAbdominal),
      sat02: this.textoOpcional(this.form.sat02),
      fi02: this.textoOpcional(this.form.fi02),
      presionArterial: this.textoOpcional(this.form.presionArterial),
      hemoglobina: this.textoOpcional(this.form.hemoglobina),
      observacion: this.textoOpcional(this.form.observacion),
      imc: imc || undefined,
      gestante: this.form.gestante || '0',
    };

    this.guardando = true;
    this.errorGuardado = '';
    try {
      const resp = await this.triajeApi.registrarTriajeConsulta(payload);
      if (resp?.resultado?.startsWith('Error')) {
        this.errorGuardado = resp.resultado.replace(/^Error;\s*/, '');
        return;
      }
      this.modalTriaje = false;
      this.mensajeExito = 'Triaje de consulta externa registrado.';
      setTimeout(() => (this.mensajeExito = ''), 5000);
      this.cargarLista();
    } catch (error: unknown) {
      this.errorGuardado =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudo guardar el triaje.';
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  async marcarAtendido() {
    if (!this.idTriajeExistente) return;
    try {
      await this.triajeApi.actualizarEstadoTriajeConsulta(
        this.idTriajeExistente,
        '2',
      );
      this.modalTriaje = false;
      this.mensajeExito = 'Triaje marcado como atendido.';
      setTimeout(() => (this.mensajeExito = ''), 5000);
      this.cargarLista();
    } catch (error: unknown) {
      this.errorGuardado =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudo actualizar el estado del triaje.';
    } finally {
      this.cdr.detectChanges();
    }
  }
}
