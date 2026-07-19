const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/registro', async (req, res) => {
    const conexionDb = await pool.getConnection();

    try {
        await conexionDb.beginTransaction();

        const { nombres, apellidos, telefono, edad, correo, passwordHash } = req.body;
        
        // Generamos un DNI temporal basado en el teléfono porque la BD lo exige
        const dniTemporal = telefono.substring(0, 8); 
        
        // 1. Guardar en Paciente
        const queryPaciente = 'INSERT INTO Paciente (dni, nombres, apellidos, telefono_celular, edad, correo_electronico) VALUES (?, ?, ?, ?, ?, ?)';
        const [resultadoPaciente] = await conexionDb.query(queryPaciente, [dniTemporal, nombres, apellidos, telefono, edad, correo]);
        
        const idPacienteGenerado = resultadoPaciente.insertId;
        
        // 2. Guardar en Usuario con Nivel de Acceso (4 = Paciente)
        const ROL_PACIENTE = 4;
        const queryUsuario = 'INSERT INTO Usuario (nombre_usuario, password_hash, rol_id, paciente_id) VALUES (?, ?, ?, ?)';
        await conexionDb.query(queryUsuario, [correo, passwordHash, ROL_PACIENTE, idPacienteGenerado]);
        
        await conexionDb.commit(); // Confirmar cambios
        res.status(201).json({ exito: true, mensaje: "Cuenta creada exitosamente" });

    } catch (error) {
        await conexionDb.rollback(); // Deshacer todo si hay error
        res.status(500).json({ error: error.message });
    } finally {
        conexionDb.release();
    }
});

app.listen(process.env.PORT_SERVER, () => {
    console.log(`Servidor de DentalPlanner corriendo en el puerto ${process.env.PORT_SERVER}`);
});

// Endpoint de Login
app.post('/api/login', async (req, res) => {
    const conexionDb = await pool.getConnection();
    try {
        const { correo, password } = req.body; // Tu frontend debe enviar esto

        // Buscamos al usuario y hacemos JOIN para traer su nombre real
        const query = `
            SELECT u.id_usuario, u.nombre_usuario, u.rol_id, u.password_hash,
                   o.nombres AS nombre_odontologo, o.apellidos AS apellido_odontologo,
                   p.nombres AS nombre_paciente, p.apellidos AS apellido_paciente
            FROM Usuario u
            LEFT JOIN Odontologo o ON u.odontologo_id = o.id_Odontologo
            LEFT JOIN Paciente p ON u.paciente_id = p.id_paciente
            WHERE u.nombre_usuario = ?
        `;
        const [usuarios] = await conexionDb.query(query, [correo]);

        if (usuarios.length === 0) {
            return res.status(401).json({ error: "Usuario no encontrado" });
        }

        const usuario = usuarios[0];

        // NOTA: Si usas bcrypt para contraseñas, aquí iría bcrypt.compare()
        // Por ahora lo hacemos directo según tus pruebas
        if (password !== usuario.password_hash) {
            return res.status(401).json({ error: "Contraseña incorrecta" });
        }

        // Determinamos el nombre real para enviarlo al Frontend
        let nombreMostrar = "Usuario";
        let apellidosMostrar = "";
        
        if (usuario.rol_id === 2 || usuario.rol_id === 3) {
            nombreMostrar = usuario.nombre_odontologo || "Asistente";
            apellidosMostrar = usuario.apellido_odontologo || "";
        } else if (usuario.rol_id === 4) {
            nombreMostrar = usuario.nombre_paciente || "Paciente";
            apellidosMostrar = usuario.apellido_paciente || "";
        }

        // Enviamos la respuesta exitosa con los datos del usuario
        res.json({
            exito: true,
            usuario: {
                id: usuario.id_usuario,
                correo: usuario.nombre_usuario,
                rol_id: usuario.rol_id,
                nombre: nombreMostrar,
                apellidos: apellidosMostrar
            }
        });

    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    } finally {
        conexionDb.release();
    }
});

