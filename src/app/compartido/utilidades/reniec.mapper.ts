import { Injectable, inject } from '@angular/core';
import { UbigeoService } from '../../core/servicios/ubigeo.service';
import type { ICatalogoDescripcion, IReniecDatos } from '../tipos/api-tipos';
import {
  type FormRegistroPaciente,
  normalizarTexto,
} from '../ui/registro-paciente/registro-paciente.interfaces';

export interface ResultadoMapeoReniec {
  form: Partial<FormRegistroPaciente>;
  depNacimientoSel?: string;
  provNacimientoSel?: string;
}

function limpiarCadena(valor: unknown): string {
  if (typeof valor === 'string') {
    return valor.trim();
  }
  if (typeof valor === 'number') {
    return String(valor);
  }
  return '';
}

@Injectable({
  providedIn: 'root',
})
export class ReniecMapper {
  private readonly ubigeoService = inject(UbigeoService);

  private static readonly CODIGOS_ESTADO_CIVIL: Record<string, string> = {
    '01': 'SOLTERO',
    '02': 'CASADO',
    '03': 'VIUDO',
    '04': 'DIVORCIADO',
    '05': 'SEPARADO',
    '06': 'CONVIVIENTE',
  };

  async mapearDatos(
    datos: Partial<IReniecDatos>,
    formExistente: FormRegistroPaciente,
    tiposSexo: ICatalogoDescripcion[],
    estadosCivil: ICatalogoDescripcion[],
  ): Promise<ResultadoMapeoReniec> {
    const parcial: Partial<FormRegistroPaciente> = {};
    const seleccionUbigeoNacimiento: {
      depNacimientoSel?: string;
      provNacimientoSel?: string;
    } = {};

    this.parsearNombres(datos, formExistente, parcial);

    const fechaNacimiento = limpiarCadena(datos.fechaNacimiento);
    if (fechaNacimiento) {
      parcial.fechaNacimiento = fechaNacimiento;
    }

    const nombrePadre = limpiarCadena(datos.nombrePadre);
    if (nombrePadre) {
      parcial.nombrePadre = nombrePadre.toUpperCase();
    }

    const nombreMadre = limpiarCadena(datos.nombreMadre);
    if (nombreMadre) {
      parcial.nombreMadre = nombreMadre.toUpperCase();
    }

    parcial.idTipoSexo = this.mapearSexo(limpiarCadena(datos.sexo), tiposSexo);
    parcial.idEstadoCivil = this.mapearEstadoCivil(
      limpiarCadena(datos.estadoCivil),
      estadosCivil,
    );

    const direccionDomicilio = limpiarCadena(datos.direccion);
    if (direccionDomicilio) {
      parcial.direccionDomicilio = direccionDomicilio;
    }

    await this.asignarUbigeos(datos, parcial, seleccionUbigeoNacimiento);

    return { form: parcial, ...seleccionUbigeoNacimiento };
  }

  private parsearNombres(
    datos: Partial<IReniecDatos>,
    formExistente: FormRegistroPaciente,
    parcial: Partial<FormRegistroPaciente>,
  ): void {
    const apellidoPaterno =
      limpiarCadena(datos.apellidoPaterno) ||
      limpiarCadena(formExistente.apellidoPaterno);
    parcial.apellidoPaterno = apellidoPaterno.toUpperCase();

    const apellidoMaterno =
      limpiarCadena(datos.apellidoMaterno) ||
      limpiarCadena(formExistente.apellidoMaterno);
    parcial.apellidoMaterno = apellidoMaterno.toUpperCase();

    const primerNombre =
      limpiarCadena(datos.primerNombre) ||
      limpiarCadena(formExistente.primerNombre);
    parcial.primerNombre = primerNombre.toUpperCase();

    const segundoNombre =
      limpiarCadena(datos.segundoNombre) ||
      limpiarCadena(formExistente.segundoNombre);
    parcial.segundoNombre = segundoNombre.toUpperCase();

    if (!parcial.primerNombre && datos.nombres) {
      const partesNombres = limpiarCadena(datos.nombres)
        .toUpperCase()
        .split(/\s+/)
        .filter(Boolean);

      if (partesNombres.length > 0) {
        parcial.primerNombre = partesNombres[0];
      }
      if (partesNombres.length > 1) {
        parcial.segundoNombre = partesNombres[1];
      }
      if (partesNombres.length > 2) {
        parcial.tercerNombre = partesNombres.slice(2).join(' ');
      }
    }

    const tercerNombre = limpiarCadena(datos.tercerNombre);
    if (tercerNombre) {
      parcial.tercerNombre = tercerNombre.toUpperCase();
    }
  }

