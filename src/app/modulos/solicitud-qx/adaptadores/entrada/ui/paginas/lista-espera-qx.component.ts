import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  inject,
  type OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MaestrosApiService } from '../../../../../../compartido/api/maestros.api.service';
import { ApiRequestError } from '../../../../../../compartido/api-client/api-client.service';
import { ColumnaTemplateDirective } from '../../../../../../compartido/componentes/tabla/columna-template.directive';
import {
  type ColumnaTabla,
  TablaComponent,
} from '../../../../../../compartido/componentes/tabla/tabla.component';
import type {
  ICatalogoDescripcion,
  IFilaBackend,
  IPaciente,
} from '../../../../../../compartido/tipos/api-tipos';
import { VentanaModal } from '../../../../../../compartido/ui/ventana-modal/ventana-modal';
import { PacientesApiService } from '../../../../../pacientes/adaptadores/salida/http/pacientes.api.service';
import {
  ListaEsperaQxApiService,
  type ListaEsperaQxParams,
  type MedicoListaEspera,
} from '../../../salida/http/lista-espera-qx.api.service';

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

interface FormListaEsperaQx {
  idTipoDocumento: number | null;
  nroDocumento: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  primerNombre: string;
  segundoNombre: string;
  fechaNacimiento: string;
  idSexo: number | null;
  telefono: string;
  direccion: string;
  fechaOrden: string;
  diagnostico: string;
  fechaLaboratorio: string;
  fechaICCardio: string;
  fechaICNeumo: string;
  fechaICAnestesio: string;
  medico: string;
  observacion: string;
}

function formVacio(): FormListaEsperaQx {
  return {
    idTipoDocumento: null,
    nroDocumento: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    primerNombre: '',
    segundoNombre: '',
    fechaNacimiento: '',
    idSexo: null,
    telefono: '',
    direccion: '',
    fechaOrden: ((d) =>
      `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`)(
      new Date(),
    ),
    diagnostico: '',
    fechaLaboratorio: '',
    fechaICCardio: '',
    fechaICNeumo: '',
    fechaICAnestesio: '',
    medico: '',
    observacion: '',
  };
}

