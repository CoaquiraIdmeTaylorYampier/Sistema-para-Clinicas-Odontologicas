const formularioRegistro = document.querySelector('.FormularioRegistro');

formularioRegistro.addEventListener('submit', async (evento) => {
    evento.preventDefault(); // Evita que la página se recargue

    const entradas = document.querySelectorAll('.EntradaFormulario');
    
    // Atrapamos los valores en el orden exacto de tu HTML
    const datosRegistro = {
        nombres: entradas[0].value,
        apellidos: entradas[1].value,
        edad: entradas[2].value,
        telefono: entradas[3].value,
        correo: entradas[4].value,
        passwordHash: entradas[5].value // Ojo: En un sistema real esto se encriptaría aquí o en el backend
    };

    try {
        const respuesta = await fetch('http://localhost:3000/api/registro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosRegistro)
        });

       if (respuesta.ok) {
            // Alerta bonita de éxito
            Swal.fire({
                title: '¡Registro Exitoso!',
                text: 'Tu cuenta ha sido creada. Redirigiendo...',
                icon: 'success',
                timer: 2000, // Desaparece sola en 2 segundos
                showConfirmButton: false
            }).then(() => {
                window.location.href = 'login.html';
            });
        } else {
            const errorData = await respuesta.json();
            
            // Alerta bonita de error
            Swal.fire({
                title: 'Error al registrar',
                text: errorData.error,
                icon: 'error',
                confirmButtonText: 'Intentar de nuevo',
                confirmButtonColor: '#0284c7' // Este es tu azul de DentalPlanner
            });
        
        }
    } catch (error) {
        console.error("Error de conexión:", error);
    }
});