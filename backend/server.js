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

// Endpoint para Iniciar Sesión
app.post('/api/login', async (req, res) => {
    const conexionDb = await pool.getConnection();

    try {
        // Recibimos el correo y la contraseña que manda el frontend
        const { correo, password } = req.body;

        // Consultamos a la base de datos si existe esa combinación exacta
        // Recuerda que al registrar, guardamos el correo en la columna nombre_usuario
        const queryLogin = 'SELECT * FROM Usuario WHERE nombre_usuario = ? AND password_hash = ?';
        
        // Ejecutamos la consulta. MySQL nos devuelve un arreglo con los resultados
        const [usuariosEncontrados] = await conexionDb.query(queryLogin, [correo, password]);

        // Si el arreglo tiene al menos 1 elemento, las credenciales son correctas
        if (usuariosEncontrados.length > 0) {
            res.status(200).json({ 
                exito: true, 
                mensaje: "Inicio de sesión correcto", 
                rol_id: usuariosEncontrados[0].rol_id // Enviamos el rol por si lo necesitas luego
            });
        } else {
            // Si el arreglo está vacío, los datos no coinciden
            res.status(401).json({ error: "Correo o contraseña incorrectos" });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        conexionDb.release(); // Siempre liberamos la conexión
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