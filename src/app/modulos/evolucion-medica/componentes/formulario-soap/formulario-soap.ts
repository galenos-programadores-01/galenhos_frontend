import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  type OnInit,
  signal,
} from '@angular/core';
import {
  type FormArray,
  FormBuilder,
  type FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MaestrosApiService } from '../../../../compartido/api/maestros.api.service';
import { ApiClientService } from '../../../../compartido/api-client/api-client.service';
import { ModalGlobalService } from '../../../../compartido/ui/modal-global/modal-global.service';
import { ValidadoresGalenos } from '../../../../compartido/utilidades/validadores';
import { AuthService } from '../../../auth/aplicacion/auth.service';
import { EvolucionService } from '../../servicios/evolucion.service';
import { MotivoService } from '../../servicios/motivo.service';
import {
  type SintomaCatalogo,
  type SintomaSeleccionado,
  SintomaService,
} from '../../servicios/sintoma.service';
import { AdjuntosComponent } from './adjuntos/adjuntos';
import { CabeceraEvolucionComponent } from './cabecera-evolucion/cabecera-evolucion';
import { CierreFirmaComponent } from './cierre-firma/cierre-firma';
import {
  GRUPO_DE_PANEL,
  type ItemResumenVerificacion,
  ORDEN_PANELES,
  type RegistroAuditoria,
} from './constantes/formulario-soap.constantes';
import { EvaluacionComponent } from './evaluacion/evaluacion';
import { ExamenFisicoComponent } from './examen-fisico/examen-fisico';
import { InformacionGeneralComponent } from './informacion-general/informacion-general';
import { MotivoComponent } from './motivo/motivo';
import { NavegacionSidebarComponent } from './navegacion-sidebar/navegacion-sidebar';
import { OrdenesMedicasComponent } from './ordenes-medicas/ordenes-medicas';
import { PlanTratamientoComponent } from './plan-tratamiento/plan-tratamiento';
import { ResultadosComponent } from './resultados/resultados';
import { FormularioSoapFirmaService } from './servicios/formulario-soap-firma.service';
import { SignosVitalesComponent } from './signos-vitales/signos-vitales';
import { SubjetivoComponent } from './subjetivo/subjetivo';
import { crearFormularioSoap } from './utilidades/formulario-soap.builder';
import { calcularResumenVerificacion } from './utilidades/formulario-soap-resumen.util';
import {
  type ErrorValidacionSoap,
  obtenerErroresValidacion,
  validarPasoActual,
} from './validadores/formulario-soap.validador';

@Component({
  selector: 'app-formulario-soap',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CabeceraEvolucionComponent,
    NavegacionSidebarComponent,
    InformacionGeneralComponent,
    MotivoComponent,
    SubjetivoComponent,
    SignosVitalesComponent,
    ExamenFisicoComponent,
    ResultadosComponent,
    EvaluacionComponent,
    PlanTratamientoComponent,
    OrdenesMedicasComponent,
    AdjuntosComponent,
    CierreFirmaComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './formulario-soap.html',
})
export class FormularioSoapComponent implements OnInit {
  public readonly evolucionService = inject(EvolucionService);
  public readonly authService = inject(AuthService);
  public readonly apiClient = inject(ApiClientService);
  private readonly maestrosApi = inject(MaestrosApiService);
  private readonly modalGlobal = inject(ModalGlobalService);
  private readonly motivoService = inject(MotivoService);
  private readonly sintomaService = inject(SintomaService);
  private readonly firmaService = inject(FormularioSoapFirmaService);
  private readonly constructorFormulario = inject(FormBuilder);

  public readonly activePanel = signal<string>('p1');
  public readonly openGroup = signal<string>('encuentro');
  public readonly isSaving = signal<boolean>(false);
  public readonly isSigning = signal<boolean>(false);
  public readonly logoInstitucion = signal<string>('');

  public fechaEvolucion = new Date().toISOString().slice(0, 10);
  public horaEvolucion = new Date().toTimeString().slice(0, 5);
  public tipoAtencion = 'Emergencia';
  public estadoAtencion = 'Pendiente';
  public readonly auditoria = signal<RegistroAuditoria | null>(null);
  public readonly sintomasSeleccionados = signal<Set<number>>(new Set());
  public readonly sintomasCatalogo = signal<SintomaCatalogo[]>([]);

  public readonly soapForm = crearFormularioSoap(this.constructorFormulario);

  get motivoForm(): FormGroup {
    return this.soapForm.get('motivo') as FormGroup;
  }

  get signosVitalesForm(): FormGroup {
    return this.soapForm.get('signosVitales') as FormGroup;
  }

  get diagnosticosArray(): FormArray {
    return this.soapForm.get('diagnosticos') as FormArray;
  }

  get examenFisicoArray(): FormArray {
    return this.soapForm.get('examenFisico') as FormArray;
  }

  get resultadosForm(): FormGroup {
    return this.soapForm.get('resultados') as FormGroup;
  }

  get planForm(): FormGroup {
    return this.soapForm.get('plan') as FormGroup;
  }

