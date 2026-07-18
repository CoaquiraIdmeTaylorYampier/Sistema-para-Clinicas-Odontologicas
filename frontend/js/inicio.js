document.addEventListener("DOMContentLoaded", () => {
    // 1. CONTROL DE ACCESO (SIMULADO DESDE LOCALSTORAGE)
    // Asumimos que al hacer login guardaste los datos en localStorage como 'usuarioActual'
    // Ejemplo: localStorage.setItem('usuarioActual', JSON.stringify({ nombre: 'Carlos', rol_id: 2 }));
    
    const usuarioActualStr = localStorage.getItem('usuarioActual');
    
    // Si no hay sesión o si es un Paciente (Rol 4), bloquear acceso
    if (!usuarioActualStr) {
        // Para pruebas, si no hay sesión simulamos un odontólogo. 
        // EN PRODUCCIÓN: redirigir a login.html
        localStorage.setItem('usuarioActual', JSON.stringify({ nombre: 'Juan', apellidos: 'Pérez', rol_id: 2 }));
    } else {
        const usuario = JSON.parse(usuarioActualStr);
        if (usuario.rol_id === 4) {
            alert("Acceso denegado. Esta pantalla es solo para personal médico.");
            window.location.href = "login.html"; // Redirigir a login o a la pantalla del paciente
            return;
        }
    }

    // 2. CONFIGURAR INTERFAZ DE USUARIO ARRIBA A LA DERECHA
    const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActual'));
    const etiquetaRol = usuarioActivo.rol_id === 2 ? 'Odontólogo' : 'Asistente';
    document.getElementById('nombreRolUsuario').textContent = `${usuarioActivo.nombre} (${etiquetaRol})`;
    document.getElementById('userAvatar').src = `https://ui-avatars.com/api/?name=${usuarioActivo.nombre}+${usuarioActivo.apellidos}&background=0284c7&color=fff`;

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
                // Formatear horas (de "09:00:00" a "09:00")
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