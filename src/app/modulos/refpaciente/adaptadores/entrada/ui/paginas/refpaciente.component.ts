import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiRequestError } from '../../../../../../compartido/api-client/api-client.service';
import {
  type ConsultaReferenciaDetalleResponse,
  type EstablecimientoItem,
  type ReferenciaPacienteItem,
  RefpacienteApiService,
  type UbicacionItem,
} from '../../../salida/http/refpaciente.api.service';
import { construirPdfHojaReferencia } from './referencia-pdf.util';

interface TipoDocumento {
  id: number;
  nombre: string;
}

interface FilaRefPaciente {
  fechaReferencia: string;
  horaReferencia: string;
  fechaEnvio: string;
  fechaAceptacion: string;
  estado: string;
  numeroReferencia: string;
  paciente: string;
  numeroDocumento: string;
  fechaNacimiento: string;
  celular: string;
  item: ReferenciaPacienteItem;
}

interface UbigeoResuelto {
  departamento: string;
  provincia: string;
  distrito: string;
}

function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

function normalizarUbigeo(codigo: string): string {
  return soloDigitos(codigo).replace(/^0+/, '');
}

@Component({
  selector: 'app-refpaciente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './refpaciente.component.html',
})
export class RefpacienteComponent {
  private readonly apiService = inject(RefpacienteApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  tiposDocumento: TipoDocumento[] = [
    { id: 1, nombre: 'DNI' },
    { id: 2, nombre: 'CE' },
    { id: 5, nombre: 'SD' },
  ];
  idTipoDocumento = 1;
  nroDocumento = '';
  pagina = '1';

  resultado?: ConsultaReferenciaDetalleResponse;
  filas: FilaRefPaciente[] = [];
  total = 0;
  totalPaginas = 0;

  consultando = false;
  error = '';
  buscado = false;

  private catalogoUps?: Map<string, string>;
  private establecimientos?: EstablecimientoItem[];
  private departamentos?: UbicacionItem[];
  private provinciasPorDepartamento = new Map<number, UbicacionItem[]>();
  private distritosPorProvincia = new Map<number, UbicacionItem[]>();
  private ubigeosCache = new Map<string, UbigeoResuelto>();

  private async obtenerCatalogoUps(): Promise<Map<string, string>> {
    if (this.catalogoUps) return this.catalogoUps;
    const lista = await this.apiService.listarUps();
    this.catalogoUps = new Map(
      (lista ?? [])
        .filter((u) => u.codigo && u.descripcion)
        .map((u) => [u.codigo.trim(), u.descripcion.trim()]),
    );
    return this.catalogoUps;
  }

  private async obtenerEstablecimientos(): Promise<EstablecimientoItem[]> {
    if (this.establecimientos) return this.establecimientos;
    this.establecimientos = await this.apiService.listarEstablecimientos();
    return this.establecimientos;
  }

  private async resolverDepartamentoYProvincia(
    codigoDepartamento: string,
    codigoProvincia: string,
  ): Promise<{
    departamento: string;
    provincia: string;
    idProvincia?: number;
  }> {
    if (!this.departamentos) {
      this.departamentos = await this.apiService.listarDepartamentos();
    }
    const departamento = this.departamentos.find(
      (d) =>
        normalizarUbigeo(String(d.id)) === normalizarUbigeo(codigoDepartamento),
    );
    if (!departamento) return { departamento: '', provincia: '' };
    let provincias = this.provinciasPorDepartamento.get(departamento.id);
    if (!provincias) {
      provincias = await this.apiService.listarProvincias(departamento.id);
      this.provinciasPorDepartamento.set(departamento.id, provincias);
    }
    const provincia = provincias.find(
      (p) =>
        normalizarUbigeo(String(p.id)) === normalizarUbigeo(codigoProvincia),
    );
    return {
      departamento: departamento.nombre ?? '',
      provincia: provincia?.nombre ?? '',
      idProvincia: provincia?.id,
    };
  }

  private async obtenerUbigeo(
    paciente: ReferenciaPacienteItem['paciente'],
  ): Promise<UbigeoResuelto> {
    const ubi1 = soloDigitos(paciente?.ubigeo1 ?? '');
    const ubi2 = soloDigitos(paciente?.ubigeo2 ?? '');
    const clave = `${ubi1}|${ubi2}`;
    const enCache = this.ubigeosCache.get(clave);
    if (enCache) return enCache;

    const resultado: UbigeoResuelto = {
      departamento: '',
      provincia: '',
      distrito: '',
    };

    try {
      // ubigeo1 es el IdReniec del distrito.
      if (ubi1) {
        const distritos = await this.apiService.listarDistritosPorIdReniec(
          Number(ubi1),
        );
        const distrito = distritos[0];
        if (distrito && distrito.idProvincia > 0) {
          const deptProv = await this.resolverDepartamentoYProvincia(
            String(distrito.idProvincia).slice(0, 2),
            String(distrito.idProvincia),
          );
          resultado.distrito = distrito.nombre;
          resultado.departamento = deptProv.departamento;
          resultado.provincia = deptProv.provincia;
          this.ubigeosCache.set(clave, resultado);
          return resultado;
        }
      }

      // Respaldo: resolución por longitud de código según el ubigeo que venga.
      let codigoDepartamento = '';
      let codigoProvincia = '';
      let codigoDistrito = '';
      if (ubi2.length >= 6) {
        codigoDistrito = ubi2.slice(0, 6);
        codigoProvincia = ubi2.slice(0, 4);
        codigoDepartamento = ubi2.slice(0, 2);
      } else if (ubi2.length >= 4) {
        codigoProvincia = ubi2.slice(0, 4);
        codigoDepartamento = ubi2.slice(0, 2);
      } else if (ubi2.length >= 2) {
        codigoDepartamento = ubi2.slice(0, 2);
      }
      if (!codigoDepartamento && ubi1.length >= 2) {
        codigoDepartamento = ubi1.slice(0, 2);
      }
      if (!codigoProvincia && ubi1.length >= 4) {
        codigoProvincia = ubi1.slice(0, 4);
      }
      if (!codigoDistrito && ubi1.length >= 6) {
        codigoDistrito = ubi1.slice(0, 6);
      }
      if (!codigoProvincia && codigoDistrito) {
        codigoProvincia = codigoDistrito.slice(0, 4);
      }
      if (!codigoDepartamento && codigoProvincia) {
        codigoDepartamento = codigoProvincia.slice(0, 2);
      }

      if (codigoDepartamento || codigoProvincia) {
        const deptProv = await this.resolverDepartamentoYProvincia(
          codigoDepartamento,
          codigoProvincia,
        );
        resultado.departamento = deptProv.departamento;
        resultado.provincia = deptProv.provincia;
        if (codigoDistrito && deptProv.idProvincia) {
          let distritos = this.distritosPorProvincia.get(deptProv.idProvincia);
          if (!distritos) {
            distritos = await this.apiService.listarDistritos(
              deptProv.idProvincia,
            );
            this.distritosPorProvincia.set(deptProv.idProvincia, distritos);
          }
          const distrito = distritos.find(
            (x) =>
              normalizarUbigeo(String(x.id)) ===
              normalizarUbigeo(codigoDistrito),
          );
          if (distrito) {
            resultado.distrito = distrito.nombre ?? '';
          }
        }
      }
    } catch (err) {
      console.error('[Refpaciente] Error al resolver el ubigeo:', err);
    }

    this.ubigeosCache.set(clave, resultado);
    return resultado;
  }

  async buscar(pagina?: number): Promise<void> {
    const pag = pagina ?? (Number(this.pagina) || 1);
    if (!this.nroDocumento.trim()) {
      this.error = 'El número de documento es obligatorio.';
      return;
    }
    if (!this.idTipoDocumento) {
      this.error = 'Seleccione el tipo de documento.';
      return;
    }
    if (!Number.isInteger(pag) || pag < 1) {
      this.error = 'La página debe ser un número entero mayor o igual a 1.';
      return;
    }

    this.consultando = true;
    this.error = '';
    this.buscado = true;
    try {
      const respuesta = await this.apiService.consultarReferenciaDetalle({
        numerodocumento: this.nroDocumento.trim(),
        tipodocumento: String(this.idTipoDocumento),
        pagina: String(pag),
      });
      this.resultado = respuesta;
      this.pagina = String(pag);
      if (respuesta.codigo !== '0000') {
        this.filas = [];
        this.total = 0;
        this.totalPaginas = 0;
        this.error = respuesta.mensaje || 'La consulta no devolvió resultados.';
        return;
      }
      this.filas = (respuesta.datos?.datos ?? []).map((item) =>
        this.aFila(item),
      );
      this.total = respuesta.datos?.total ?? 0;
      this.totalPaginas = respuesta.datos?.paginas ?? 0;
    } catch (err) {
      console.error('[Refpaciente] Error al consultar referencias:', err);
      this.resultado = undefined;
      this.filas = [];
      this.total = 0;
      this.totalPaginas = 0;
      this.error =
        err instanceof ApiRequestError
          ? err.message
          : 'No se pudo consultar la referencia. Verifique la conexión.';
    } finally {
      this.consultando = false;
      this.cdr.detectChanges();
    }
  }

  anterior(): void {
    const pag = Number(this.pagina);
    if (pag > 1) {
      void this.buscar(pag - 1);
    }
  }

  siguiente(): void {
    const pag = Number(this.pagina);
    if (pag < this.totalPaginas) {
      void this.buscar(pag + 1);
    }
  }

  get puedeAnterior(): boolean {
    return Number(this.pagina) > 1;
  }

  get puedeSiguiente(): boolean {
    return Number(this.pagina) < this.totalPaginas;
  }

  async generarHoja(fila: FilaRefPaciente): Promise<void> {
    const item = fila.item;

    try {
      const generada = await this.generarHojaOficial(item);
      if (generada) {
        this.cdr.detectChanges();
        return;
      }
    } catch (err) {
      console.warn(
        '[Refpaciente] No se pudo obtener la hoja oficial, se genera la local:',
        err,
      );
    }

    try {
      const [ups, establecimientos, ubigeo] = await Promise.all([
        this.obtenerCatalogoUps().catch(() => undefined),
        this.obtenerEstablecimientos().catch(() => undefined),
        this.obtenerUbigeo(item.paciente),
      ]);
      const doc = await construirPdfHojaReferencia(
        item,
        ups,
        establecimientos,
        ubigeo,
      );
      if (doc) {
        doc.output('dataurlnewwindow');
      }
    } catch (err) {
      console.error(
        '[Refpaciente] Error al generar la hoja de referencia:',
        err,
      );
      this.error = 'No se pudo generar la hoja de referencia.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  private async generarHojaOficial(
    item: ReferenciaPacienteItem,
  ): Promise<boolean> {
    const referencia = item.datos_referencia ?? {};
    const idReferencia = Number(soloDigitos(referencia.id_referencia ?? ''));
    const codigoOrigen = soloDigitos(
      referencia.codigo_establecimiento_origen ?? '',
    );
    if (!idReferencia || !codigoOrigen) {
      return false;
    }
    const resultado = await this.apiService.generarHojaReferencia({
      idreferencia: idReferencia,
      idestablecimiento: Number(codigoOrigen),
      estadoreferencia: referencia.estado ?? 'referencia',
    });
    if (!resultado?.archivoB64) {
      return false;
    }
    this.abrirPdfBase64(resultado.archivoB64);
    return true;
  }

  private abrirPdfBase64(archivoB64: string): void {
    const binario = atob(archivoB64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) {
      bytes[i] = binario.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  colorEstado(estado: string): string {
    switch (estado.trim().toUpperCase()) {
      case 'PACIENTE CITADO':
        return '#f7e2ff';
      case 'PACIENTE RECIBIDO':
        return '#ccf0ff';
      case 'ACEPTADO':
        return '#d2ffdf';
      case 'PENDIENTE':
        return '#ffd0cf';
      case 'RECHAZADO':
        return '#d9d9d9';
      case 'OBSERVADO':
        return '#ffe8d4';
      default:
        return '';
    }
  }

  private aFila(item: ReferenciaPacienteItem): FilaRefPaciente {
    const paciente = item.paciente ?? {};
    const referencia = item.datos_referencia ?? {};
    return {
      fechaReferencia: referencia.fecha_referencia ?? '',
      horaReferencia: referencia.hora_referencia ?? '',
      fechaEnvio: referencia.fecha_envio ?? '',
      fechaAceptacion: referencia.fecha_aceptacion ?? '',
      estado: referencia.estado ?? '',
      numeroReferencia: referencia.numero_referencia ?? '',
      paciente: [
        paciente.nombres,
        paciente.primer_apellido,
        paciente.segundo_apellido,
      ]
        .filter(Boolean)
        .join(' '),
      numeroDocumento: paciente.numero_documento ?? '',
      fechaNacimiento: paciente.fecha_nacimiento ?? '',
      celular: paciente.celular ?? '',
      item,
    };
  }
}
