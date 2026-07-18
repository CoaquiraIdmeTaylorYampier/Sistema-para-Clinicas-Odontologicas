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