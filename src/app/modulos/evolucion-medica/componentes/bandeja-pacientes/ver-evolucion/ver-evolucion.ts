import { CommonModule } from '@angular/common';
import { Component, Input, inject, type OnInit, signal } from '@angular/core';
import { MaestrosApiService } from '../../../../../compartido/api/maestros.api.service';
import type { IPacienteDatosAdicionales } from '../../../../../compartido/tipos/tipos';

interface EtiquetaMotivo {
  etiqueta: string;
  activo: boolean;
}

interface IAdjunto {
  nombre?: string;
  dataB64?: string;
  tipo?: string;
}

interface IFarmaco {
  medicamento?: string;
  dosis?: string;
  frecuencia?: string;
  via?: string;
  duracion?: string;
}

function convertirTextoSeguro(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string') return valor.trim();
  if (typeof valor === 'number' || typeof valor === 'boolean')
    return String(valor);
  return '';
}

function extraerSintomasRaw(raw: unknown): string[] {
  const resultado: string[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string') {
        const texto = item.trim();
        if (texto) resultado.push(texto);
      } else if (item && typeof item === 'object' && 'sintoma' in item) {
        const s = convertirTextoSeguro((item as { sintoma: unknown }).sintoma);
        if (s) resultado.push(s);
      }
    }
  } else if (typeof raw === 'string' && raw.trim()) {
    for (const s of raw.split(';')) {
      const item = s.trim();
      if (item) resultado.push(item);
    }
  }
  return resultado;
}

interface IEvolucionDetalle {
  paciente?: {
    servicio?: string;
    especialidad?: string;
    ubicacion?: string;
    cama?: string;
    edad?: string;
    sexo?: string;
    [key: string]: unknown;
  };
  cabecera?: {
    estado?: string;
    medicoTratante?: string;
    servicio?: string;
    especialidad?: string;
    fecha?: string;
    hora?: string;
    [key: string]: unknown;
  };
  antecedentes?: IPacienteDatosAdicionales | null;
  motivo?: { detalle?: string; [key: string]: unknown };
  subjetivo?: Record<string, unknown>;
  sintomas?: unknown;
  signosVitales?: Record<string, unknown>;
  examenFisico?: {
    sistema?: string;
    normal?: boolean;
    hallazgo?: string;
    [key: string]: unknown;
  }[];
  diagnosticos?: {
    cie10?: string;
    descripcion?: string;
    tipo?: string;
    condicion?: string;
    [key: string]: unknown;
  }[];
  evaluacion?: Record<string, unknown>;
  plan?: {
    farmacologico?: IFarmaco[];
    solicitudExamenes?: Record<string, unknown>;
    interconsultas?: Record<string, unknown>;
    indicacionesGenerales?: Record<string, unknown>;
  };
  evolucionLibre?: string;
  ordenesMedicas?: Record<string, unknown>;
  adjuntos?: IAdjunto[];
  firmaDigital?: string;
  [key: string]: unknown;
}

@Component({
  selector: 'app-ver-evolucion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ver-evolucion.html',
})
export class VerEvolucionComponent implements OnInit {
  private readonly maestrosApi = inject(MaestrosApiService);
  public readonly logoInstitucion = signal<string>('');

  @Input({ required: true }) detalle!: IEvolucionDetalle;

  ngOnInit(): void {
    this.maestrosApi
      .getDatosInstitucion()
      .then((institucion) => {
        const logo =
          (institucion as { logoHospi?: string; logoMinsa?: string })
            ?.logoHospi ||
          (institucion as { logoHospi?: string; logoMinsa?: string })
            ?.logoMinsa ||
          '';
        this.logoInstitucion.set(logo);
      })
      .catch(() => {});
  }

  get cabecera(): {
    estado?: string;
    medicoTratante?: string;
    servicio?: string;
    especialidad?: string;
    fecha?: string;
    hora?: string;
    [key: string]: unknown;
  } {
    return this.detalle?.cabecera ?? {};
  }