  get adjuntosArray(): FormArray {
    return this.soapForm.get('adjuntos') as FormArray;
  }

  get esPrimerPanel(): boolean {
    return ORDEN_PANELES.indexOf(this.activePanel()) === 0;
  }

  get esUltimoPanel(): boolean {
    return (
      ORDEN_PANELES.indexOf(this.activePanel()) === ORDEN_PANELES.length - 1
    );
  }

  get resumenVerificacionEvolucion(): ItemResumenVerificacion[] {
    return calcularResumenVerificacion(
      this.soapForm,
      this.diagnosticosArray,
      this.adjuntosArray,
      this.evolucionService.activePatient(),
      this.sintomasSeleccionados().size,
    );
  }

  get totalSeccionesCompletadas(): number {
    return this.resumenVerificacionEvolucion.filter((item) => item.completado)
      .length;
  }

  get nombreMedicoFirmante(): string {
    const perfil = this.authService.userProfile();
    if (perfil?.nombreCompleto && perfil.nombreCompleto.trim().length > 0) {
      return perfil.nombreCompleto.trim().toUpperCase();
    }
    const username = this.authService.username();
    return username ? username.toUpperCase() : 'MÉDICO TRATANTE';
  }

  get dniMedico(): string {
    return this.authService.userProfile()?.dni || '';
  }

  get colegiaturaMedico(): string {
    return this.authService.userProfile()?.colegiatura || '';
  }

  get rneMedico(): string {
    return this.authService.userProfile()?.rne || '';
  }

  get cargoCompletoFirmante(): string {
    const perfil = this.authService.userProfile();
    const partes: string[] = [`Médico ${this.nombreMedicoFirmante}`];
    if (perfil?.colegiatura) {
      partes.push(`CMP: ${perfil.colegiatura}`);
    }
    if (perfil?.rne) {
      partes.push(`RNE: ${perfil.rne}`);
    }
    return partes.join(' - ');
  }

  ngOnInit(): void {
    const pacienteSeleccionado = this.evolucionService.activePatient();
    if (pacienteSeleccionado?.estado) {
      this.estadoAtencion = pacienteSeleccionado.estado;
    }
    if (pacienteSeleccionado?.servicio) {
      this.tipoAtencion = pacienteSeleccionado.servicio;
    } else if (pacienteSeleccionado?.ubicacion) {
      this.tipoAtencion = pacienteSeleccionado.ubicacion;
    }
    void this.cargarMotivoPrevio();
    void this.cargarDiagnosticosPrevios();
    void this.cargarDatosInstitucionYPerfil();
    void this.cargarSintomasCatalogo();
  }

  async cargarSintomasCatalogo(): Promise<void> {
    try {
      const catalogo = await this.sintomaService.listarCatalogo();
      this.sintomasCatalogo.set(catalogo);
    } catch {
      /* Continuar sin catálogo */
    }
  }

  async cargarDiagnosticosPrevios(): Promise<void> {
    const paciente = this.evolucionService.activePatient();
    if (!paciente?.idRegAtencion) return;

    try {
      const diagList = await this.apiClient
        .request<
          {
            codigoCIE10?: string;
            descripcion?: string;
            tipoDiagnostico?: string;
          }[]
        >(`/api/v1/diagnosticos/atencion/${paciente.idRegAtencion}`, {
          method: 'GET',
        })
        .catch(() => []);

      if (Array.isArray(diagList) && diagList.length > 0) {
        this.diagnosticosArray.clear();
        for (const diagnostico of diagList) {
          if (diagnostico.codigoCIE10) {
            this.diagnosticosArray.push(
              this.constructorFormulario.group({
                cie10: [
                  diagnostico.codigoCIE10,
                  [Validators.required, ValidadoresGalenos.cie10()],
                ],
                descripcion: [
                  diagnostico.descripcion || '',
                  [
                    Validators.required,
                    Validators.minLength(3),
                    Validators.maxLength(250),
                  ],
                ],
                tipo: [
                  diagnostico.tipoDiagnostico || 'Presuntivo',
                  [Validators.required],
                ],
                condicion: ['Principal', [Validators.required]],
                estado: ['Activo', [Validators.required]],
              }),
            );
          }
        }
      }
    } catch {
      /* Sin diagnósticos previos */
    }
  }

  private async cargarDatosInstitucionYPerfil(): Promise<void> {
    try {
      const institucion = await this.maestrosApi.getDatosInstitucion();
      const logo =
        (institucion as { logoHospi?: string; logoMinsa?: string })
          ?.logoHospi ||
        (institucion as { logoHospi?: string; logoMinsa?: string })
          ?.logoMinsa ||
        '';
      this.logoInstitucion.set(logo);
    } catch {
      /* Continuar sin logo */
    }
    void this.authService.cargarPerfil();
  }

