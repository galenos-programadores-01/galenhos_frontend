import { __decorate } from "tslib";
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiRequestError } from '../../../../../../compartido/api-client/api-client.service';
import { MaestrosApiService } from '../../../../../../compartido/api/maestros.api.service';
import { ColumnaTemplateDirective } from '../../../../../../compartido/componentes/tabla/columna-template.directive';
import { TablaComponent } from '../../../../../../compartido/componentes/tabla/tabla.component';
import { VentanaModal } from '../../../../../../compartido/ui/ventana-modal/ventana-modal';
import { ListaEsperaQxApiService, } from '../../../salida/http/lista-espera-qx.api.service';
function campo(item, claves) {
    if (!item)
        return '';
    for (const k of claves) {
        const v = item[k];
        if (v !== undefined && v !== null && v !== '') {
            if (typeof v === 'string')
                return v;
            if (typeof v === 'number' || typeof v === 'boolean')
                return String(v);
            return JSON.stringify(v);
        }
    }
    return '';
}
function formVacio() {
    return {
        idTipoDocumento: null,
        nroDocumento: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        primerNombre: '',
        segundoNombre: '',
        fechaNacimiento: '',
        idSexo: null,
        telefono: '',
        direccion: '',
        fechaOrden: ((d) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`)(new Date()),
        diagnostico: '',
        IdEspecialidad: '',
        fechaLaboratorio: '',
        fechaICCardio: '',
        fechaICNeumo: '',
        fechaICAnestesio: '',
        medico: '',
        observacion: '',
    };
}
let ListaEsperaQxComponent = class ListaEsperaQxComponent {
    apiService = inject(ListaEsperaQxApiService);
    maestrosApi = inject(MaestrosApiService);
    cdr = inject(ChangeDetectorRef);
    fechaInicio = ((d) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`)(new Date());
    fechaFin = ((d) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`)(new Date());
    paciente = '';
    lista = [];
    cargando = false;
    error = '';
    buscado = false;
    mensajeExito = '';
    tiposDocumento = [];
    tiposSexo = [];
    modalAbierto = false;
    form = formVacio();
    guardando = false;
    errorGuardado = '';
    columnasTabla = [
        { campo: 'nroHistoriaCustom', cabecera: 'Nro Historia' },
        { campo: 'nroDocumentoCustom', cabecera: 'Nro Documento' },
        { campo: 'pacienteCustom', cabecera: 'Paciente' },
        { campo: 'fechaNacimientoCustom', cabecera: 'Fecha Nacimiento' },
        { campo: 'fechaOrdenCustom', cabecera: 'Fecha Orden' },
        { campo: 'observacionCustom', cabecera: 'Observacion' },
    ];
    ngOnInit() {
        this.cargarCatalogos();
        this.cargarLista();
    }
    async cargarCatalogos() {
        try {
            const [docs, sexos] = await Promise.all([
                this.maestrosApi.getTiposDocumentos(),
                this.maestrosApi.getTiposSexo(),
            ]);
            this.tiposDocumento = Array.isArray(docs) ? docs : [];
            this.tiposSexo = Array.isArray(sexos) ? sexos : [];
        }
        catch { }
    }
    async cargarLista() {
        this.cargando = true;
        this.error = '';
        this.buscado = true;
        try {
            const params = { fecha: this.fechaInicio };
            if (this.paciente.trim())
                params.paciente = this.paciente.trim();
            const items = await this.apiService.listar(params);
            this.lista = Array.isArray(items) ? items : [];
        }
        catch (error) {
            this.error =
                error instanceof ApiRequestError
                    ? error.message
                    : 'No se pudo cargar la lista de espera quirurgica.';
        }
        finally {
            this.cargando = false;
            this.cdr.detectChanges();
        }
    }
    campo(item, claves) {
        return campo(item, claves);
    }
    abrirModal() {
        this.form = formVacio();
        this.errorGuardado = '';
        this.modalAbierto = true;
    }
    cerrarModal() {
        this.modalAbierto = false;
        this.errorGuardado = '';
    }
    async guardar() {
        if (!this.form.idTipoDocumento || !this.form.nroDocumento.trim() || !this.form.apellidoPaterno.trim() || !this.form.primerNombre.trim() || !this.form.fechaNacimiento || !this.form.idSexo || !this.form.fechaOrden) {
            this.errorGuardado = 'Los campos con * son obligatorios.';
            return;
        }
        this.guardando = true;
        this.errorGuardado = '';
        try {
            await this.apiService.crear({
                idTipoDocumento: this.form.idTipoDocumento,
                nroDocumento: this.form.nroDocumento.trim(),
                apellidoPaterno: this.form.apellidoPaterno.trim(),
                apellidoMaterno: this.form.apellidoMaterno.trim(),
                primerNombre: this.form.primerNombre.trim(),
                segundoNombre: this.form.segundoNombre.trim(),
                fechaNacimiento: this.form.fechaNacimiento,
                idSexo: this.form.idSexo,
                telefono: this.form.telefono.trim(),
                direccion: this.form.direccion.trim(),
                fechaOrden: this.form.fechaOrden,
                diagnostico: this.form.diagnostico.trim(),
                diagnostico: this.form.IdEspecialidad.trim(),
                fechaLaboratorio: this.form.fechaLaboratorio,
                fechaICCardio: this.form.fechaICCardio,
                fechaICNeumo: this.form.fechaICNeumo,
                fechaICAnestesio: this.form.fechaICAnestesio,
                medico: this.form.medico.trim(),
                observacion: this.form.observacion.trim(),
            });
            this.modalAbierto = false;
            this.mensajeExito = 'Paciente registrado en lista de espera quirurgica correctamente.';
            setTimeout(() => (this.mensajeExito = ''), 5000);
            this.cargarLista();
        }
        catch (error) {
            this.errorGuardado =
                error instanceof ApiRequestError
                    ? error.message
                    : 'No se pudo guardar el registro.';
        }
        finally {
            this.guardando = false;
            this.cdr.detectChanges();
        }
    }
};
ListaEsperaQxComponent = __decorate([
    Component({
        selector: 'app-lista-espera-qx',
        standalone: true,
        imports: [FormsModule, CommonModule, TablaComponent, ColumnaTemplateDirective, VentanaModal],
        templateUrl: './lista-espera-qx.component.html',
    })
], ListaEsperaQxComponent);
export { ListaEsperaQxComponent };
