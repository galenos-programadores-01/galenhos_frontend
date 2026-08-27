export interface IPatient {
  documentNumber: string;
  paternalSurname: string;
  maternalSurname: string;
  firstName: string;
  secondName: string;
  thirdName: string;
}

export interface IPageResponse<TipoEntidad> {
  items: TipoEntidad[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ITimeSlot {
  startsAt: string;
  endsAt: string;
}

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface IAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  slot: ITimeSlot;
  status: AppointmentStatus;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export interface ILoginResponse {
  accessToken: string;
  tokenType: string;
}

export interface IApiErrorPayload {
  code: string;
  message: string;
}

export interface IMenu {
  idListGrupo: number;
  texto: string;
  keyIconWeb: string;
  claveWeb: string;
  indice: number;
  estado: boolean;
  nroSubMenu: number;
}

export interface IMenuPermiso {
  opciones: string;
  indice: number;
  texto: string;
  menu: string;
  idListGrupo: number;
  keyIconWeb: string;
  estado: boolean;
  claveWeb: string;
  agregar: boolean;
  modificar: boolean;
  eliminar: boolean;
}

export interface IAuthMenus {
  menus: IMenu[];
  permisos: IMenuPermiso[];
}

export interface IUserProfile {
  idEmpleado: number;
  username: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
  foto: string;
  rol?: string;
}