  async cargarMotivoPrevio(): Promise<void> {
    const paciente = this.evolucionService.activePatient();
    if (!paciente?.idRegAtencion) return;

    try {
      const motivos = await this.motivoService.listarMotivos(
        paciente.idRegAtencion,
      );
      if (motivos && motivos.length > 0) {
        const ultimoMotivo = motivos[0];
        this.soapForm.get('motivo')?.patchValue({
          tipo: ultimoMotivo.tipo || 'Consulta',
          descripcion: ultimoMotivo.descripcion || '',
        });
      }
    } catch (error) {
      console.error('Error cargando motivo previo:', error);
    }
  }

  activarPanel(identificadorPanel: string): void {
    this.activePanel.set(identificadorPanel);
    const grupo = GRUPO_DE_PANEL[identificadorPanel];
    if (grupo) {
      this.openGroup.set(grupo);
    }
  }

  irAnterior(): void {
    const indiceActual = ORDEN_PANELES.indexOf(this.activePanel());
    if (indiceActual > 0) {
      this.activarPanel(ORDEN_PANELES[indiceActual - 1]);
    }
  }

  validarPasoActual(identificadorPanel: string): string | null {
    return validarPasoActual(
      identificadorPanel,
      this.soapForm,
      this.diagnosticosArray,
    );
  }

  irSiguiente(): void {
    const errorPaso = this.validarPasoActual(this.activePanel());
    if (errorPaso) {
      this.modalGlobal.info(errorPaso, 'Campos Obligatorios');
      return;
    }

    const indiceActual = ORDEN_PANELES.indexOf(this.activePanel());
    if (indiceActual < ORDEN_PANELES.length - 1) {
      this.activarPanel(ORDEN_PANELES[indiceActual + 1]);
    }
  }

  numeroEvolucion(): string {
    const paciente = this.evolucionService.activePatient();
    if (!paciente) {
      return '—';
    }
    return `EV-${paciente.idRegAtencion}`;
  }

  obtenerErroresValidacion(): ErrorValidacionSoap[] {
    return obtenerErroresValidacion(this.soapForm, this.diagnosticosArray);
  }

  async firmar(): Promise<void> {
    const errores = this.obtenerErroresValidacion();
    if (errores.length > 0) {
      this.soapForm.markAllAsTouched();
      this.activarPanel(errores[0].panel);
      const detalleErrores = errores.map((e) => `• ${e.mensaje}`).join('\n');
      this.modalGlobal.error(
        `No se puede firmar la evolución porque existen campos pendientes o inválidos:\n\n${detalleErrores}`,
        'Campos requeridos pendientes',
      );
      return;
    }

    const confirmado = await this.modalGlobal.confirmar(
      'Se generará el PDF de la evolución y se abrirá el Firmador de Firma Perú para firmar con su DNIe. ¿Desea continuar?',
      'Firmar evolución con DNIe',
      'Firmar',
    );
    if (!confirmado) {
      return;
    }

    this.isSigning.set(true);

    try {
      const paciente = this.evolucionService.activePatient();
      if (!paciente) {
        this.modalGlobal.error('No hay paciente seleccionado.', 'Error');
        return;
      }

      const seleccionados = this.sintomasSeleccionados();
      const catalogoSintomas =
        this.sintomasCatalogo().length > 0
          ? this.sintomasCatalogo()
          : await this.sintomaService.listarCatalogo();

      const listaSintomasSeleccionados: SintomaSeleccionado[] = catalogoSintomas
        .filter((sintoma) => seleccionados.has(sintoma.idSintoma))
        .map((sintoma) => ({
          idSintoma: sintoma.idSintoma,
          sistema: sintoma.sistema,
          sintoma: sintoma.sintoma,
        }));

      const resultado = await this.firmaService.procesarFirmaDigital({
        soapForm: this.soapForm,
        paciente,
        fechaEvolucion: this.fechaEvolucion,
        horaEvolucion: this.horaEvolucion,
        tipoAtencion: this.tipoAtencion,
        listaSintomas: listaSintomasSeleccionados,
      });

      if (!resultado.exito) {
        this.modalGlobal.error(
          resultado.mensajeError ||
            'La firma fue exitosa pero no se pudo guardar la evolución. Verifique la conexión.',
          'Error en el proceso de firma',
        );
        return;
      }

      this.estadoAtencion = 'Firmado';
      if (resultado.respuestaGuardado) {
        this.auditoria.set({
          fecha: resultado.respuestaGuardado.fecha,
          hora: resultado.respuestaGuardado.hora,
          usuario: this.authService.username() ?? '',
          ip: resultado.respuestaGuardado.ipCliente,
        });
      }

      this.modalGlobal.exito(
        'La evolución fue firmada con el DNIe y guardada correctamente.',
        'Evolución firmada',
      );
      this.evolucionService.clearSelection();
    } catch (error) {
      console.error('Error en flujo de firma:', error);
      const mensaje =
        error instanceof Error
          ? error.message
          : 'Ocurrió un error durante el proceso de firma. Intente de nuevo.';
      this.modalGlobal.error(mensaje, 'Error');
    } finally {
      this.isSigning.set(false);
    }
  }
}
