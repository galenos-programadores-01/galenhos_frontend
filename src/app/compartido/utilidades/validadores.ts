import type {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

export const ValidadoresGalenos = {
  dni(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;
      if (!valor) return null;

      const esValido = /^\d{8}$/.test(String(valor).trim());
      return esValido ? null : { dniInvalido: true };
    };
  },

  presionArterial(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;
      if (!valor || typeof valor !== 'string' || valor.trim() === '')
        return null;

      const texto = valor.trim();
      const partes = texto.split('/');
      if (partes.length !== 2) {
        return {
          mensajePersonalizado:
            'Formato inválido. Use Sistólica/Diastólica (ej. 120/80)',
        };
      }

      const sistolica = Number(partes[0].trim());
      const diastolica = Number(partes[1].trim());

      if (
        Number.isNaN(sistolica) ||
        Number.isNaN(diastolica) ||
        !Number.isInteger(sistolica) ||
        !Number.isInteger(diastolica)
      ) {
        return {
          mensajePersonalizado:
            'Los valores de presión arterial deben ser números enteros',
        };
      }

      if (sistolica < 50 || sistolica > 260) {
        return {
          mensajePersonalizado:
            'Presión sistólica fuera de rango clínico (50 - 260 mmHg)',
        };
      }

      if (diastolica < 30 || diastolica > 150) {
        return {
          mensajePersonalizado:
            'Presión diastólica fuera de rango clínico (30 - 150 mmHg)',
        };
      }

      if (sistolica <= diastolica) {
        return {
          mensajePersonalizado:
            'La presión sistólica debe ser mayor que la diastólica',
        };
      }

      return null;
    };
  },

  frecuenciaCardiaca(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;
      if (valor === null || valor === undefined || valor === '') return null;

      const numero = Number(valor);
      if (Number.isNaN(numero) || !Number.isInteger(numero)) {
        return {
          mensajePersonalizado:
            'La frecuencia cardíaca debe ser un número entero',
        };
      }
      if (numero < 30 || numero > 250) {
        return {
          mensajePersonalizado:
            'Frecuencia cardíaca fuera de rango (30 - 250 lpm)',
        };
      }
      return null;
    };
  },

  frecuenciaRespiratoria(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;
      if (valor === null || valor === undefined || valor === '') return null;

      const numero = Number(valor);
      if (Number.isNaN(numero) || !Number.isInteger(numero)) {
        return {
          mensajePersonalizado:
            'La frecuencia respiratoria debe ser un número entero',
        };
      }
      if (numero < 8 || numero > 60) {
        return {
          mensajePersonalizado:
            'Frecuencia respiratoria fuera de rango (8 - 60 rpm)',
        };
      }
      return null;
    };
  },

  temperatura(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;
      if (valor === null || valor === undefined || valor === '') return null;

      const numero = Number(valor);
      if (Number.isNaN(numero)) {
        return {
          mensajePersonalizado: 'La temperatura debe ser un número válido',
        };
      }
      if (numero < 30.0 || numero > 45.0) {
        return {
          mensajePersonalizado:
            'Temperatura fuera de rango clínico (30.0 - 45.0 °C)',
        };
      }
      return null;
    };
  },

  saturacionOxigeno(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;
      if (valor === null || valor === undefined || valor === '') return null;

      const numero = Number(valor);
      if (Number.isNaN(numero) || !Number.isInteger(numero)) {
        return {
          mensajePersonalizado: 'La saturación debe ser un número entero',
        };
      }
      if (numero < 50 || numero > 100) {
        return {
          mensajePersonalizado:
            'Saturación de oxígeno debe estar entre 50 y 100 %',
        };
      }
      return null;
    };
  },

  peso(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;
      if (valor === null || valor === undefined || valor === '') return null;

      const numero = Number(valor);
      if (Number.isNaN(numero) || numero <= 0) {
        return {
          mensajePersonalizado: 'El peso debe ser mayor a 0 kg',
        };
      }
      if (numero < 0.5 || numero > 350.0) {
        return {
          mensajePersonalizado: 'Peso fuera de rango clínico (0.5 - 350.0 kg)',
        };
      }
      return null;
    };
  },

  talla(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;
      if (valor === null || valor === undefined || valor === '') return null;

      const numero = Number(valor);
      if (Number.isNaN(numero) || numero <= 0) {
        return {
          mensajePersonalizado: 'La talla debe ser mayor a 0 m',
        };
      }
      if (numero < 0.3 || numero > 2.5) {
        return {
          mensajePersonalizado:
            'Talla en metros fuera de rango (0.30 - 2.50 m)',
        };
      }
      return null;
    };
  },

  glucemia(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;
      if (valor === null || valor === undefined || valor === '') return null;

      const numero = Number(valor);
      if (Number.isNaN(numero) || !Number.isInteger(numero)) {
        return {
          mensajePersonalizado: 'La glucemia debe ser un número entero',
        };
      }
      if (numero < 20 || numero > 1000) {
        return {
          mensajePersonalizado: 'Glucemia fuera de rango (20 - 1000 mg/dL)',
        };
      }
      return null;
    };
  },

  escalaDolor(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;
      if (valor === null || valor === undefined || valor === '') return null;

      const numero = Number(valor);
      if (Number.isNaN(numero) || !Number.isInteger(numero)) {
        return {
          mensajePersonalizado:
            'La escala de dolor EVA debe ser un número entero',
        };
      }
      if (numero < 0 || numero > 10) {
        return {
          mensajePersonalizado: 'La escala de dolor EVA debe ser entre 0 y 10',
        };
      }
      return null;
    };
  },

  cie10(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;
      if (!valor || typeof valor !== 'string' || valor.trim() === '')
        return null;

      const regexCie10 = /^[A-Z]\d{2}(\.[\dA-Z]{1,3})?$/i;
      const esValido = regexCie10.test(valor.trim());
      return esValido
        ? null
        : {
            mensajePersonalizado:
              'Código CIE-10 no válido (ej. K35, K35.8, A09.0)',
          };
    };
  },

  numeroEnteroPositivo(min = 1, max = 9999): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;
      if (valor === null || valor === undefined || valor === '') return null;

      const numero = Number(valor);
      if (Number.isNaN(numero) || !Number.isInteger(numero)) {
        return {
          mensajePersonalizado: 'Debe ser un número entero',
        };
      }
      if (numero < min || numero > max) {
        return {
          mensajePersonalizado: `El valor debe estar entre ${min} y ${max}`,
        };
      }
      return null;
    };
  },

  signosVitales(
    tipo: 'presion' | 'temperatura' | 'frecuencia' | 'saturacion',
  ): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      switch (tipo) {
        case 'presion':
          return ValidadoresGalenos.presionArterial()(control);
        case 'temperatura':
          return ValidadoresGalenos.temperatura()(control);
        case 'frecuencia':
          return ValidadoresGalenos.frecuenciaCardiaca()(control);
        case 'saturacion':
          return ValidadoresGalenos.saturacionOxigeno()(control);
        default:
          return null;
      }
    };
  },
};