  get especialidad(): string {
    const esp =
      convertirTextoSeguro(this.cabecera.especialidad) ||
      convertirTextoSeguro(this.detalle?.paciente?.especialidad);
    return esp || '—';
  }

  get servicio(): string {
    const serv =
      convertirTextoSeguro(this.cabecera.servicio) ||
      convertirTextoSeguro(this.detalle?.paciente?.servicio) ||
      convertirTextoSeguro(this.detalle?.paciente?.ubicacion);
    return serv || '—';
  }

  get prioridad(): string {
    const p =
      convertirTextoSeguro(
        (this.detalle?.paciente as Record<string, unknown>)?.prioridad,
      ) ||
      convertirTextoSeguro(
        (this.detalle?.cabecera as Record<string, unknown>)?.prioridad,
      ) ||
      convertirTextoSeguro(this.detalle?.prioridad);
    return p;
  }

  get financiamiento(): string {
    const f =
      convertirTextoSeguro(
        (this.detalle?.paciente as Record<string, unknown>)?.financiamiento,
      ) ||
      convertirTextoSeguro(
        (this.detalle?.cabecera as Record<string, unknown>)?.financiamiento,
      ) ||
      convertirTextoSeguro(this.detalle?.financiamiento);
    return f || 'SIS';
  }

  get antecedentes(): IPacienteDatosAdicionales | null {
    return (this.detalle?.antecedentes as IPacienteDatosAdicionales) ?? null;
  }

  get listaComorbilidades(): string[] {
    const ant = this.antecedentes;
    if (!ant) return [];
    const catalogo: [keyof IPacienteDatosAdicionales, string][] = [
      ['hipertensionArterial', 'Hipertensión arterial'],
      ['anemia', 'Anemia'],
      ['tuberculosis', 'Tuberculosis'],
      ['obesidad', 'Obesidad'],
      ['higadoGraso', 'Hígado graso'],
      ['fumaActualmente', 'Fuma actualmente'],
      ['dislipidemia', 'Dislipidemia'],
      ['enfTiroidea', 'Enfermedad tiroidea'],
      ['cancer', 'Cáncer'],
    ];
    return catalogo
      .filter(([campo]) => ant[campo] === 1)
      .map(([, etiqueta]) => etiqueta);
  }

  get motivos(): EtiquetaMotivo[] {
    const m = this.detalle?.motivo ?? {};
    if (m.tipo && typeof m.tipo === 'string' && m.tipo.trim().length > 0) {
      return [{ etiqueta: m.tipo.trim(), activo: true }];
    }
    return [
      { etiqueta: 'Motivo de consulta', activo: !!m.motivoConsulta },
      { etiqueta: 'Seguimiento', activo: !!m.seguimiento },
      { etiqueta: 'Control', activo: !!m.control },
      { etiqueta: 'Reevaluación', activo: !!m.reevaluacion },
      { etiqueta: 'Postoperatorio', activo: !!m.postoperatorio },
      { etiqueta: 'Interconsulta', activo: !!m.interconsulta },
      { etiqueta: 'Emergencia', activo: !!m.emergencia },
    ].filter((x) => x.activo);
  }

  get motivoDetalle(): string {
    const m = this.detalle?.motivo;
    if (!m) return '';
    const descripcion =
      typeof m.descripcion === 'string' ? m.descripcion.trim() : '';
    const detalle = typeof m.detalle === 'string' ? m.detalle.trim() : '';
    const motivoTexto = descripcion || detalle;
    if (!motivoTexto) return '';

    const listaMotivos = this.motivos;
    if (
      listaMotivos.length > 0 &&
      listaMotivos[0].etiqueta.toLowerCase() === motivoTexto.toLowerCase()
    ) {
      return '';
    }
    return motivoTexto;
  }

  get listaSignosYSintomas(): string[] {
    const conjunto = new Set<string>(
      extraerSintomasRaw(this.detalle?.sintomas),
    );
    const existentesMinusculas = new Set(
      Array.from(conjunto).map((c) => c.toLowerCase()),
    );

    for (const m of this.subjetivoMarcados) {
      const limpio = m?.trim();
      if (limpio && !existentesMinusculas.has(limpio.toLowerCase())) {
        conjunto.add(limpio);
        existentesMinusculas.add(limpio.toLowerCase());
      }
    }

    return Array.from(conjunto);
  }

