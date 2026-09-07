import type { FormBuilder, FormGroup } from '@angular/forms';
import { Validators } from '@angular/forms';
import { ValidadoresGalenos } from '../../../../../compartido/utilidades/validadores';

export function crearFormularioSoap(
  constructorFormulario: FormBuilder,
): FormGroup {
  return constructorFormulario.group({
    motivo: constructorFormulario.group({
      tipo: ['Consulta', [Validators.required]],
      descripcion: [
        '',
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(1000),
        ],
      ],
    }),
    subjetivo: constructorFormulario.group({
      dolor: [false],
      fiebre: [false],
      tos: [false],
      nauseas: [false],
      vomitos: [false],
      mareos: [false],
      disnea: [false],
      evolucionSintomas: ['', [Validators.maxLength(2000)]],
      escalaDolor: [null as number | null, [ValidadoresGalenos.escalaDolor()]],
    }),
    signosVitales: constructorFormulario.group({
      presionArterial: [
        '',
        [Validators.required, ValidadoresGalenos.presionArterial()],
      ],
      frecuenciaCardiaca: [
        null as number | null,
        [Validators.required, ValidadoresGalenos.frecuenciaCardiaca()],
      ],
      frecuenciaRespiratoria: [
        null as number | null,
        [Validators.required, ValidadoresGalenos.frecuenciaRespiratoria()],
      ],
      temperatura: [
        null as number | null,
        [Validators.required, ValidadoresGalenos.temperatura()],
      ],
      saturacionOxigeno: [
        null as number | null,
        [Validators.required, ValidadoresGalenos.saturacionOxigeno()],
      ],
      peso: [null as number | null, [ValidadoresGalenos.peso()]],
      talla: [null as number | null, [ValidadoresGalenos.talla()]],
      imc: [''],
      glucemia: [null as number | null, [ValidadoresGalenos.glucemia()]],
    }),
    examenFisico: constructorFormulario.array([
      constructorFormulario.group({
        sistema: ['Estado general'],
        normal: [true],
        hallazgo: [''],
      }),
      constructorFormulario.group({
        sistema: ['Piel'],
        normal: [true],
        hallazgo: [''],
      }),
      constructorFormulario.group({
        sistema: ['Cabeza y cuello'],
        normal: [true],
        hallazgo: [''],
      }),
      constructorFormulario.group({
        sistema: ['Tórax y pulmones'],
        normal: [true],
        hallazgo: [''],
      }),
      constructorFormulario.group({
        sistema: ['Corazón'],
        normal: [true],
        hallazgo: [''],
      }),
      constructorFormulario.group({
        sistema: ['Abdomen'],
        normal: [true],
        hallazgo: [''],
      }),
      constructorFormulario.group({
        sistema: ['Genitourinario'],
        normal: [true],
        hallazgo: [''],
      }),
      constructorFormulario.group({
        sistema: ['Extremidades y osteomuscular'],
        normal: [true],
        hallazgo: [''],
      }),
      constructorFormulario.group({
        sistema: ['Neurológico y estado mental'],
        normal: [true],
        hallazgo: [''],
      }),
    ]),
    resultados: constructorFormulario.group({
      laboratorio: constructorFormulario.array([]),
      imagenes: constructorFormulario.array([]),
      otros: constructorFormulario.array([]),
    }),
    evaluacion: constructorFormulario.group({
      estadoClinico: ['', [Validators.required]],
      pronostico: ['', [Validators.required]],
    }),
    diagnosticos: constructorFormulario.array([]),
    plan: constructorFormulario.group({
      farmacologico: constructorFormulario.array([]),
      solicitudExamenes: constructorFormulario.array([]),
      interconsultas: constructorFormulario.group({
        cardiologia: [false],
        cirugia: [false],
        nutricion: [false],
        psicologia: [false],
        otra: ['', [Validators.maxLength(200)]],
      }),
      indicacionesGenerales: constructorFormulario.group({
        dieta: ['', [Validators.maxLength(200)]],
        reposo: ['', [Validators.maxLength(200)]],
        hidratacion: ['', [Validators.maxLength(200)]],
        oxigeno: ['', [Validators.maxLength(200)]],
        restricciones: ['', [Validators.maxLength(500)]],
      }),
    }),
    evolucionLibre: [
      '',
      [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(4000),
      ],
    ],
    ordenesMedicas: constructorFormulario.group({
      orden: [''],
      detalle: ['', [Validators.maxLength(1000)]],
    }),
    prescripcion: constructorFormulario.array([]),
    procedimientosRealizados: constructorFormulario.array([]),
    incapacidad: constructorFormulario.group({
      dias: [null as number | null],
      fechaInicio: [''],
      fechaFin: [''],
      motivo: ['', [Validators.maxLength(500)]],
    }),
    certificados: constructorFormulario.group({
      certificadoMedico: [false],
      informeMedico: [false],
      epicrisis: [false],
      constancias: [false],
      observaciones: ['', [Validators.maxLength(500)]],
    }),
    adjuntos: constructorFormulario.array([]),
  });
}