// Endpoint para obtener odontólogos registrados
app.get('/api/odontologos', async (req, res) => {
    const conexionDb = await pool.getConnection();
    try {
        const query = 'SELECT id_Odontologo, nombres, apellidos, especialidad FROM Odontologo';
        const [odontologos] = await conexionDb.query(query);
        res.json(odontologos);
    } catch (error) {
        console.error("Error al obtener odontólogos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    } finally {
        conexionDb.release();
    }
});


// Endpoint para obtener sillones disponibles
app.get('/api/sillones/disponibles', async (req, res) => {
    const conexionDb = await pool.getConnection();
    try {
        const query = `
            SELECT id_Consultorio_sillon, nombre_sala, numero_equipo 
            FROM Consultorio_sillon 
            WHERE estado_equipo = 'Disponible'
        `;
        const [sillones] = await conexionDb.query(query);
        res.json(sillones);
    } catch (error) {
        console.error("Error al obtener sillones:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    } finally {
        conexionDb.release();
    }
});
// Endpoint para Agendar Cita y validar cruces
app.post('/api/citas', async (req, res) => {
    const conexionDb = await pool.getConnection();

    try {
        // Recibimos los nuevos campos
        const { pacienteNombres, pacienteApellidos, pacienteTelefono, odontologoId, fecha, horaInicio, horaFin, sillonId } = req.body;

        // 1. VALIDACIÓN ESTRICTA DE PACIENTE (Por Nombre y Apellido)
        const queryPaciente = 'SELECT id_paciente FROM Paciente WHERE nombres = ? AND apellidos = ?';
        const [pacienteRows] = await conexionDb.query(queryPaciente, [pacienteNombres, pacienteApellidos]);
        
        if (pacienteRows.length === 0) {
            // Código 404: No encontrado
            return res.status(404).json({ 
                error: "No existe un paciente registrado con esos nombres y apellidos exactos. Por favor, regístrelo en el sistema primero." 
            });
        }
        
        // Si existe, capturamos su ID
        const paciente_id = pacienteRows[0].id_paciente;

        // 2. VALIDACIÓN DE CRUCE DE HORARIOS
        const queryValidacion = `
            SELECT id_Cita FROM Cita 
            WHERE fecha = ? 
            AND (hora_inicio < ? AND hora_fin > ?)
            AND (Odontologo_id_Odontologo = ? OR Consultorio_sillon_id_Consultorio_sillon = ?)
        `;
        const [citasExistentes] = await conexionDb.query(queryValidacion, [fecha, horaFin, horaInicio, odontologoId, sillonId]);

        if (citasExistentes.length > 0) {
            return res.status(409).json({ 
                error: "Cruce de horarios detectado para este odontólogo o sillón en el bloque de tiempo seleccionado." 
            });
        }

        // 3. INSERTAR LA CITA
        const queryInsert = `
            INSERT INTO Cita (fecha, hora_inicio, hora_fin, estado_color, Paciente_id_Paciente, Odontologo_id_Odontologo, Consultorio_sillon_id_Consultorio_sillon, Plantilla_recordatoria_id_Plantilla_recordatoria)
            VALUES (?, ?, ?, 'verde', ?, ?, ?, 1)
        `;
        
        await conexionDb.query(queryInsert, [fecha, horaInicio, horaFin, paciente_id, odontologoId, sillonId]);

        res.status(201).json({ exito: true, mensaje: "Cita registrada con éxito" });

    } catch (error) {
        console.error("Error al registrar cita:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    } finally {
        conexionDb.release();
    }
});
// Endpoint para obtener los datos del Dashboard (Inicio)
app.get('/api/dashboard', async (req, res) => {
    const conexionDb = await pool.getConnection();
    const { fecha } = req.query;

    if (!fecha) {
        return res.status(400).json({ error: "La fecha es requerida" });
    }

    try {
        // 1. Contar citas del día seleccionado
        const [citasCount] = await conexionDb.query('SELECT COUNT(id_Cita) as total FROM Cita WHERE fecha = ?', [fecha]);

        // 2. Contar sillones disponibles (Este dato no depende de la fecha, es el estado físico actual)
        const [sillonesCount] = await conexionDb.query("SELECT COUNT(id_Consultorio_sillon) as total FROM Consultorio_sillon WHERE estado_equipo = 'Disponible'");

        // 3. Obtener la agenda detallada de ese día
        const queryAgenda = `
            SELECT 
                c.hora_inicio, 
                c.hora_fin, 
                p.nombres AS paciente_nombres, 
                p.apellidos AS paciente_apellidos,
                o.nombres AS doc_nombres,
                s.numero_equipo
            FROM Cita c
            JOIN Paciente p ON c.Paciente_id_Paciente = p.id_paciente
            JOIN Odontologo o ON c.Odontologo_id_Odontologo = o.id_Odontologo
            JOIN Consultorio_sillon s ON c.Consultorio_sillon_id_Consultorio_sillon = s.id_Consultorio_sillon
            WHERE c.fecha = ?
            ORDER BY c.hora_inicio ASC
        `;
        const [agenda] = await conexionDb.query(queryAgenda, [fecha]);

        res.json({
            metricas: {
                citasHoy: citasCount[0].total,
                sillonesDisponibles: sillonesCount[0].total
            },
            agenda: agenda
        });

    } catch (error) {
        console.error("Error en el dashboard:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    } finally {
        conexionDb.release();
    }
});
// Endpoint para registrar un bloqueo de horario
app.post('/api/bloqueos', async (req, res) => {
    const conexionDb = await pool.getConnection();
    try {
        const { fecha, hora_inicio, hora_fin, motivo, sillon_id } = req.body;

        // 1. Validar que no haya citas ya programadas en ese sillón a esa hora
        const queryCruceCita = `
            SELECT id_Cita FROM Cita 
            WHERE fecha = ? 
            AND Consultorio_sillon_id_Consultorio_sillon = ?
            AND (hora_inicio < ? AND hora_fin > ?)
        `;
        const [citasSillon] = await conexionDb.query(queryCruceCita, [fecha, sillon_id, hora_fin, hora_inicio]);

        if (citasSillon.length > 0) {
            return res.status(400).json({ error: "No se puede bloquear: Ya hay una cita agendada en ese sillón durante ese horario." });
        }

        // 2. Insertar el bloqueo si todo está libre
        const queryInsert = `
            INSERT INTO Bloqueo_horario (fecha, hora_inicio, hora_fin, motivo_mantenimiento, Consultorio_sillon_id_Consultorio_sillon)
            VALUES (?, ?, ?, ?, ?)
        `;
        await conexionDb.query(queryInsert, [fecha, hora_inicio, hora_fin, motivo, sillon_id]);

        res.status(201).json({ exito: true, mensaje: "Horario bloqueado con éxito" });

    } catch (error) {
        console.error("Error al registrar bloqueo:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    } finally {
        conexionDb.release();
    }
});
// Endpoint para obtener la agenda de toda una semana
app.get('/api/agenda-semanal', async (req, res) => {
    const conexionDb = await pool.getConnection();
    const { inicio, fin } = req.query;

    if (!inicio || !fin) {
        return res.status(400).json({ error: "Faltan las fechas de inicio y fin" });
    }

    try {
        // 1. Obtener Citas de la semana
        const queryCitas = `
            SELECT 
                c.id_Cita, c.fecha, c.hora_inicio, c.hora_fin,
                p.nombres AS paciente_nom, p.apellidos AS paciente_ape, p.telefono_celular,
                o.nombres AS doc_nom, o.apellidos AS doc_ape,
                s.numero_equipo
            FROM Cita c
            JOIN Paciente p ON c.Paciente_id_Paciente = p.id_paciente
            JOIN Odontologo o ON c.Odontologo_id_Odontologo = o.id_Odontologo
            JOIN Consultorio_sillon s ON c.Consultorio_sillon_id_Consultorio_sillon = s.id_Consultorio_sillon
            WHERE c.fecha BETWEEN ? AND ?
        `;
        const [citas] = await conexionDb.query(queryCitas, [inicio, fin]);

        // 2. Obtener Bloqueos de la semana
        const queryBloqueos = `
            SELECT 
                b.id_Bloqueo_horario, b.fecha, b.hora_inicio, b.hora_fin, b.motivo_mantenimiento,
                s.numero_equipo
            FROM Bloqueo_horario b
            JOIN Consultorio_sillon s ON b.Consultorio_sillon_id_Consultorio_sillon = s.id_Consultorio_sillon
            WHERE b.fecha BETWEEN ? AND ?
        `;
        const [bloqueos] = await conexionDb.query(queryBloqueos, [inicio, fin]);

        res.json({ citas, bloqueos });

    } catch (error) {
        console.error("Error cargando agenda semanal:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    } finally {
        conexionDb.release();
    }
});