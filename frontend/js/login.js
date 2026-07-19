document.addEventListener("DOMContentLoaded", () => {
    const formLogin = document.getElementById('formLogin');

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evita que la página se recargue

            // Capturar datos de los inputs
            const correo = document.getElementById('inputCorreo').value.trim();
            const password = document.getElementById('inputPassword').value.trim();

            try {
                const respuesta = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo, password })
                });

                const data = await respuesta.json();

                if (respuesta.ok) {
                    // 1. Guardar los datos de sesión en localStorage
                    localStorage.setItem('usuarioActual', JSON.stringify(data.usuario));

                    // 2. Notificar éxito y Enrutar por Rol
                    Swal.fire({
                        icon: 'success',
                        title: '¡Bienvenido!',
                        text: `Hola, ${data.usuario.nombre}`,
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => {
                        // ==========================================
                        // NUEVA LÓGICA DE ENRUTAMIENTO POR ROLES
                        // ==========================================
                        if (data.usuario.rol_id === 1) {
                            // Es Administrador (1): Va a su panel exclusivo de gestión
                            window.location.href = "admin-personal.html";
                            
                        } else if (data.usuario.rol_id === 2 || data.usuario.rol_id === 3) {
                            // Es Odontólogo (2) o Asistente (3): Va al Panel Principal Clínico
                            window.location.href = "inicio.html";
                            
                        } else if (data.usuario.rol_id === 4) {
                            // Es Paciente (4): Acceso bloqueado por el momento
                            Swal.fire('Acceso Restringido', 'El portal web para pacientes estará disponible próximamente.', 'info');
                            
                        } else {
                            // Fallback de seguridad por si hay un rol desconocido
                            Swal.fire('Error de Acceso', 'Su rol no tiene una vista asignada en el sistema.', 'error');
                        }
                    });

                } else {
                    // Mostrar error de credenciales (correo o contraseña incorrectos)
                    Swal.fire({
                        icon: 'error',
                        title: 'Error de Autenticación',
                        text: data.error
                    });
                }
            } catch (error) {
                console.error("Error al iniciar sesión:", error);
                Swal.fire('Error de conexión', 'No se pudo conectar con el servidor', 'error');
            }
        });
    }
});