  get subjetivo(): Record<string, unknown> {
    return this.detalle?.subjetivo ?? {};
  }

  get subjetivoMarcados(): string[] {
    const s = this.subjetivo;
    const etiquetas: [string, boolean][] = [
      ['Dolor', !!s.dolor],
      ['Fiebre', !!s.fiebre],
      ['Tos', !!s.tos],
      ['Náuseas', !!s.nauseas],
      ['Vómitos', !!s.vomitos],
      ['Mareos', !!s.mareos],
      ['Disnea', !!s.disnea],
    ];
    return etiquetas.filter(([, v]) => v).map(([e]) => e);
  }

  get signosVitales(): { etiqueta: string; valor: string }[] {
    const sv = this.detalle?.signosVitales ?? {};
    const items: [string, string][] = [
      ['P/A', convertirTextoSeguro(sv.presionArterial)],
      ['FC', convertirTextoSeguro(sv.frecuenciaCardiaca)],
      ['FR', convertirTextoSeguro(sv.frecuenciaRespiratoria)],
      ['T°', convertirTextoSeguro(sv.temperatura)],
      ['SpO₂', convertirTextoSeguro(sv.saturacionOxigeno)],
      ['Peso', convertirTextoSeguro(sv.peso)],
      ['Talla', convertirTextoSeguro(sv.talla)],
      ['IMC', convertirTextoSeguro(sv.imc)],
      ['Glucemia', convertirTextoSeguro(sv.glucemia)],
    ];
    return items
      .filter(([, valor]) => valor.length > 0 && valor !== '—')
      .map(([etiqueta, valor]) => ({ etiqueta, valor }));
  }

  get examenFisico(): {
    sistema?: string;
    normal?: boolean;
    hallazgo?: string;
    [key: string]: unknown;
  }[] {
    const arr = this.detalle?.examenFisico;
    if (!Array.isArray(arr)) return [];
    const vistos = new Set<string>();
    const unicos: {
      sistema?: string;
      normal?: boolean;
      hallazgo?: string;
      [key: string]: unknown;
    }[] = [];

    for (const item of arr) {
      if (!item?.sistema) continue;
      const clave = item.sistema.trim().toUpperCase();
      if (!vistos.has(clave)) {
        vistos.add(clave);
        unicos.push(item);
      }
    }
    return unicos;
  }

  get diagnosticos(): {
    cie10?: string;
    descripcion?: string;
    tipo?: string;
    condicion?: string;
    [key: string]: unknown;
  }[] {
    const arr = this.detalle?.diagnosticos;
    if (!Array.isArray(arr)) return [];

    const vistos = new Set<string>();
    const unicos: {
      cie10?: string;
      descripcion?: string;
      tipo?: string;
      condicion?: string;
      [key: string]: unknown;
    }[] = [];

    for (const d of arr) {
      if (!d || (!d.descripcion && !d.cie10)) continue;
      const clave = `${(d.cie10 || '').trim().toUpperCase()}|${(d.descripcion || '').trim().toUpperCase()}`;
      if (!vistos.has(clave)) {
        vistos.add(clave);
        unicos.push(d);
      }
    }
    return unicos;
  }

  get evaluacion(): Record<string, unknown> {
    return (this.detalle?.evaluacion as Record<string, unknown>) ?? {};
  }

  get farmacologico(): IFarmaco[] {
    const arr = this.detalle?.plan?.farmacologico;
    if (!Array.isArray(arr)) return [];

    const vistos = new Set<string>();
    const unicos: IFarmaco[] = [];

    for (const m of arr) {
      if (!m || (!m.medicamento && !m.dosis)) continue;
      const clave = `${(m.medicamento || '').trim().toUpperCase()}|${(m.dosis || '').trim().toUpperCase()}`;
      if (!vistos.has(clave)) {
        vistos.add(clave);
        unicos.push(m);
      }
    }
    return unicos;
  }