@Component({
  selector: 'app-lista-espera-qx',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    TablaComponent,
    ColumnaTemplateDirective,
    VentanaModal,
  ],
  templateUrl: './lista-espera-qx.component.html',
})
export class ListaEsperaQxComponent implements OnInit {
  private readonly apiService = inject(ListaEsperaQxApiService);
  private readonly maestrosApi = inject(MaestrosApiService);
  private readonly pacientesApi = inject(PacientesApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  fechaInicio = ((d) =>
    `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`)(
    new Date(),
  );
  fechaFin = ((d) =>
    `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`)(
    new Date(),
  );
  paciente = '';

  lista: IFilaBackend[] = [];
  cargando = false;
  error = '';
  buscado = false;
  mensajeExito = '';

  tiposDocumento: ICatalogoDescripcion[] = [];
  tiposSexo: ICatalogoDescripcion[] = [];
  medicos: MedicoListaEspera[] = [];
  medicosFiltrados: MedicoListaEspera[] = [];
  mostrarSugerenciasMedico = false;

  idPaciente = 0;
  idMedico = 0;

  modalAbierto = false;
  form: FormListaEsperaQx = formVacio();
  guardando = false;
  errorGuardado = '';
  cargandoPaciente = false;

  columnasTabla: ColumnaTabla[] = [
    { campo: 'nroHistoriaCustom', cabecera: 'Nro Historia' },
    { campo: 'nroDocumentoCustom', cabecera: 'Nro Documento' },
    { campo: 'pacienteCustom', cabecera: 'Paciente' },
    { campo: 'fechaNacimientoCustom', cabecera: 'Fecha Nacimiento' },
    { campo: 'fechaOrdenCustom', cabecera: 'Fecha Orden' },
    { campo: 'observacionCustom', cabecera: 'Observacion' },
  ];

  ngOnInit() {
    this.cargarCatalogos();
    this.cargarLista();
  }

  async cargarCatalogos() {
    try {
      const [docs, sexos, meds] = await Promise.all([
        this.maestrosApi.getTiposDocumentos(),
        this.maestrosApi.getTiposSexo(),
        this.apiService.listarMedicos(),
      ]);
      this.tiposDocumento = Array.isArray(docs) ? docs : [];
      this.tiposSexo = Array.isArray(sexos) ? sexos : [];
      this.medicos = Array.isArray(meds) ? meds : [];
    } catch {}
  }

  async cargarLista() {
    this.cargando = true;
    this.error = '';
    this.buscado = true;
    try {
      const params: ListaEsperaQxParams = { fecha: this.fechaInicio };
      if (this.paciente.trim()) params.paciente = this.paciente.trim();
      const items = await this.apiService.listar(params);
      this.lista = Array.isArray(items) ? items : [];
    } catch (error: unknown) {
      this.error =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudo cargar la lista de espera quirurgica.';
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  campo(item: IFilaBackend | null, claves: string[]): string {
    return campo(item, claves);
  }

  abrirModal() {
    this.form = formVacio();
    this.errorGuardado = '';
    this.idPaciente = 0;
    this.idMedico = 0;
    this.medicosFiltrados = [];
    this.mostrarSugerenciasMedico = false;
    this.modalAbierto = true;
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.errorGuardado = '';
  }

  async buscarPorDocumento() {
    if (!this.form.idTipoDocumento || !this.form.nroDocumento.trim()) return;
    this.cargandoPaciente = true;
    this.idPaciente = 0;
    try {
      const paciente: IPaciente = await this.pacientesApi.porDocumento(
        this.form.nroDocumento.trim(),
        this.form.idTipoDocumento,
      );
      if (paciente) {
        this.idPaciente = Number(paciente.patientId) || 0;
        this.form.apellidoPaterno = paciente.paternalSurname ?? '';
        this.form.apellidoMaterno = paciente.maternalSurname ?? '';
        this.form.primerNombre = paciente.firstName ?? '';
        this.form.segundoNombre = paciente.secondName ?? '';
        if (paciente.dateOfBirth) {
          const fecha = new Date(paciente.dateOfBirth);
          this.form.fechaNacimiento = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}-${fecha.getDate().toString().padStart(2, '0')}`;
        }
        const sexId = paciente.sexTypeId;
        if (sexId !== undefined && sexId !== null) {
          this.form.idSexo = Number(sexId);
        }
        this.form.telefono = (paciente.phone as string) ?? '';
        this.form.direccion = (paciente.homeAddress as string) ?? '';
      }
    } catch {
      // Paciente no encontrado
    } finally {
      this.cargandoPaciente = false;
      this.cdr.detectChanges();
    }
  }

  filtrarMedicos(valor: string) {
    const texto = valor.trim().toLowerCase();
    if (texto.length < 2) {
      this.medicosFiltrados = [];
      this.mostrarSugerenciasMedico = false;
      return;
    }
    this.medicosFiltrados = this.medicos.filter((m) =>
      (m.dmedico ?? `${m.apellidoPaterno} ${m.apellidoMaterno} ${m.nombres}`)
        .toLowerCase()
        .includes(texto),
    );
    this.mostrarSugerenciasMedico = this.medicosFiltrados.length > 0;
  }

  seleccionarMedico(medico: MedicoListaEspera) {
    this.idMedico = medico.idMedico;
    this.form.medico =
      medico.dmedico ??
      `${medico.apellidoPaterno} ${medico.apellidoMaterno} ${medico.nombres}`;
    this.mostrarSugerenciasMedico = false;
    this.medicosFiltrados = [];
  }

  onMedicoInput(valor: string) {
    this.idMedico = 0;
    this.filtrarMedicos(valor);
  }

  cerrarSugerenciasMedico() {
    setTimeout(() => {
      this.mostrarSugerenciasMedico = false;
    }, 200);
  }

  async guardar() {
    if (
      !this.form.idTipoDocumento ||
      !this.form.nroDocumento.trim() ||
      !this.form.apellidoPaterno.trim() ||
      !this.form.primerNombre.trim() ||
      !this.form.fechaNacimiento ||
      !this.form.idSexo ||
      !this.form.fechaOrden
    ) {
      this.errorGuardado = 'Los campos con * son obligatorios.';
      return;
    }

    this.guardando = true;
    this.errorGuardado = '';
    try {
      await this.apiService.crear({
        idPaciente: this.idPaciente,
        idMedico: this.idMedico,
        idTipoDocumento: this.form.idTipoDocumento,
        nroDocumento: this.form.nroDocumento.trim(),
        apellidoPaterno: this.form.apellidoPaterno.trim(),
        apellidoMaterno: this.form.apellidoMaterno.trim(),
        primerNombre: this.form.primerNombre.trim(),
        segundoNombre: this.form.segundoNombre.trim(),
        fechaNacimiento: this.form.fechaNacimiento,
        idSexo: this.form.idSexo,
        telefono: this.form.telefono.trim(),
        direccion: this.form.direccion.trim(),
        fechaOrden: this.form.fechaOrden,
        diagnostico: this.form.diagnostico.trim(),
        fechaLaboratorio: this.form.fechaLaboratorio,
        fechaICCardio: this.form.fechaICCardio,
        fechaICNeumo: this.form.fechaICNeumo,
        fechaICAnestesio: this.form.fechaICAnestesio,
        medico: this.form.medico.trim(),
        observacion: this.form.observacion.trim(),
      });
      this.modalAbierto = false;
      this.mensajeExito =
        'Paciente registrado en lista de espera quirurgica correctamente.';
      setTimeout(() => (this.mensajeExito = ''), 5000);
      this.cargarLista();
    } catch (error: unknown) {
      this.errorGuardado =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudo guardar el registro.';
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }
}
