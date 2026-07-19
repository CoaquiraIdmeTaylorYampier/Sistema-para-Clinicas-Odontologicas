document.getElementById('formRegistroOdontologo').addEventListener('submit', async (e) => {
    e.preventDefault(); // Evitamos que la página se recargue

    // 1. Capturamos los valores de los inputs
    const datosOdontologo = {
        nombres: document.getElementById('nombres').value,
        apellidos: document.getElementById('apellidos').value,
        colegiatura_cop: document.getElementById('cop').value,
        especialidad: document.getElementById('especialidad').value,
        correo: document.getElementById('correo').value,
        passwordPlana: document.getElementById('password').value
    };

    try {
        // 2. Disparamos la petición HTTP hacia nuestro backend
        const respuesta = await fetch('http://localhost:3000/api/registro-odontologo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosOdontologo)
        });

        const resultado = await respuesta.json();

        // 3. Evaluamos la respuesta del servidor
        if (respuesta.ok) {
            // Éxito: Pintamos alerta verde y limpiamos el formulario
            Swal.fire({
                icon: 'success',
                title: '¡Registro Exitoso!',
                text: resultado.mensaje
            });
            document.getElementById('formRegistroOdontologo').reset();
        } else {
            // Error controlado (ej. El COP ya existe)
            Swal.fire({
                icon: 'warning',
                title: 'Atención',
                text: resultado.error
            });
        }

    } catch (error) {
        // Error grave (ej. El servidor Node.js está apagado)
        Swal.fire({
            icon: 'error',
            title: 'Error de Conexión',
            text: 'No se pudo comunicar con el servidor.'
        });
        console.error('Error:', error);
    }
});