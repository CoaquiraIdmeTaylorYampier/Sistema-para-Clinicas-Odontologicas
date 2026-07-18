document.addEventListener("DOMContentLoaded", () => {
    const selectorMes = document.getElementById('selectorMes');
    const calendarioGrid = document.getElementById('calendarioGrid');
    const inputFechaSeleccionada = document.getElementById('fechaSeleccionada');
    const formAgendar = document.getElementById('formAgendarCita');

    // Inicializar con el mes actual
    const fechaActual = new Date();
    const mesActual = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;
    selectorMes.value = mesActual;
    generarCalendario(fechaActual.getFullYear(), fechaActual.getMonth());
    // Función para cargar sillones desde la BD
    async function cargarSillonesDisponibles() {
        try {
            const respuesta = await fetch('http://localhost:3000/api/sillones/disponibles');
            const sillones = await respuesta.json();
            
            const selectSillon = document.getElementById('sillonId');
            
            // Llenar el select dinámicamente
            sillones.forEach(sillon => {
                const option = document.createElement('option');
                option.value = sillon.id_Consultorio_sillon;
                option.textContent = `${sillon.nombre_sala} - Equipo ${sillon.numero_equipo}`;
                selectSillon.appendChild(option);
            });
        } catch (error) {
            console.error("Error cargando sillones:", error);
        }
    }

    // Ejecutar la función apenas cargue la página
    cargarSillonesDisponibles();
    // Función para cargar Odontólogos desde la BD
    async function cargarOdontologos() {
        try {
            const respuesta = await fetch('http://localhost:3000/api/odontologos');
            const odontologos = await respuesta.json();
            
            const selectOdontologo = document.getElementById('odontologoId');
            
            odontologos.forEach(od => {
                const option = document.createElement('option');
                option.value = od.id_Odontologo;
                // Formato: Dr. Juan Perez - Ortodoncia
                option.textContent = `Dr/a. ${od.nombres} ${od.apellidos} - ${od.especialidad}`;
                selectOdontologo.appendChild(option);
            });
        } catch (error) {
            console.error("Error cargando odontólogos:", error);
        }
    }

    // No olvides llamar a la función al inicio del script
    cargarOdontologos();

    // Escuchar cambios en el selector de mes
    selectorMes.addEventListener('change', (e) => {
        const [año, mes] = e.target.value.split('-');
        generarCalendario(parseInt(año), parseInt(mes) - 1);
    });

    function generarCalendario(año, mes) {
        calendarioGrid.innerHTML = '';
        
        // Obtener el primer día del mes y cuántos días tiene
        const primerDia = new Date(año, mes, 1).getDay();
        const diasEnMes = new Date(año, mes + 1, 0).getDate();
        
        // Ajustar para que la semana empiece en Lunes (0 = Lunes, 6 = Domingo)
        let espaciosVacios = primerDia === 0 ? 6 : primerDia - 1;

        // Rellenar espacios vacíos al inicio
        for (let i = 0; i < espaciosVacios; i++) {
            const divVacio = document.createElement('div');
            divVacio.classList.add('dia', 'vacio');
            calendarioGrid.appendChild(divVacio);
        }

        // Crear los días del mes
        for (let dia = 1; dia <= diasEnMes; dia++) {
            const divDia = document.createElement('div');
            divDia.classList.add('dia');
            divDia.textContent = dia;

            divDia.addEventListener('click', () => {
                // Quitar selección previa
                document.querySelectorAll('.dia.seleccionado').forEach(el => el.classList.remove('seleccionado'));
                divDia.classList.add('seleccionado');
                
                // Guardar la fecha en formato YYYY-MM-DD
                const fechaFormat = `${año}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                inputFechaSeleccionada.value = fechaFormat;
            });

            calendarioGrid.appendChild(divDia);
        }
    }

    // Enviar datos al servidor
    formAgendar.addEventListener('submit', async (e) => {
        e.preventDefault();

        if(!inputFechaSeleccionada.value) {
            Swal.fire('Error', 'Debe seleccionar un día en el calendario', 'warning');
            return;
        }

        // Capturar los nuevos campos separados (usamos trim() para borrar espacios extra por error)
        const datosCita = {
            pacienteNombres: document.getElementById('pacienteNombres').value.trim(),
            pacienteApellidos: document.getElementById('pacienteApellidos').value.trim(),
            pacienteTelefono: document.getElementById('pacienteTelefono').value.trim(), // Se envía, pero no bloqueará la validación
            odontologoId: document.getElementById('odontologoId').value,
            fecha: inputFechaSeleccionada.value,
            horaInicio: document.getElementById('horaInicio').value,
            horaFin: document.getElementById('horaFin').value,
            sillonId: document.getElementById('sillonId').value
        };

        try {
            const respuesta = await fetch('http://localhost:3000/api/citas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosCita)
            });

            const data = await respuesta.json();

            if (respuesta.ok) {
                Swal.fire('¡Éxito!', data.mensaje, 'success').then(() => {
                    formAgendar.reset();
                    document.querySelectorAll('.dia.seleccionado').forEach(el => el.classList.remove('seleccionado'));
                });
            } else {
                // Esto capturará automáticamente el error 404 de "No existe paciente" 
                // o el error 409 de "Cruce de horarios" y lo mostrará al usuario.
                Swal.fire('Atención', data.error, 'warning');
            }
        } catch (error) {
            console.error("Error:", error);
        }
    });
});