document.addEventListener("DOMContentLoaded", async () => {
    
    // ==========================================
    // 1. CARGAR SILLONES DINÁMICAMENTE
    // ==========================================
    const selectSillon = document.getElementById('selectSillon');
    
    try {
        const resSillones = await fetch('http://localhost:3000/api/sillones/disponibles');
        const sillones = await resSillones.json();
        
        selectSillon.innerHTML = '<option value="">Seleccione un sillón...</option>';
        sillones.forEach(sillon => {
            selectSillon.innerHTML += `<option value="${sillon.id_Consultorio_sillon}">Sillón ${sillon.numero_equipo} - ${sillon.nombre_sala}</option>`;
        });
    } catch (error) {
        console.error("Error cargando sillones:", error);
    }

    // ==========================================
    // 2. LÓGICA DEL CALENDARIO PERSONALIZADO
    // ==========================================
    const inputMesAnio = document.getElementById('inputMesAnio');
    const calendarioDias = document.getElementById('calendarioDias');
    const inputFechaReal = document.getElementById('inputFechaReal');

    // Configurar el mes actual por defecto
    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    inputMesAnio.value = mesActual;

    function renderizarCalendario(fechaMes) {
        calendarioDias.innerHTML = ''; // Limpiar cuadrícula
        const [anio, mes] = fechaMes.split('-');
        const anioNum = parseInt(anio);
        const mesNum = parseInt(mes) - 1; // JS maneja los meses de 0 a 11

        // Obtener el primer día del mes (0 = Domingo, 1 = Lunes...)
        let primerDia = new Date(anioNum, mesNum, 1).getDay();
        // Ajustar para que el calendario empiece en Lunes (0) y termine en Domingo (6)
        primerDia = primerDia === 0 ? 6 : primerDia - 1;

        // Total de días que tiene el mes seleccionado
        const diasEnMes = new Date(anioNum, mesNum + 1, 0).getDate();

        // Rellenar espacios vacíos antes del primer día del mes
        for (let i = 0; i < primerDia; i++) {
            calendarioDias.innerHTML += `<div class="dia-celda vacio"></div>`;
        }

        // Rellenar los días reales
        for (let dia = 1; dia <= diasEnMes; dia++) {
            const celda = document.createElement('div');
            celda.classList.add('dia-celda');
            celda.textContent = dia;
            
            // Evento al hacer clic en un día
            celda.addEventListener('click', () => {
                // Quitar el color azul del día anterior seleccionado
                document.querySelectorAll('.dia-celda.seleccionado').forEach(el => el.classList.remove('seleccionado'));
                
                // Pintar de azul el nuevo día
                celda.classList.add('seleccionado');
                
                // Guardar la fecha exacta (YYYY-MM-DD) en el input oculto
                const fechaFinal = `${anioNum}-${String(mesNum + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                inputFechaReal.value = fechaFinal;
            });

            calendarioDias.appendChild(celda);
        }
    }

    // Renderizar la primera vez al cargar la página
    renderizarCalendario(mesActual);

    // Re-dibujar el calendario si el usuario cambia el mes arriba
    inputMesAnio.addEventListener('change', (e) => {
        renderizarCalendario(e.target.value);
        inputFechaReal.value = ''; // Borrar la selección previa al cambiar de mes
    });


    // ==========================================
    // 3. ENVÍO Y VALIDACIÓN DEL FORMULARIO
    // ==========================================
    const formBloqueo = document.getElementById('formBloqueo');
    
    formBloqueo.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Extraer la fecha del input oculto manipulado por el calendario
        const fechaSeleccionada = inputFechaReal.value;

        if (!fechaSeleccionada) {
            Swal.fire('Atención', 'Por favor, selecciona un día específico en el calendario.', 'warning');
            return;
        }

        const datosBloqueo = {
            fecha: fechaSeleccionada,
            hora_inicio: document.getElementById('inputHoraInicio').value,
            hora_fin: document.getElementById('inputHoraFin').value,
            sillon_id: document.getElementById('selectSillon').value,
            motivo: document.getElementById('inputMotivo').value.trim()
        };

        // Validación matemática de coherencia de horas
        if (datosBloqueo.hora_inicio >= datosBloqueo.hora_fin) {
            Swal.fire('Error', 'La hora de inicio debe ser menor a la hora de fin.', 'warning');
            return;
        }

        try {
            const respuesta = await fetch('http://localhost:3000/api/bloqueos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosBloqueo)
            });

            const resultado = await respuesta.json();

            if (respuesta.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Horario Bloqueado',
                    text: resultado.mensaje
                });
                
                // Limpiar todo después de un bloqueo exitoso
                formBloqueo.reset(); 
                inputFechaReal.value = '';
                renderizarCalendario(inputMesAnio.value); // Re-dibujar para quitar la selección azul
                
            } else {
                Swal.fire('Atención', resultado.error, 'error');
            }
        } catch (error) {
            console.error("Error al enviar bloqueo:", error);
            Swal.fire('Error', 'Problema de conexión con el servidor', 'error');
        }
    });
});