  get examenesSolicitados(): {
    tipo: string;
    examen: string;
    indicacion: string;
    prioridad: string;
  }[] {
    const raw = this.detalle?.plan?.solicitudExamenes;
    if (Array.isArray(raw)) {
      return this.mapearExamenesArray(raw);
    }
    if (raw && typeof raw === 'object') {
      return this.mapearExamenesObjeto(raw as Record<string, unknown>);
    }
    return [];
  }

  private mapearExamenesArray(raw: unknown[]): {
    tipo: string;
    examen: string;
    indicacion: string;
    prioridad: string;
  }[] {
    const list: {
      tipo: string;
      examen: string;
      indicacion: string;
      prioridad: string;
    }[] = [];
    const vistos = new Set<string>();

    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const it = item as Record<string, unknown>;
      const tipo = convertirTextoSeguro(it.tipo) || 'Laboratorio';
      const examen = convertirTextoSeguro(it.examen);
      const indicacion = convertirTextoSeguro(it.indicacion);
      const prioridad = convertirTextoSeguro(it.prioridad) || 'Urgente';
      const clave = `${tipo.toUpperCase()}|${examen.toUpperCase()}`;

      if (examen && !vistos.has(clave)) {
        vistos.add(clave);
        list.push({ tipo, examen, indicacion, prioridad });
      }
    }
    return list;
  }

  private mapearExamenesObjeto(exObj: Record<string, unknown>): {
    tipo: string;
    examen: string;
    indicacion: string;
    prioridad: string;
  }[] {
    const list: {
      tipo: string;
      examen: string;
      indicacion: string;
      prioridad: string;
    }[] = [];
    const lab = convertirTextoSeguro(exObj.laboratorio);
    const img = convertirTextoSeguro(exObj.imagenes);
    const otros = convertirTextoSeguro(exObj.otros);

    if (lab)
      list.push({
        tipo: 'Laboratorio',
        examen: lab,
        indicacion: '',
        prioridad: 'Rutina',
      });
    if (img)
      list.push({
        tipo: 'Imágenes',
        examen: img,
        indicacion: '',
        prioridad: 'Rutina',
      });
    if (otros)
      list.push({
        tipo: 'Otros',
        examen: otros,
        indicacion: '',
        prioridad: 'Rutina',
      });

    return list;
  }

  get interconsultasSolicitadas(): {
    especialidad: string;
    motivo: string;
    estado: string;
  }[] {
    const raw =
      (this.detalle?.interconsultas as
        | {
            especialidad?: string;
            IdEspecialidad?: number;
            motivo?: string;
            estado?: string;
          }[]
        | undefined) ||
      (Array.isArray(this.detalle?.plan?.interconsultas)
        ? (this.detalle?.plan?.interconsultas as {
            especialidad?: string;
            IdEspecialidad?: number;
            motivo?: string;
            estado?: string;
          }[])
        : null);

    if (Array.isArray(raw) && raw.length > 0) {
      return this.mapearInterconsultasArray(raw);
    }

    return this.mapearInterconsultasObjeto(
      (this.detalle?.plan?.interconsultas as Record<string, unknown>) ?? {},
    );
  }

  private mapearInterconsultasArray(
    raw: {
      especialidad?: string;
      IdEspecialidad?: number;
      motivo?: string;
      estado?: string;
    }[],
  ): { especialidad: string; motivo: string; estado: string }[] {
    const vistos = new Set<string>();
    const unicos: { especialidad: string; motivo: string; estado: string }[] =
      [];
    for (const ic of raw) {
      const esp =
        ic.especialidad ||
        (ic.IdEspecialidad ? `Esp. #${ic.IdEspecialidad}` : 'Especialidad');
      const mot = ic.motivo || 'Opinión y manejo conjunto';
      const est = ic.estado || 'Pendiente';
      const clave = `${esp.trim().toUpperCase()}|${mot.trim().toUpperCase()}`;
      if (!vistos.has(clave)) {
        vistos.add(clave);
        unicos.push({ especialidad: esp, motivo: mot, estado: est });
      }
    }
    return unicos;
  }

  private mapearInterconsultasObjeto(
    i: Record<string, unknown>,
  ): { especialidad: string; motivo: string; estado: string }[] {
    const items: [string, boolean][] = [
      ['Cardiología', !!i.cardiologia],
      ['Cirugía', !!i.cirugia],
      ['Nutrición', !!i.nutricion],
      ['Psicología', !!i.psicologia],
    ];
    const activos = items
      .filter(([, v]) => v)
      .map(([e]) => ({
        especialidad: e,
        motivo: 'Evaluación y manejo',
        estado: 'Pendiente',
      }));
    const otraTexto = convertirTextoSeguro(i.otra);
    if (otraTexto) {
      activos.push({
        especialidad: otraTexto,
        motivo: 'Evaluación y manejo',
        estado: 'Pendiente',
      });
    }
    return activos;
  }

  get indicacionesGenerales(): { etiqueta: string; valor: string }[] {
    const ig = this.detalle?.plan?.indicacionesGenerales ?? {};
    const items: [string, string][] = [
      ['Dieta', convertirTextoSeguro(ig.dieta)],
      ['Reposo', convertirTextoSeguro(ig.reposo)],
      ['Hidratación', convertirTextoSeguro(ig.hidratacion)],
      ['Oxígeno', convertirTextoSeguro(ig.oxigeno)],
      ['Restricciones', convertirTextoSeguro(ig.restricciones)],
    ];
    return items
      .filter(([, v]) => v.length > 0)
      .map(([e, v]) => ({ etiqueta: e, valor: v }));
  }

  get evolucionLibre(): string {
    return this.detalle?.evolucionLibre ?? '';
  }

  get ordenesMedicas(): Record<string, unknown> {
    return this.detalle?.ordenesMedicas ?? {};
  }

  get ordenesTexto(): string {
    const o = this.ordenesMedicas;
    const orden = convertirTextoSeguro(o.orden);
    const detalle = convertirTextoSeguro(o.detalle);
    if (orden && detalle) return `${orden}: ${detalle}`;
    if (orden) return orden;
    if (detalle) return detalle;
    return '';
  }

  get adjuntos(): IAdjunto[] {
    const arr = this.detalle?.adjuntos;
    return Array.isArray(arr) ? arr : [];
  }

  get firmaDigital(): string {
    return (this.detalle?.firmaDigital as string) || '';
  }

  get esFirmado(): boolean {
    const cabecera = this.cabecera;
    const estado =
      typeof cabecera.estado === 'string' ? cabecera.estado.toLowerCase() : '';
    return Boolean(
      cabecera.firmaDni ||
        this.detalle?.firmaDigital ||
        estado === 'firmado' ||
        this.detalle?.estadoFirma === 1 ||
        this.detalle?.estado === 1,
    );
  }

  get firmaDni(): string {
    return (this.cabecera.firmaDni as string) || '';
  }

  get dni(): string {
    return (this.cabecera.dni as string) || '';
  }

  get colegiatura(): string {
    return (this.cabecera.colegiatura as string) || '';
  }

  get rne(): string {
    return (this.cabecera.rne as string) || '';
  }

  get cargoCompleto(): string {
    const partes: string[] = [];
    const nombre = this.cabecera.medicoTratante || 'MÉDICO TRATANTE';
    partes.push(`Médico ${nombre}`);
    if (this.colegiatura) {
      partes.push(`Nro. Colegiatura: ${this.colegiatura}`);
    }
    if (this.rne) {
      partes.push(`Nro. RNE: ${this.rne}`);
    }
    return partes.join(' - ');
  }

  get fechaHoraFirma(): string {
    const fecha = convertirTextoSeguro(this.cabecera.fecha);
    const hora = convertirTextoSeguro(this.cabecera.hora);
    if (fecha && hora) {
      return `${fecha} ${hora}`;
    }
    return fecha;
  }
}
