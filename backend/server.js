const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

async function registrarAuditoria(tipo_evento, entidad, descripcion, idUsuario, ip = null) {
    const conexionDb = await pool.getConnection();
    try {
        // BLINDAJE: Si por alguna razón la IP o el ID llegan como 'undefined', los forzamos a 'null'
        const ipSegura = ip || null;
        const idSeguro = idUsuario || null;

        const query = 'INSERT INTO Auditoria_Log (tipo_evento, entidad_afectada, descripcion, ip_origen, Usuario_id_Usuario) VALUES (?, ?, ?, ?, ?)';
        
        await conexionDb.query(query, [tipo_evento, entidad, descripcion, ipSegura, idSeguro]);
        
    } catch (error) {
        // Si sigue fallando, esto nos dirá exactamente por qué en la terminal
        console.error("Error crítico al guardar auditoría:", error);
    } finally {
        conexionDb.release();
    }
}

app.post('/api/registro', async (req, res) => {
    const conexionDb = await pool.getConnection();

    try {
        await conexionDb.beginTransaction();

        // Extraemos los datos que llegan del Frontend
        const { nombres, apellidos, telefono, edad, correo, passwordHash } = req.body;
        
        // Generamos un DNI temporal basado en el teléfono
        const dniTemporal = telefono.substring(0, 8); 
        
        // ==========================================
        // NUEVA LÓGICA DE SEGURIDAD (HASHING)
        // ==========================================
        const saltRounds = 10; // Nivel de complejidad del algoritmo
        // Transformamos la contraseña plana en un código ilegible:
        const passwordEncriptada = await bcrypt.hash(passwordHash, saltRounds); 
        // ==========================================

        // 1. Guardar en la tabla Paciente
        const queryPaciente = 'INSERT INTO Paciente (dni, nombres, apellidos, telefono_celular, edad, correo_electronico) VALUES (?, ?, ?, ?, ?, ?)';
        const [resultadoPaciente] = await conexionDb.query(queryPaciente, [dniTemporal, nombres, apellidos, telefono, edad, correo]);
        
        const idPacienteGenerado = resultadoPaciente.insertId;
        
        // 2. Guardar en la tabla Usuario con Nivel de Acceso (4 = Paciente)
        const ROL_PACIENTE = 4;
        
        // OJO: Aquí enviamos la variable 'passwordEncriptada' hacia MySQL
        const queryUsuario = 'INSERT INTO Usuario (nombre_usuario, password_hash, rol_id, paciente_id, odontologo_id) VALUES (?, ?, ?, ?, NULL)';
        await conexionDb.query(queryUsuario, [correo, passwordEncriptada, ROL_PACIENTE, idPacienteGenerado]);
        
        await conexionDb.commit(); // Confirmar cambios en disco duro
        await registrarAuditoria('REGISTRO', 'Paciente', `Nuevo paciente auto-registrado: ${nombres} ${apellidos}`, null, req.ip);
        res.status(201).json({ exito: true, mensaje: "Cuenta creada exitosamente" });

    } catch (error) {
        await conexionDb.rollback(); // Deshacer todo si hay error
        res.status(500).json({ error: error.message });
    } finally {
        conexionDb.release(); // Devolver la conexión al pool
    }
});

app.listen(process.env.PORT_SERVER, () => {
    console.log(`Servidor de DentalPlanner corriendo en el puerto ${process.env.PORT_SERVER}`);
});

