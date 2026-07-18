// Selecciona tu formulario (asegúrate de que la clase o ID coincida con tu HTML)
const formularioLogin = document.querySelector('.FormularioLogin');

formularioLogin.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    // Seleccionamos los inputs. 
    // Asumimos que el [0] es el correo y el [1] es la contraseña.
    const entradas = document.querySelectorAll('.EntradaFormulario');
    
    const datosLogin = {
        correo: entradas[0].value,
        password: entradas[1].value 
    };

    try {
        // Enviamos el paquete POST a nuestro nuevo endpoint del puerto 3000
        const respuesta = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosLogin)
        });

        if (respuesta.ok) {
            // Si el servidor responde 200 (Encontró al usuario)
            Swal.fire({
                title: '¡Bienvenido a DentalPlanner!',
                text: 'Credenciales correctas.',
                icon: 'success',
                timer: 2000, 
                showConfirmButton: false
            });
            
            // Aquí en el futuro puedes poner el código para que salte a la página principal
            // window.location.href = 'agenda.html'; 

        } else {
            // Si el servidor responde 401 (No encontró al usuario)
            const errorData = await respuesta.json();
            
            Swal.fire({
                title: 'Error de Acceso',
                text: errorData.error,
                icon: 'error',
                confirmButtonText: 'Intentar de nuevo',
                confirmButtonColor: '#0284c7' 
            });
        }
    } catch (error) {
        console.error("Error de conexión:", error);
    }
});