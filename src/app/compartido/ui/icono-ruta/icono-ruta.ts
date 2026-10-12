import { Component, Input } from '@angular/core';

@Component({
  selector: 'icono-ruta',
  standalone: true,
  templateUrl: './icono-ruta.html',
})
export class IconoRuta {
  @Input() ruta: string = '';
  @Input() idGrupo: number = 0;

  categoriaDeGrupo(id: number): string {
    switch (id) {
      case 100:
        return 'usuario';
      case 200:
        return 'cruz';
      case 300:
        return 'cama';
      case 400:
        return 'calendario';
      case 700:
        return 'dolar';
      case 800:
        return 'pastilla';
      case 1200:
        return 'clipboard';
      case 1300:
        return 'escudo';
      case 1500:
        return 'recibo';
      case 1700:
        return 'engranaje';
      case 1800:
        return 'microscopio';
      case 1900:
        return 'imagen';
      case 2000:
        return 'escudo';
      case 2003:
        return 'escalpelo';
      case 2100:
        return 'video';
      case 2101:
        return 'pulso';
      case 2103:
        return 'tablero';
      case 2104:
        return 'engranaje';
      case 2105:
        return 'casa';
      default:
        return 'generico';
    }
  }

  categoriaDeRuta(ruta: string): string {
    const r = ruta.toLowerCase().replace(/\//g, '_');
    if (
      [
        'pacientes',
        'paciente',
        'empleados',
        'impfuasproc',
        'judicial',
        'descansomedico',
        'listar_referencias',
        'usuarios',
      ].includes(r)
    )
      return 'usuario';
    if (
      [
        'citas',
        'citasbiopsia',
        'programacion',
        'cajas',
        'servicios',
        'catalogos_servicios',
        'catalogo-servicios',
        'facturacioncatalogoservicios',
        'progra_image',
      ].includes(r)
    )
      return 'calendario';
    if (
      [
        'triajes',
        'atenciones',
        'atencionesbi',
        'atencionesprebi',
        'atenciontel',
        'atencion-ce',
        'atencion_ce',
        'consulta-externa',
        'consulta_externa',
        'bandejalab',
        'laboratorio_patologia_clinica',
        'aprobancionrecetas',
        'fichaoperatoria',
        'solicitudqx',
        'templates',
      ].includes(r)
    )
      return 'clipboard';
    if (['estadocuenta', 'consumoservicio'].includes(r)) return 'recibo';
    if (['camasobservacion'].includes(r)) return 'cama';
    if (['emer_interconsulta', 'hosp_interconsulta'].includes(r))
      return 'mensaje';
    if (
      [
        'hospitalizacion',
        'emergencia_triaje',
        'ficha_cancer',
        'ficha_diabetes',
      ].includes(r)
    )
      return 'pulso';
    if (
      [
        'farmacia_ventas',
        'inventario',
        'notas_de_ingreso_al',
        'notas_de_salida_al',
        'catalogos_bienes-insumos',
        'bienes-insumos',
        'bienes_insumos',
        'catalogobienes',
        'farmacia_disponibilidad',
        'farmacia',
        'dashfarm',
        'disponibilidad-medicamentos',
      ].includes(r)
    )
      return 'pastilla';
    if (['paquetes'].includes(r)) return 'paquete';
    if (['anatomiapatologica'].includes(r)) return 'microscopio';
    if (
      [
        'imgecografiac',
        'imgecografiao',
        'imagrayosx',
        'bandejaimagen',
        'imagtomografia',
        'mamografiao',
      ].includes(r)
    )
      return 'imagen';
    if (['imagtomoplaca'].includes(r)) return 'camara';
    if (['fuas', 'bandejafuas', 'fuaobs'].includes(r)) return 'escudo';
    if (['impresoras'].includes(r)) return 'impresora';
    if (['parametros'].includes(r)) return 'sliders';
    if (['notificaciones'].includes(r)) return 'campana';
    if (['roles', 'permisos'].includes(r)) return 'llave';
    if (['log'].includes(r)) return 'base';
    if (['adoge'].includes(r)) return 'casa';
    if (['bandejaref'].includes(r)) return 'rama';
    if (['dashboard', 'dashboardmed'].includes(r)) return 'tablero';
    if (['colas'].includes(r)) return 'reloj';
    if (['administrar'].includes(r)) return 'engranaje';
    return 'generico';
  }
}
