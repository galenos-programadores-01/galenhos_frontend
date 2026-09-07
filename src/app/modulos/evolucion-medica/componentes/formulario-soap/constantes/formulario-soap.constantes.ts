import type { SintomaCatalogo } from '../../../servicios/sintoma.service';

export interface GrupoSintomasVista {
  clave: string;
  etiqueta: string;
  sintomas: SintomaCatalogo[];
}

export interface RegistroAuditoria {
  fecha: string;
  hora: string;
  usuario: string;
  ip: string;
}

export interface ItemResumenVerificacion {
  panelId: string;
  numero: string;
  titulo: string;
  completado: boolean;
  detalle: string;
}

export interface PasoNavegacion {
  id: string;
  num: string;
  label: string;
}

export const PASOS_NAVEGACION: PasoNavegacion[] = [
  { id: 'p1', num: '1', label: 'Inf. General' },
  { id: 'p2', num: '2', label: 'Apreciación' },
  { id: 'p3', num: '3', label: 'Subjetivo' },
  { id: 'p4', num: '4', label: 'Objetivo' },
  { id: 'p5', num: '5', label: 'Resultados' },
  { id: 'p6', num: '6', label: 'Evaluación' },
  { id: 'p7', num: '7', label: 'Plan' },
  { id: 'p9', num: '8', label: 'Alta' },
  { id: 'p14', num: '9', label: 'Adjuntos' },
  { id: 'p15', num: '✓', label: 'Firma' },
];

export const ETIQUETAS_SISTEMA: Record<string, string> = {
  general: 'General',
  'respiratorio-cv': 'Respiratorio / Cardiovascular',
  gastrointestinal: 'Gastrointestinal',
  neurologico: 'Neurológico',
  otros: 'Otros',
};

export const GRUPO_DE_PANEL: Record<string, string> = {
  p1: 'encuentro',
  p2: 'encuentro',
  p3: 'soap',
  p4: 'soap',
  p5: 'soap',
  p6: 'soap',
  p7: 'soap',
  p9: 'doc',
  p14: 'doc',
  p15: 'cierre',
};

export const ORDEN_PANELES = [
  'p1',
  'p2',
  'p3',
  'p4',
  'p5',
  'p6',
  'p7',
  'p9',
  'p14',
  'p15',
];
