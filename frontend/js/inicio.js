document.addEventListener("DOMContentLoaded", () => {
    // 1. CONTROL DE ACCESO (SIMULADO DESDE LOCALSTORAGE)
    const usuarioActualStr = localStorage.getItem('usuarioActual');
    
    if (!usuarioActualStr) {
        localStorage.setItem('usuarioActual', JSON.stringify({ nombre: 'Juan', apellidos: 'Pérez', rol_id: 2 }));
    } else {
        const usuario = JSON.parse(usuarioActualStr);
        if (usuario.rol_id === 4) {
            alert("Acceso denegado. Esta pantalla es solo para personal médico.");
            window.location.href = "login.html"; 
            return;
        }
    }

    // ¡SE ELIMINÓ LA SECCIÓN 2 AQUÍ PORQUE TOPBAR.JS YA LO HACE!

    // 3. LÓGICA DEL DASHBOARD
    const inputFecha = document.getElementById('fechaDashboard');
    const txtCitasHoy = document.getElementById('txtCitasHoy');
    const txtSillonesDisp = document.getElementById('txtSillonesDisp');
    const listaAgenda = document.getElementById('listaAgenda');

    // Inicializar con la fecha de hoy
    const hoy = new Date().toISOString().split('T')[0];
    inputFecha.value = hoy;

    // Escuchar cambios en la fecha
    inputFecha.addEventListener('change', (e) => cargarDashboard(e.target.value));

    // Cargar datos por primera vez
    cargarDashboard(hoy);

    async function cargarDashboard(fechaSeleccionada) {
        try {
            const respuesta = await fetch(`http://localhost:3000/api/dashboard?fecha=${fechaSeleccionada}`);
            const data = await respuesta.json();

            // Actualizar Tarjetas
            txtCitasHoy.textContent = data.metricas.citasHoy;
            txtSillonesDisp.textContent = data.metricas.sillonesDisponibles;

            // Actualizar Agenda
            listaAgenda.innerHTML = '';

            if (data.agenda.length === 0) {
                listaAgenda.innerHTML = '<p style="padding: 20px; color: #64748b; text-align: center;">No hay citas programadas para este día.</p>';
                return;
            }

            data.agenda.forEach(cita => {
                const horaInicio = cita.hora_inicio.substring(0, 5);
                const horaFin = cita.hora_fin.substring(0, 5);

                const itemHTML = `
                    <div class="agenda-item">
                        <div class="agenda-hora">
                            <strong>${horaInicio}</strong>
                            <span>a ${horaFin}</span>
                        </div>
                        <div class="agenda-detalles">
                            <div class="paciente-info">
                                <img src="https://ui-avatars.com/api/?name=${cita.paciente_nombres}+${cita.paciente_apellidos}&background=f1f5f9&color=334155" alt="Paciente">
                                <div>
                                    <p class="nombre-paciente">Paciente: <strong>${cita.paciente_nombres} ${cita.paciente_apellidos}</strong></p>
                                    <p class="detalle-extra">Dr. Asignado: ${cita.doc_nombres}</p>
                                    <p class="detalle-extra">Sillón: ${cita.numero_equipo}</p>
                                </div>
                            </div>
                        </div>
                        <div class="agenda-estado">
                            <span class="badge-estado verde">Confirmada</span>
                        </div>
                    </div>
                `;
                listaAgenda.insertAdjacentHTML('beforeend', itemHTML);
            });

        } catch (error) {
            console.error("Error cargando el dashboard:", error);
        }
    }
});