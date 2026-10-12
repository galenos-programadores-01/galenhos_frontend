import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalGlobalService } from '../../../../../../../compartido/ui/modal-global/modal-global.service';
import {
  TriajeApiService,
  type TriajeConsultaPayload,
} from '../../../../../../triaje/adaptadores/salida/http/triaje.api.service';
import type { ColaPacienteCEItem } from '../../../../../tipos/atencion-ce.tipos';

@Component({
  selector: 'app-triaje-ce-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './triaje-ce-modal.component.html',
})
export class TriajeCeModalComponent {
  private readonly triajeApi = inject(TriajeApiService);
  private readonly modalGlobal = inject(ModalGlobalService);

  readonly visible = input<boolean>(false);
  readonly paciente = input<ColaPacienteCEItem | null>(null);
  readonly soloLectura = input<boolean>(false);

  readonly cerrarModal = output<void>();
  readonly triajeGuardado = output<{ idAtencion: number }>();

  readonly modoEdicionManual = signal<boolean>(false);
  readonly esModoLectura = computed(
    () => this.soloLectura() && !this.modoEdicionManual(),
  );

  readonly pulso = signal<string>('');
  readonly frecCardiaca = signal<string>('');
  readonly temperatura = signal<string>('');
  readonly paSistolica = signal<string>('');
  readonly paDiastolica = signal<string>('');
  readonly hemoglobina = signal<string>('');
  readonly satO2 = signal<string>('');
  readonly frecRespiratoria = signal<string>('');
  readonly fiO2 = signal<string>('');
  readonly peso = signal<string>('');
  readonly talla = signal<string>('');
  readonly esGestante = signal<boolean>(false);
  readonly observaciones = signal<string>('');