  private async asignarUbigeos(
    datos: Partial<IReniecDatos>,
    parcial: Partial<FormRegistroPaciente>,
    seleccionUbigeoNacimiento: {
      depNacimientoSel?: string;
      provNacimientoSel?: string;
    },
  ): Promise<void> {
    const domicilio = await this.autocompletarUbigeo(
      limpiarCadena(datos.departamento),
      limpiarCadena(datos.provincia),
      limpiarCadena(datos.distrito),
    );
    if (domicilio.departamento) {
      parcial.idDepartamentoDomicilio = domicilio.departamento;
    }
    if (domicilio.provincia) {
      parcial.idProvinciaDomicilio = domicilio.provincia;
    }
    if (domicilio.distrito) {
      parcial.idDistritoDomicilio = domicilio.distrito;
    }

    const nacimiento = await this.autocompletarUbigeo(
      limpiarCadena(datos.departamentoNacimiento),
      limpiarCadena(datos.provinciaNacimiento),
      limpiarCadena(datos.distritoNacimiento),
    );
    if (nacimiento.departamento) {
      seleccionUbigeoNacimiento.depNacimientoSel = nacimiento.departamento;
    }
    if (nacimiento.provincia) {
      seleccionUbigeoNacimiento.provNacimientoSel = nacimiento.provincia;
    }
    if (nacimiento.distrito) {
      parcial.idDistritoNacimiento = nacimiento.distrito;
    }
  }

  async autocompletarUbigeo(
    departamento: string,
    provincia: string,
    distrito: string,
  ): Promise<{ departamento?: string; provincia?: string; distrito?: string }> {
    const resultado: {
      departamento?: string;
      provincia?: string;
      distrito?: string;
    } = {};
    if (!departamento && !provincia && !distrito) {
      return resultado;
    }

    const departamentos = await this.ubigeoService.getDepartamentos();
    const departamentoEncontrado = this.ubigeoService.buscarEnCatalogo(
      departamentos,
      departamento,
    );
    if (!departamentoEncontrado) {
      return resultado;
    }
    resultado.departamento = String(departamentoEncontrado.id);

    const provincias = await this.ubigeoService.getProvincias(
      String(departamentoEncontrado.id),
    );
    const provinciaEncontrada = this.ubigeoService.buscarEnCatalogo(
      provincias,
      provincia,
    );
    if (!provinciaEncontrada) {
      return resultado;
    }
    resultado.provincia = String(provinciaEncontrada.id);

    const distritos = await this.ubigeoService.getDistritos(
      String(provinciaEncontrada.id),
    );
    const distritoEncontrado = this.ubigeoService.buscarEnCatalogo(
      distritos,
      distrito,
    );
    if (distritoEncontrado) {
      resultado.distrito = String(distritoEncontrado.id);
    }

    return resultado;
  }

  private mapearSexo(
    sexoOrigen: string,
    tiposSexo: ICatalogoDescripcion[],
  ): string | undefined {
    const sexoNormalizado = sexoOrigen.trim().toUpperCase();
    if (!sexoNormalizado) {
      return undefined;
    }

    const esMasculino =
      sexoNormalizado.includes('MASC') ||
      sexoNormalizado === 'M' ||
      sexoNormalizado === '1';
    const esFemenino =
      sexoNormalizado.includes('FEM') ||
      sexoNormalizado === 'F' ||
      sexoNormalizado === '2';

    if (!esMasculino && !esFemenino) {
      return undefined;
    }

    const sexoEncontrado = tiposSexo.find((catalogoSexo) => {
      const descripcion = normalizarTexto(catalogoSexo.descripcion || '');
      return esMasculino
        ? descripcion.includes('MASC') ||
            descripcion === 'M' ||
            descripcion === '1'
        : descripcion.includes('FEM') ||
            descripcion === 'F' ||
            descripcion === '2';
    });

    return sexoEncontrado ? String(sexoEncontrado.id) : undefined;
  }

  private mapearEstadoCivil(
    estadoOrigen: string,
    estadosCivil: ICatalogoDescripcion[],
  ): string | undefined {
    const estadoNormalizado = normalizarTexto(estadoOrigen);
    if (!estadoNormalizado) {
      return undefined;
    }

    if (/^\d+$/.test(estadoNormalizado)) {
      const textoEstadoCivil =
        ReniecMapper.CODIGOS_ESTADO_CIVIL[estadoNormalizado];
      if (!textoEstadoCivil) {
        return undefined;
      }
      const estadoPorCodigo = estadosCivil.find(
        (catalogoEstado) =>
          normalizarTexto(catalogoEstado.descripcion || '') ===
          textoEstadoCivil,
      );
      return estadoPorCodigo ? String(estadoPorCodigo.id) : undefined;
    }

    const estadoPorDescripcion = estadosCivil.find((catalogoEstado) => {
      const descripcion = normalizarTexto(catalogoEstado.descripcion || '');
      return (
        descripcion.length >= 3 &&
        (estadoNormalizado === descripcion ||
          estadoNormalizado.includes(descripcion) ||
          descripcion.includes(estadoNormalizado))
      );
    });

    return estadoPorDescripcion ? String(estadoPorDescripcion.id) : undefined;
  }
}
