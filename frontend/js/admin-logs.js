document.addEventListener("DOMContentLoaded", async () => {
    try {
        const respuesta = await fetch('http://localhost:3000/api/logs');
        const logs = await respuesta.json();

        const cuerpoTabla = document.getElementById('cuerpoTablaLogs');
        cuerpoTabla.innerHTML = '';

        logs.forEach(log => {
            // Dar formato a la fecha para que sea legible
            const fecha = new Date(log.fecha_hora).toLocaleString('es-PE', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });

            // Asignar colores a las etiquetas según la acción
            let badgeClass = 'badge-default';
            if (log.tipo_evento === 'LOGIN') badgeClass = 'badge-login';
            if (log.tipo_evento === 'REGISTRO' || log.tipo_evento === 'CREACION') badgeClass = 'badge-registro';
            if (log.tipo_evento === 'RESERVA') badgeClass = 'badge-reserva';
            if (log.tipo_evento === 'BLOQUEO') badgeClass = 'badge-bloqueo';

            // Limpiar la IP si viene con formato IPv6 de localhost (::1 o ::ffff:)
            let ipLimpia = log.ip_origen || 'Desconocida';
            if (ipLimpia === '::1' || ipLimpia === '::ffff:127.0.0.1') ipLimpia = 'Localhost';

            // Crear la fila HTML
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

        // Inicializar DataTables para darle los súper poderes
        $('#tablaLogs').DataTable({
            language: {
                url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json' // Traduce la tabla al español
            },
            order: [[0, 'desc']], // Ordenar por ID de mayor a menor (más recientes arriba)
            pageLength: 10 // Mostrar 10 registros por página
        });

    } catch (error) {
        console.error("Error al cargar los logs:", error);
    }
});