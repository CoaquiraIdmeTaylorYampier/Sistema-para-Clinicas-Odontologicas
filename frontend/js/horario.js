document.addEventListener("DOMContentLoaded", () => {
    const inputSemana = document.getElementById('inputSemana');
    const cuerpoHorario = document.getElementById('cuerpoHorario');

    // Inicializar con la semana actual
    const fechaActual = new Date();
    // Calcular el número de semana ISO para el input
    const numSemana = getWeekNumber(fechaActual);
    inputSemana.value = `${fechaActual.getFullYear()}-W${String(numSemana).padStart(2, '0')}`;

    // Dibujar la cuadrícula vacía de 8:00 a 20:00
    crearCuadriculaVacia();
    cargarAgenda(); // Cargar datos iniciales

    // Escuchar cambios en el selector de semana
    inputSemana.addEventListener('change', cargarAgenda);

    async function cargarAgenda() {
        const val = inputSemana.value;
        if (!val) return;

        // Calcular la fecha del Lunes y Domingo de esa semana
        const { lunes, domingo } = obtenerFechasSemana(val);
        
        // Actualizar los textos de los días en la cabecera (Ej: "18 Jul")
        actualizarCabecerasDias(lunes);

        // Limpiar la cuadrícula anterior
        limpiarEventos();

        try {
            const res = await fetch(`http://localhost:3000/api/agenda-semanal?inicio=${lunes.toISOString().split('T')[0]}&fin=${domingo.toISOString().split('T')[0]}`);
            const data = await res.json();

            // Insertar Bloqueos
            data.bloqueos.forEach(bloqueo => {
                insertarEvento(bloqueo, 'bloqueo');
            });

            // Insertar Citas
            data.citas.forEach(cita => {
                insertarEvento(cita, 'cita');
            });

        } catch (error) {
            console.error("Error al traer agenda:", error);
        }
    }

    // --- FUNCIÓN DE REDONDEO Y UBICACIÓN ---
    function insertarEvento(item, tipo) {
        // 1. Determinar el día de la semana (0 = Lunes, 6 = Domingo para nuestra tabla)
        const fechaObj = new Date(item.fecha);
        let diaColumna = fechaObj.getDay();
        diaColumna = diaColumna === 0 ? 6 : diaColumna - 1; // Ajustar a Lunes inicial

        // 2. Redondear la hora de inicio al bloque más cercano
        const [horaStr, minStr] = item.hora_inicio.split(':');
        let horaCercana = parseInt(horaStr);
        const minutos = parseInt(minStr);

        // Lógica de "inclinación": si es >= 30, redondea arriba.
        if (minutos >= 30) {
            horaCercana += 1;
        }

        // Evitar que se salga del horario clínico (8 a 20)
        if (horaCercana < 8) horaCercana = 8;
        if (horaCercana > 20) horaCercana = 20;

        // 3. Buscar la celda exacta en el HTML
        const celda = document.getElementById(`celda-${horaCercana}-${diaColumna}`);
        if (!celda) return;

        // 4. Crear el HTML de la tarjeta
        const horaFormato = `${item.hora_inicio.substring(0,5)} - ${item.hora_fin.substring(0,5)}`;
        let htmlCard = '';

        if (tipo === 'cita') {
            htmlCard = `
                <div class="evento-card cita-verde">
                    <div class="evento-header">
                        <span class="badge-top">[CITA]</span><br>
                        ${horaFormato}
                    </div>
                    <div class="evento-body">
                        <p><strong>Paciente:</strong> ${item.paciente_nom} ${item.paciente_ape}</p>
                        <p><strong>Tel:</strong> ${item.telefono_celular}</p>
                        <p><strong>Dr(a).</strong> ${item.doc_nom} ${item.doc_ape}</p>
                        <p><strong>Sillón:</strong> ${item.numero_equipo}</p>
                    </div>
                </div>
            `;
        } else if (tipo === 'bloqueo') {
            htmlCard = `
                <div class="evento-card bloqueo-rojo">
                    <div class="evento-header">
                        <span class="badge-top">[BLOQUEADO]</span><br>
                        ${horaFormato}
                    </div>
                    <div class="evento-body">
                        <p><strong>Sillón:</strong> ${item.numero_equipo}</p>
                        <p><strong>Motivo:</strong> ${item.motivo_mantenimiento}</p>
                    </div>
                </div>
            `;
        }

        celda.innerHTML += htmlCard;
    }

    // --- FUNCIONES DE APOYO PARA DIBUJAR LA TABLA ---
    function crearCuadriculaVacia() {
        cuerpoHorario.innerHTML = '';
        for (let hora = 8; hora <= 20; hora++) {
            const tr = document.createElement('tr');
            
            // Columna estática de la hora
            const tdHora = document.createElement('td');
            tdHora.className = 'columna-hora';
            tdHora.textContent = `${String(hora).padStart(2, '0')}:00`;
            tr.appendChild(tdHora);

            // Columnas de los 7 días
            for (let dia = 0; dia < 7; dia++) {
                const td = document.createElement('td');
                td.id = `celda-${hora}-${dia}`; // ID clave para inyectar datos (Ej: celda-13-0 para Lunes 13:00)
                tr.appendChild(td);
            }
            cuerpoHorario.appendChild(tr);
        }
    }

    function limpiarEventos() {
        for (let hora = 8; hora <= 20; hora++) {
            for (let dia = 0; dia < 7; dia++) {
                document.getElementById(`celda-${hora}-${dia}`).innerHTML = '';
            }
        }
    }

    function obtenerFechasSemana(weekString) {
        // Convierte "2026-W29" en objetos Date de Lunes y Domingo
        const [year, week] = weekString.split('-W');
        const simple = new Date(year, 0, 1 + (week - 1) * 7);
        const dow = simple.getDay();
        const ISOweekStart = simple;
        if (dow <= 4)
            ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
        else
            ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
        
        const domingo = new Date(ISOweekStart);
        domingo.setDate(ISOweekStart.getDate() + 6);
        
        return { lunes: ISOweekStart, domingo };
    }

    function actualizarCabecerasDias(lunes) {
        const ids = ['f-lun', 'f-mar', 'f-mie', 'f-jue', 'f-vie', 'f-sab', 'f-dom'];
        const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        
        for (let i = 0; i < 7; i++) {
            const fechaDia = new Date(lunes);
            fechaDia.setDate(lunes.getDate() + i);
            document.getElementById(ids[i]).textContent = `${fechaDia.getDate()} ${meses[fechaDia.getMonth()]}`;
        }
    }

    function getWeekNumber(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    }
});