import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  inject,
  type OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
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
  type DiagnosticoItem,
  type EspecialidadItem,
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
  idEspecialidad: number | null;
  idDiagnostico: number | null;
  diagnosticoNombre: string;
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
    idDiagnostico: null,
    diagnosticoNombre: '',
    idEspecialidad: null,
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
  filtroEspecialidad: number | null = null;

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

  diagnosticosFiltrados: DiagnosticoItem[] = [];
  mostrarSugerenciasDiagnostico = false;

  especialidades: EspecialidadItem[] = [];

  idPaciente = 0;
  idMedico = 0;

  modalAbierto = false;
  editingId: number | null = null;
  form: FormListaEsperaQx = formVacio();
  guardando = false;
  errorGuardado = '';
  cargandoPaciente = false;
  exportando = false;
  maxFecha = ((d) =>
    `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`)(
    new Date(),
  );

  hospitalNombre = '';
  hospitalRuc = '';
  hospitalTelefono = '';
  hospitalDireccion = '';
  hospitalLogo = '';

  columnasTabla: ColumnaTabla[] = [
    { campo: 'nroHistoriaCustom', cabecera: 'Nro Historia' },
    { campo: 'nroDocumentoCustom', cabecera: 'Nro Documento' },
    { campo: 'pacienteCustom', cabecera: 'Paciente' },
    { campo: 'edadCustom', cabecera: 'Edad' },
    { campo: 'fechaOrdenCustom', cabecera: 'Fecha Orden' },
    { campo: 'especialidadCustom', cabecera: 'Especialidad' },
    { campo: 'observacionCustom', cabecera: 'Observacion' },
    { campo: 'diasTranscurridosCustom', cabecera: 'Dias en espera' },
    { campo: 'accionesCustom', cabecera: 'Acciones' },
  ];

  ngOnInit() {
    this.cargarCatalogos();
    this.cargarLista();
  }

  async cargarCatalogos() {
    try {
      const [docs, sexos, meds, datosInst] = await Promise.all([
        this.maestrosApi.getTiposDocumentos(),
        this.maestrosApi.getTiposSexo(),
        this.apiService.listarMedicos(),
        this.maestrosApi.getDatosInstitucion(),
      ]);
      this.tiposDocumento = Array.isArray(docs) ? docs : [];
      this.tiposSexo = Array.isArray(sexos) ? sexos : [];
      this.medicos = Array.isArray(meds) ? meds : [];
      if (datosInst) {
        this.hospitalNombre = (datosInst.nombre as string) ?? '';
        this.hospitalRuc = (datosInst.rucEess as string) ?? '';
        this.hospitalTelefono = (datosInst.telefono as string) ?? '';
        this.hospitalDireccion = (datosInst.direccion as string) ?? '';
        this.hospitalLogo = (datosInst.logoHospi as string) ?? '';
      }
      await this.cargarEspecialidades();
    } catch {}
  }

  async cargarEspecialidades() {
    try {
      const items = await this.apiService.listarEspecialidadesQx();
      this.especialidades = Array.isArray(items) ? items : [];
    } catch {
      this.especialidades = [];
    }
  }

  async cargarLista() {
    this.cargando = true;
    this.error = '';
    this.buscado = true;
    try {
      if (this.fechaInicio && this.fechaFin) {
        const inicio = new Date(this.fechaInicio);
        const fin = new Date(this.fechaFin);
        const diffMeses =
          (fin.getFullYear() - inicio.getFullYear()) * 12 +
          (fin.getMonth() - inicio.getMonth());
        if (
          diffMeses > 3 ||
          (diffMeses === 3 && fin.getDate() > inicio.getDate())
        ) {
          this.error = 'El rango de fechas no puede ser mayor a 3 meses.';
          this.cargando = false;
          return;
        }
      }
      const params: ListaEsperaQxParams = {
        fecha: this.fechaInicio,
        fechaFin: this.fechaFin,
      };
      if (this.paciente.trim()) params.paciente = this.paciente.trim();
      if (this.filtroEspecialidad)
        params.idEspecialidad = this.filtroEspecialidad;
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

  colorDias(item: IFilaBackend): string {
    const dias = Number(item.DiasTranscurridos ?? item.diasTranscurridos) || 0;
    if (dias <= 15) return '#16a34a';
    if (dias <= 30) return '#ca8a04';
    return '#dc2626';
  }

  fondoDias(item: IFilaBackend): string {
    const dias = Number(item.DiasTranscurridos ?? item.diasTranscurridos) || 0;
    if (dias <= 15) return '#f0fdf4';
    if (dias <= 30) return '#fefce8';
    return '#fef2f2';
  }

  obtenerId(item: IFilaBackend): number {
    return (
      Number(item.IdListaEspera) ||
      Number(item.idListaEspera) ||
      Number(item.Id) ||
      Number(item.id) ||
      0
    );
  }

  async abrirModal() {
    this.editingId = null;
    this.form = formVacio();
    this.errorGuardado = '';
    this.idPaciente = 0;
    this.idMedico = 0;
    this.medicosFiltrados = [];
    this.mostrarSugerenciasMedico = false;
    this.modalAbierto = true;
  }

  async editar(item: IFilaBackend) {
    const id = this.obtenerId(item);
    if (!id) return;

    this.editingId = id;
    this.errorGuardado = '';
    this.idPaciente = 0;
    this.idMedico = 0;

    try {
      await this.cargarEspecialidades();
      const data = await this.apiService.obtenerPorId(id);

      this.form = formVacio();

      if (data) {
        this.form.nroDocumento = data.nroDocumento ?? '';
        this.form.idTipoDocumento = data.idDocIdentidad ?? null;
        this.form.apellidoPaterno = data.apellidoPaterno ?? '';
        this.form.apellidoMaterno = data.apellidoMaterno ?? '';
        this.form.primerNombre = data.primerNombre ?? '';
        this.form.direccion = data.direccion ?? '';
        this.form.telefono = data.telefono ?? '';
        this.form.idSexo = data.idTipoSexo ?? null;
        this.form.fechaNacimiento = data.fechaNacimiento ?? '';
        this.form.fechaOrden = data.fechaOrden ?? '';
        this.form.diagnosticoNombre = data.diagnostico ?? '';
        this.form.idDiagnostico =
          data.idDiagnostico && data.idDiagnostico > 0
            ? data.idDiagnostico
            : null;
        this.form.idEspecialidad =
          data.idEspecialidad && data.idEspecialidad > 0
            ? data.idEspecialidad
            : null;
        this.form.fechaLaboratorio = data.fechaLab ?? '';
        this.form.fechaICCardio = data.fechaICCardio ?? '';
        this.form.fechaICNeumo = data.fechaICNeumo ?? '';
        this.form.fechaICAnestesio = data.fechaICAnestesio ?? '';
        this.form.observacion = data.observacion ?? '';
        this.form.medico = data.medico ?? '';
        if (data.idMedico) {
          this.idMedico = data.idMedico;
        }
      }

      this.modalAbierto = true;
    } catch {
      this.errorGuardado = 'No se pudo cargar los datos del registro.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.editingId = null;
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

  async buscarDiagnostico(valor: string) {
    this.form.diagnosticoNombre = valor;
    this.form.idDiagnostico = null;
    if (valor.trim().length < 3) {
      this.diagnosticosFiltrados = [];
      this.mostrarSugerenciasDiagnostico = false;
      return;
    }
    try {
      const resultados = await this.apiService.listarDiagnosticos(valor.trim());
      this.diagnosticosFiltrados = Array.isArray(resultados) ? resultados : [];
      this.mostrarSugerenciasDiagnostico =
        this.diagnosticosFiltrados.length > 0;
    } catch {
      this.diagnosticosFiltrados = [];
    }
  }

  seleccionarDiagnostico(diag: DiagnosticoItem) {
    this.form.idDiagnostico = diag.idDiagnostico;
    this.form.diagnosticoNombre = `${diag.codigoCIE10} - ${diag.descripcion}`;
    this.mostrarSugerenciasDiagnostico = false;
    this.diagnosticosFiltrados = [];
  }

  cerrarSugerenciasDiagnostico() {
    setTimeout(() => {
      this.mostrarSugerenciasDiagnostico = false;
    }, 200);
  }

  onTelefonoInput(valor: string) {
    const soloNumeros = valor.replace(/\D/g, '').slice(0, 9);
    this.form.telefono = soloNumeros;
  }

  get telefonoIncompleto(): boolean {
    return this.form.telefono.length > 0 && this.form.telefono.length < 9;
  }

  get telefonoInvalido(): boolean {
    return this.form.telefono.length === 1 && this.form.telefono !== '9';
  }

  async guardar() {
    if (!this.form.fechaOrden) {
      this.errorGuardado = 'La fecha de orden es obligatoria.';
      return;
    }
    if (!this.editingId && (!this.idPaciente || !this.idMedico)) {
      this.errorGuardado = 'Paciente y medico son obligatorios.';
      return;
    }
    if (!this.form.idDiagnostico) {
      this.errorGuardado = 'El diagnostico es obligatorio.';
      return;
    }
    if (!this.form.idEspecialidad) {
      this.errorGuardado = 'La especialidad es obligatoria.';
      return;
    }
    if (!this.form.fechaLaboratorio) {
      this.errorGuardado = 'La fecha de laboratorio es obligatoria.';
      return;
    }
    if (!this.form.fechaICCardio) {
      this.errorGuardado = 'La fecha IC Cardio es obligatoria.';
      return;
    }
    if (!this.form.fechaICNeumo) {
      this.errorGuardado = 'La fecha IC Neumo es obligatoria.';
      return;
    }
    if (!this.form.fechaICAnestesio) {
      this.errorGuardado = 'La fecha IC Anestesio es obligatoria.';
      return;
    }
    if (!this.form.telefono.trim()) {
      this.errorGuardado = 'El telefono es obligatorio.';
      return;
    }
    if (
      this.form.telefono.length !== 9 ||
      !this.form.telefono.startsWith('9')
    ) {
      this.errorGuardado = 'El telefono debe tener 9 digitos y comenzar con 9.';
      return;
    }
    if (!this.form.direccion.trim()) {
      this.errorGuardado = 'La direccion es obligatoria.';
      return;
    }

    this.guardando = true;
    this.errorGuardado = '';
    try {
      const payload = {
        idPaciente: this.idPaciente,
        idMedico: this.idMedico,
        fechaOrden: this.form.fechaOrden,
        diagnostico: this.form.idDiagnostico ?? 0,
        idEspecialidad: this.form.idEspecialidad ?? 0,
        fechaLaboratorio: this.form.fechaLaboratorio,
        fechaICCardio: this.form.fechaICCardio,
        fechaICNeumo: this.form.fechaICNeumo,
        fechaICAnestesio: this.form.fechaICAnestesio,
        observacion: this.form.observacion.trim(),
      };
      if (this.editingId) {
        await this.apiService.modificar(this.editingId, payload);
      } else {
        await this.apiService.crear(payload);
      }
      this.modalAbierto = false;
      this.mensajeExito = this.editingId
        ? 'Paciente actualizado en lista de espera quirurgica correctamente.'
        : 'Paciente registrado en lista de espera quirurgica correctamente.';
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

  async exportarExcel() {
    this.exportando = true;
    this.error = '';
    try {
      const datos = await this.apiService.reporte(
        this.fechaInicio,
        this.fechaFin,
        this.filtroEspecialidad ?? undefined,
      );
      if (!datos || datos.length === 0) {
        this.error = 'No hay datos para exportar.';
        return;
      }

      const wb = XLSX.utils.book_new();
      const wsData: (string | number)[][] = [];

      if (this.hospitalLogo) {
        wsData.push([]);
      }
      wsData.push(
        [this.hospitalNombre],
        [`RUC: ${this.hospitalRuc}`],
        [
          `Telefono: ${this.hospitalTelefono}  |  Direccion: ${this.hospitalDireccion}`,
        ],
        [],
        ['REPORTE DE LISTA DE ESPERA QUIRURGICA'],
        [`Fecha Inicio: ${this.fechaInicio}  |  Fecha Fin: ${this.fechaFin}`],
      );
      if (this.filtroEspecialidad) {
        const esp = this.especialidades.find(
          (e) => e.idEspecialidad === this.filtroEspecialidad,
        );
        wsData.push([`Especialidad: ${esp?.nombre ?? ''}`]);
      }
      wsData.push([]);

      const headers = [
        'Nro Historia',
        'Nro Documento',
        'Paciente',
        'Edad',
        'Telefono',
        'Fecha Orden',
        'Especialidad',
        'Diagnostico',
        'Fecha Lab',
        'IC Cardio',
        'IC Neumo',
        'IC Anestesio',
        'Medico',
        'Observacion',
        'Dias en espera',
      ];
      wsData.push(headers);

      for (const r of datos) {
        wsData.push([
          r.nroHistoriaClinica,
          r.nroDocumento,
          r.paciente,
          r.edad,
          r.telefono,
          r.fechaOrden,
          r.especialidad,
          r.diagnostico,
          r.fechaLab,
          r.fechaICCardio,
          r.fechaICNeumo,
          r.fechaICAnestesio,
          r.medico,
          r.observacion,
          r.diasTranscurridos,
        ]);
      }

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      ws['!cols'] = [
        { wch: 15 },
        { wch: 15 },
        { wch: 40 },
        { wch: 6 },
        { wch: 15 },
        { wch: 14 },
        { wch: 25 },
        { wch: 40 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 35 },
        { wch: 30 },
        { wch: 12 },
      ];

      const numHeaderRows = this.hospitalLogo ? 6 : 0;
      ws['!merges'] = [
        {
          s: { r: numHeaderRows, c: 0 },
          e: { r: numHeaderRows, c: headers.length - 1 },
        },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Lista Espera QX');

      const fechaArchivo = `${this.fechaInicio}_a_${this.fechaFin}`;
      const nombreArchivo = `ListaEsperaQX_${fechaArchivo}.xlsx`;

      const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbOut], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(blob, nombreArchivo);
    } catch (error: unknown) {
      this.error =
        error instanceof ApiRequestError
          ? error.message
          : 'No se pudo exportar el reporte.';
    } finally {
      this.exportando = false;
      this.cdr.detectChanges();
    }
  }
}
