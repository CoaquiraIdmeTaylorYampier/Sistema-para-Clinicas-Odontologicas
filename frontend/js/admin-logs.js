document.addEventListener("DOMContentLoaded", async () => {
    const filtroFecha = document.getElementById('filtroFechaLogs');
    const cuerpoTabla = document.getElementById('cuerpoTablaLogs');
    let logsOriginales = [];

    try {
        const respuesta = await fetch('http://localhost:3000/api/logs');
        logsOriginales = await respuesta.json();
        aplicarFiltroYOrden();
    } catch (error) {
        console.error("Error al cargar los logs:", error);
    }

    if (filtroFecha) {
        filtroFecha.addEventListener('change', aplicarFiltroYOrden);
    }

    function aplicarFiltroYOrden() {
        const fechaSeleccionada = filtroFecha ? filtroFecha.value : '';

        const logsFiltrados = logsOriginales.filter(log => {
            if (!fechaSeleccionada) return true;

            const fechaLog = new Date(log.fecha_hora);
            const fechaSolo = fechaLog.toISOString().split('T')[0];
            return fechaSolo === fechaSeleccionada;
        });

        const logsOrdenados = logsFiltrados.sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));
        renderizarLogs(logsOrdenados);
    }

    function renderizarLogs(logs) {
        cuerpoTabla.innerHTML = '';

        if (logs.length === 0) {
            cuerpoTabla.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No hay registros para la fecha seleccionada.</td></tr>';
            return;
        }

        logs.forEach(log => {
            const fecha = new Date(log.fecha_hora).toLocaleString('es-PE', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });

            let badgeClass = 'badge-default';
            if (log.tipo_evento === 'LOGIN') badgeClass = 'badge-login';
            if (log.tipo_evento === 'REGISTRO' || log.tipo_evento === 'CREACION') badgeClass = 'badge-registro';
            if (log.tipo_evento === 'RESERVA') badgeClass = 'badge-reserva';
            if (log.tipo_evento === 'BLOQUEO') badgeClass = 'badge-bloqueo';

            let ipLimpia = log.ip_origen || 'Desconocida';
            if (ipLimpia === '::1' || ipLimpia === '::ffff:127.0.0.1') ipLimpia = 'Localhost';

            const fila = `
                <tr>
                    <td>#${log.id_log}</td>
                    <td>${fecha}</td>
                    <td><span class="badge ${badgeClass}">${log.tipo_evento}</span></td>
                    <td><strong>${log.entidad_afectada}</strong></td>
                    <td>${log.descripcion}</td>
                    <td>${ipLimpia}</td>
                </tr>
            `;
            cuerpoTabla.innerHTML += fila;
        });

        if ($.fn.DataTable.isDataTable('#tablaLogs')) {
            $('#tablaLogs').DataTable().destroy();
        }

        $('#tablaLogs').DataTable({
            language: {
                url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
            },
            order: [[1, 'desc']],
            pageLength: 10
        });
    }
});