// ==========================================
// ENDPOINT: INICIO DE SESIÓN (LOGIN)
// ==========================================
app.post('/api/login', async (req, res) => {
    const conexionDb = await pool.getConnection();

    try {
        const { correo, password } = req.body;

        // 1. Buscar al usuario en la base de datos SOLO por su correo
        const queryBusqueda = 'SELECT * FROM Usuario WHERE nombre_usuario = ?';
        const [usuarios] = await conexionDb.query(queryBusqueda, [correo]);

        // Si el arreglo viene vacío, significa que el correo no existe
        if (usuarios.length === 0) {
            return res.status(401).json({ error: "El correo o la contraseña son incorrectos." });
        }

        const usuarioEncontrado = usuarios[0];
     
        // 2. LA MAGIA MATEMÁTICA: Comparamos el texto plano con el Hash
        // bcrypt.compare toma "admin123" y lo compara con el "$2b$10$..." de forma segura
        const passwordValida = await bcrypt.compare(password, usuarioEncontrado.password_hash);
     
        // Si la matemática falla, la contraseña es mala
        if (!passwordValida) {
            return res.status(401).json({ error: "El correo o la contraseña son incorrectos." });
        }
        await registrarAuditoria('LOGIN', 'Usuario', `Acceso exitoso del correo: ${usuarioEncontrado.nombre_usuario} (Rol: ${usuarioEncontrado.rol_id})`, usuarioEncontrado.id_usuario, req.ip);
        // 3. Si todo está perfecto, armamos el paquete de datos del usuario
        // OJO: NUNCA devolvemos el password_hash al Frontend por seguridad
        res.status(200).json({
            exito: true,
            usuario: {
                id: usuarioEncontrado.id_usuario,
                nombre: usuarioEncontrado.nombre_usuario, // Aquí mandamos el correo para que SweetAlert diga "Hola, admin@..."
                rol_id: usuarioEncontrado.rol_id,
                odontologo_id: usuarioEncontrado.odontologo_id,
                paciente_id: usuarioEncontrado.paciente_id
            }
        });

    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ error: "Error interno del servidor al procesar el inicio de sesión." });
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
        await registrarAuditoria('RESERVA', 'Cita', `Se agendó cita para el paciente ${pacienteNombres} el ${fecha} a las ${horaInicio}`, null, req.ip);

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
        await registrarAuditoria('BLOQUEO', 'Horario', `Sillón ${sillon_id} bloqueado el ${fecha} (${hora_inicio}-${hora_fin}). Motivo: ${motivo}`, null, req.ip);
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
// ==========================================
// ENDPOINT: REGISTRO DE ODONTÓLOGOS (Solo Admin)
// ==========================================
app.post('/api/registro-odontologo', async (req, res) => {
    const conexionDb = await pool.getConnection();

    try {
        // Iniciamos la transacción segura
        await conexionDb.beginTransaction();

        // 1. Extraemos los datos que enviará el formulario del Admin
        const { nombres, apellidos, colegiatura_cop, especialidad, correo, passwordPlana } = req.body;

        // 2. Encriptamos la contraseña temporal que el Admin le asigne al doctor
        const saltRounds = 10;
        const passwordEncriptada = await bcrypt.hash(passwordPlana, saltRounds);

        // 3. Guardar primero en la tabla Odontologo
        const queryOdontologo = 'INSERT INTO Odontologo (nombres, apellidos, colegiatura_cop, especialidad) VALUES (?, ?, ?, ?)';
        const [resultadoOdontologo] = await conexionDb.query(queryOdontologo, [nombres, apellidos, colegiatura_cop, especialidad]);
        
        // Capturamos el ID autogenerado del doctor
        const idOdontologoGenerado = resultadoOdontologo.insertId;

        // 4. Guardar en la tabla Usuario con Nivel de Acceso (2 = Odontólogo)
        const ROL_ODONTOLOGO = 2;
        
        // Insertamos enviando NULL al paciente_id porque es personal médico
        const queryUsuario = 'INSERT INTO Usuario (nombre_usuario, password_hash, rol_id, odontologo_id, paciente_id) VALUES (?, ?, ?, ?, NULL)';
        await conexionDb.query(queryUsuario, [correo, passwordEncriptada, ROL_ODONTOLOGO, idOdontologoGenerado]);

        // 5. Confirmar transacción
        await conexionDb.commit(); 
        await registrarAuditoria('CREACION', 'Odontologo', `Administrador registró al Odontólogo: ${nombres} ${apellidos} (COP: ${colegiatura_cop})`, null, req.ip);
        res.status(201).json({ exito: true, mensaje: "Cuenta de Odontólogo creada exitosamente" });

    } catch (error) {
        await conexionDb.rollback(); // Deshacer en caso de error
        
        // Si el Admin intenta registrar un correo o un COP que ya existe (Violación de UNIQUE)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "El correo electrónico o la colegiatura (COP) ya están registrados en la clínica." });
        }
        res.status(500).json({ error: error.message });
        
    } finally {
        conexionDb.release();
    }
});
// ==========================================
// ENDPOINT: OBTENER LOGS DE AUDITORÍA (Solo Admin)
// ==========================================
app.get('/api/logs', async (req, res) => {
    const conexionDb = await pool.getConnection();
    try {
        // Traemos todos los logs ordenados por el más reciente primero
        const query = `
            SELECT id_log, fecha_hora, tipo_evento, entidad_afectada, descripcion, ip_origen 
            FROM Auditoria_Log 
            ORDER BY fecha_hora DESC
        `;
        const [logs] = await conexionDb.query(query);
        res.json(logs);
    } catch (error) {
        console.error("Error al obtener logs:", error);
        res.status(500).json({ error: "Error interno del servidor al cargar la auditoría" });
    } finally {
        conexionDb.release();
    }
});