  readonly cargandoDatos = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);
  readonly mensajeError = signal<string>('');
  readonly erroresValidacion = signal<Record<string, string>>({});

  readonly imc = computed(() => {
    const pesoNum = parseFloat(this.peso());
    const tallaNum = parseFloat(this.talla());
    if (!pesoNum || !tallaNum || pesoNum <= 0 || tallaNum <= 0) {
      return '';
    }
    const estaturaMetros = tallaNum / 100;
    const imcCalculado = pesoNum / (estaturaMetros * estaturaMetros);
    if (Number.isNaN(imcCalculado) || !Number.isFinite(imcCalculado)) {
      return '';
    }
    return imcCalculado.toFixed(2);
  });

  readonly clasificacionImc = computed(() => {
    const valor = parseFloat(this.imc());
    if (!valor) return null;
    if (valor < 18.5) {
      return {
        texto: 'Bajo Peso',
        clase: 'text-amber-700 bg-amber-50 border-amber-200',
      };
    }
    if (valor < 25.0) {
      return {
        texto: 'Normal',
        clase: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      };
    }
    if (valor < 30.0) {
      return {
        texto: 'Sobrepeso',
        clase: 'text-orange-700 bg-orange-50 border-orange-200',
      };
    }
    return {
      texto: 'Obesidad',
      clase: 'text-red-700 bg-red-50 border-red-200',
    };
  });

  constructor() {
    effect(() => {
      const estaVisible = this.visible();
      const pacienteActual = this.paciente();
      if (estaVisible && pacienteActual) {
        void this.inicializarFormulario(pacienteActual);
      }
    });
  }

  alCerrar(): void {
    if (this.guardando()) return;
    this.modoEdicionManual.set(false);
    this.cerrarModal.emit();
  }

  habilitarEdicion(): void {
    this.modoEdicionManual.set(true);
  }

  limpiarErrorCampo(campo: string): void {
    const erroresActuales = { ...this.erroresValidacion() };
    if (erroresActuales[campo]) {
      delete erroresActuales[campo];
      delete erroresActuales.general;
      this.erroresValidacion.set(erroresActuales);
    }
  }

  private esTeclaNavegacion(evento: KeyboardEvent): boolean {
    return (
      [
        'Backspace',
        'Delete',
        'Tab',
        'Escape',
        'Enter',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End',
      ].includes(evento.key) ||
      evento.ctrlKey ||
      evento.metaKey
    );
  }

  filtrarTeclasEntero(evento: KeyboardEvent): void {
    if (this.esTeclaNavegacion(evento)) {
      return;
    }
    if (!/^[0-9]$/.test(evento.key)) {
      evento.preventDefault();
    }
  }

  filtrarTeclasDecimal(evento: KeyboardEvent, valorActual: string): void {
    if (this.esTeclaNavegacion(evento)) {
      return;
    }
    if (evento.key === '.' || evento.key === ',') {
      if (valorActual.includes('.')) {
        evento.preventDefault();
      }
      return;
    }
    if (!/^[0-9]$/.test(evento.key)) {
      evento.preventDefault();
    }
  }

  actualizarEntero(
    campo:
      | 'paSistolica'
      | 'paDiastolica'
      | 'pulso'
      | 'frecCardiaca'
      | 'satO2'
      | 'frecRespiratoria',
    valor: string,
    min: number,
    max: number,
    unidad: string,
  ): void {
    const sanitizado = valor.replace(/[^0-9]/g, '');
    this[campo].set(sanitizado);

    const errores = { ...this.erroresValidacion() };
    if (!sanitizado) {
      delete errores[campo];
      this.erroresValidacion.set(errores);
      return;
    }

    const num = parseInt(sanitizado, 10);
    if (Number.isNaN(num) || num < min || num > max) {
      errores[campo] = `Rango humano real: ${min} a ${max} ${unidad}`;
    } else {
      delete errores[campo];
      delete errores.general;
    }

    if (campo === 'paSistolica' || campo === 'paDiastolica') {
      const sis = parseInt(this.paSistolica(), 10);
      const dia = parseInt(this.paDiastolica(), 10);
      if (!Number.isNaN(sis) && !Number.isNaN(dia)) {
        if (sis <= dia) {
          errores.paSistolica = 'La sistólica debe ser mayor que la diastólica';
        } else if (sis - dia < 10) {
          errores.paSistolica =
            'Diferencial mínima: 10 mmHg entre sistólica y diastólica';
        } else if (
          errores.paSistolica &&
          !errores.paSistolica.startsWith('Rango')
        ) {
          delete errores.paSistolica;
        }
      }
    }

    this.erroresValidacion.set(errores);
  }

  actualizarDecimal(
    campo: 'temperatura' | 'peso' | 'talla' | 'hemoglobina' | 'fiO2',
    valor: string,
    min: number,
    max: number,
    maxDecimales: number,
    unidad: string,
  ): void {
    let sanitizado = valor.replace(/,/g, '.');
    sanitizado = sanitizado.replace(/[^0-9.]/g, '');
    const partes = sanitizado.split('.');
    if (partes.length > 2) {
      sanitizado = `${partes[0]}.${partes.slice(1).join('')}`;
    }
    if (partes.length === 2 && partes[1].length > maxDecimales) {
      sanitizado = `${partes[0]}.${partes[1].substring(0, maxDecimales)}`;
    }

    this[campo].set(sanitizado);

    const errores = { ...this.erroresValidacion() };
    if (!sanitizado || sanitizado === '.') {
      delete errores[campo];
      this.erroresValidacion.set(errores);
      return;
    }

    const num = parseFloat(sanitizado);
    if (Number.isNaN(num) || num < min || num > max) {
      errores[campo] = `Rango humano real: ${min} a ${max} ${unidad}`;
    } else {
      delete errores[campo];
      delete errores.general;
    }

    this.erroresValidacion.set(errores);
  }

  validarEntero(
    valorStr: string,
    campo: string,
    min: number,
    max: number,
    unidad: string,
    errores: Record<string, string>,
  ): void {
    if (!valorStr) return;

    if (!/^\d+$/.test(valorStr)) {
      errores[campo] = 'Solo números enteros positivos sin decimales';
      return;
    }

    const valor = parseInt(valorStr, 10);
    if (Number.isNaN(valor) || valor < min || valor > max) {
      errores[campo] = `Rango humano real: ${min} a ${max} ${unidad}`;
    }
  }

  validarDecimal(
    valorStr: string,
    campo: string,
    min: number,
    max: number,
    maxDecimales: number,
    unidad: string,
    errores: Record<string, string>,
  ): void {
    if (!valorStr) return;

    const regex = maxDecimales === 1 ? /^\d+(\.\d{1})?$/ : /^\d+(\.\d{1,2})?$/;
    if (!regex.test(valorStr)) {
      errores[campo] = `Número con máximo ${maxDecimales} decimal(es)`;
      return;
    }

    const valor = parseFloat(valorStr);
    if (Number.isNaN(valor) || valor < min || valor > max) {
      errores[campo] = `Rango humano real: ${min} a ${max} ${unidad}`;
    }
  }

  validarFormulario(): boolean {
    const errores: Record<string, string> = {};

    const sistolicaStr = this.paSistolica().trim();
    const diastolicaStr = this.paDiastolica().trim();
    const pulsoStr = this.pulso().trim();
    const fcStr = this.frecCardiaca().trim();
    const tempStr = this.temperatura().trim();
    const satStr = this.satO2().trim();
    const frStr = this.frecRespiratoria().trim();
    const fio2Str = this.fiO2().trim();
    const pesoStr = this.peso().trim();
    const tallaStr = this.talla().trim();
    const hbStr = this.hemoglobina().trim();
    const obsStr = this.observaciones().trim();

    // 1. Campo Obligatorio General: Requiere al menos un signo vital registrado
    const tieneSignosVitales =
      sistolicaStr ||
      diastolicaStr ||
      pulsoStr ||
      fcStr ||
      tempStr ||
      satStr ||
      frStr ||
      pesoStr ||
      tallaStr ||
      hbStr;

    if (!tieneSignosVitales) {
      errores.general =
        'Registro obligatorio: Debe ingresar al menos un parámetro de signos vitales (P.A., Pulso, Temp, etc.).';
    }

    // 2. Presión Arterial: Consistencia de campos y reglas condicionales
    if (sistolicaStr || diastolicaStr) {
      if (!sistolicaStr) {
        errores.paSistolica = 'Requerido: Ingrese la presión sistólica';
      } else {
        this.validarEntero(
          sistolicaStr,
          'paSistolica',
          40,
          260,
          'mmHg',
          errores,
        );
      }

      if (!diastolicaStr) {
        errores.paDiastolica = 'Requerido: Ingrese la presión diastólica';
      } else {
        this.validarEntero(
          diastolicaStr,
          'paDiastolica',
          30,
          160,
          'mmHg',
          errores,
        );
      }

      if (
        sistolicaStr &&
        diastolicaStr &&
        !errores.paSistolica &&
        !errores.paDiastolica
      ) {
        const sis = parseInt(sistolicaStr, 10);
        const dia = parseInt(diastolicaStr, 10);
        if (sis <= dia) {
          errores.paSistolica = 'La sistólica debe ser mayor que la diastólica';
        } else if (sis - dia < 10) {
          errores.paSistolica =
            'Diferencial mínima: 10 mmHg entre sistólica y diastólica';
        }
      }
    }

    // 3. Validación de Enteros Fisiológicos Reales
    this.validarEntero(pulsoStr, 'pulso', 30, 250, 'lpm', errores);
    this.validarEntero(fcStr, 'frecCardiaca', 30, 250, 'lpm', errores);
    this.validarEntero(frStr, 'frecRespiratoria', 6, 60, 'rpm', errores);
    this.validarEntero(satStr, 'satO2', 40, 100, '%', errores);

    // 4. Validación de Decimales Fisiológicos Reales (Talla máx 250 cm, Peso máx 350 kg)
    this.validarDecimal(tempStr, 'temperatura', 32.0, 43.0, 1, '°C', errores);
    this.validarDecimal(pesoStr, 'peso', 1.0, 350.0, 2, 'Kg', errores);
    this.validarDecimal(tallaStr, 'talla', 20.0, 250.0, 1, 'cm', errores);
    this.validarDecimal(hbStr, 'hemoglobina', 3.0, 25.0, 1, 'g/dL', errores);
    this.validarDecimal(fio2Str, 'fiO2', 0.21, 1.0, 2, 'fracción', errores);

    // 5. Regla Condicional de Negocio: Condición de Gestante vs Sexo
    const pacienteActual = this.paciente();
    if (this.esGestante() && pacienteActual) {
      const sexo = (pacienteActual.sexo || '').toUpperCase();
      if (sexo === 'M' || sexo === 'MASCULINO') {
        errores.esGestante =
          'Inconsistencia clínica: El paciente está registrado con sexo Masculino en la filiación.';
      }
    }

    // 6. Longitud Máxima en Observaciones
    if (obsStr.length > 300) {
      errores.observaciones =
        'Las observaciones no pueden superar los 300 caracteres.';
    }

    this.erroresValidacion.set(errores);
    return Object.keys(errores).length === 0;
  }

  async guardarTriaje(): Promise<void> {
    const pacienteActual = this.paciente();
    if (!pacienteActual) return;

    this.mensajeError.set('');

    if (!this.validarFormulario()) {
      return;
    }

    this.guardando.set(true);

    let presionFinal = '';
    const sistolica = this.paSistolica().trim();
    const diastolica = this.paDiastolica().trim();
    if (sistolica && diastolica) {
      presionFinal = `${sistolica}/${diastolica}`;
    } else if (sistolica) {
      presionFinal = sistolica;
    }

    const payload: TriajeConsultaPayload = {
      idAtencion: pacienteActual.idAtencion,
      idPaciente: pacienteActual.idPaciente,
      idEmpleado: 0,
      talla: this.talla().trim(),
      peso: this.peso().trim(),
      temperatura: this.temperatura().trim(),
      pulso: this.pulso().trim(),
      frecRespiratoria: this.frecRespiratoria().trim(),
      frecCardiaca: this.frecCardiaca().trim(),
      sat02: this.satO2().trim(),
      fi02: this.fiO2().trim(),
      presionArterial: presionFinal,
      hemoglobina: this.hemoglobina().trim(),
      observacion: this.observaciones().trim(),
      imc: this.imc(),
      gestante: this.esGestante() ? '1' : '0',
    };

    try {
      await this.triajeApi.registrarTriajeConsulta(payload);
      this.modalGlobal.exito(
        'Los signos vitales del triaje han sido registrados correctamente.',
        'Triaje Registrado',
      );
      this.triajeGuardado.emit({ idAtencion: pacienteActual.idAtencion });
      this.cerrarModal.emit();
    } catch {
      this.mensajeError.set(
        'No se pudo registrar el triaje. Verifique los datos ingresados.',
      );
      this.modalGlobal.error(
        'Ocurrió un error al registrar los signos vitales del paciente.',
        'Error de Registro',
      );
    } finally {
      this.guardando.set(false);
    }
  }

  private async inicializarFormulario(
    pacienteActual: ColaPacienteCEItem,
  ): Promise<void> {
    this.modoEdicionManual.set(false);
    this.limpiarCampos();
    this.cargandoDatos.set(true);
    try {
      const triajeExistente =
        await this.triajeApi.obtenerTriajeConsultaPorAtencion(
          pacienteActual.idAtencion,
        );
      if (triajeExistente) {
        this.cargarDatosExistentes(triajeExistente);
      }
    } catch {
      // Si no existe, se mantiene formulario limpio para nuevo registro
    } finally {
      this.cargandoDatos.set(false);
    }
  }

  private limpiarCampos(): void {
    this.pulso.set('');
    this.frecCardiaca.set('');
    this.temperatura.set('');
    this.paSistolica.set('');
    this.paDiastolica.set('');
    this.hemoglobina.set('');
    this.satO2.set('');
    this.frecRespiratoria.set('');
    this.fiO2.set('');
    this.peso.set('');
    this.talla.set('');
    this.esGestante.set(false);
    this.observaciones.set('');
    this.mensajeError.set('');
  }

  private cargarDatosExistentes(datos: Record<string, unknown>): void {
    const obtenerValor = (claves: string[]): string => {
      for (const clave of claves) {
        const v = datos[clave] ?? datos[clave.toLowerCase()];
        if (v !== null && v !== undefined) {
          let s = String(v).trim();
          if (s !== '') {
            // Decodificación de emergencia Base64 en caso de buffer binario heredado
            if (
              /^[A-Za-z0-9+/=]+$/.test(s) &&
              s.length % 4 === 0 &&
              (s.endsWith('=') || s.endsWith('=='))
            ) {
              try {
                const dec = atob(s);
                if (!Number.isNaN(Number(dec))) {
                  s = dec;
                }
              } catch {
                // No es Base64
              }
            }
            return s;
          }
        }
      }
      return '';
    };

    const pulsoVal = obtenerValor(['Pulso', 'pulso']);
    const fcVal = obtenerValor([
      'FrecCardiaca',
      'FrecuenciaCardiaca',
      'frecCardiaca',
      'frecuenciaCardiaca',
    ]);
    this.pulso.set(pulsoVal || fcVal);
    this.frecCardiaca.set(fcVal || pulsoVal);

    const tempVal = obtenerValor(['Temperatura', 'temperatura']);
    this.temperatura.set(
      tempVal === '0' || tempVal === '0.00' || tempVal === '.00' ? '' : tempVal,
    );

    this.hemoglobina.set(obtenerValor(['Hemoglobina', 'hemoglobina']));

    const satVal = obtenerValor([
      'SAT02',
      'Saturacion',
      'sat02',
      'saturacion',
      'satO2',
    ]);
    this.satO2.set(satVal === '0' ? '' : satVal);

    this.frecRespiratoria.set(
      obtenerValor([
        'FrecRespiratoria',
        'FrecuenciaRespiratoria',
        'frecRespiratoria',
        'frecuenciaRespiratoria',
      ]),
    );

    this.fiO2.set(obtenerValor(['FI02', 'fi02', 'fiO2']));
    this.peso.set(obtenerValor(['Peso', 'peso']));
    this.talla.set(obtenerValor(['Talla', 'talla']));
    this.observaciones.set(
      obtenerValor([
        'Observacion',
        'observacion',
        'Observaciones',
        'observaciones',
      ]),
    );

    const pa = obtenerValor(['PresionArterial', 'presionArterial']);
    if (pa.includes('/')) {
      const partes = pa.split('/');
      this.paSistolica.set(partes[0].trim());
      this.paDiastolica.set(partes[1].trim());
    } else {
      this.paSistolica.set(pa);
    }

    const gestanteValor = obtenerValor(['Gestante', 'gestante']);
    this.esGestante.set(
      gestanteValor === '1' || gestanteValor.toLowerCase() === 'true',
    );
  }
}
