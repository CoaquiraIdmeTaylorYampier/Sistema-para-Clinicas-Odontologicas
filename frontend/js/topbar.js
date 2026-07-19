// ==========================================
// 1. GUARDIÁN DE SEGURIDAD (Ruta Protegida)
// ==========================================
// Este código se ejecuta inmediatamente. Si alguien entra a esta pantalla 
// (incluso usando el botón de atrás) y no tiene sesión, lo expulsa al login.
if (!localStorage.getItem('usuarioActual')) {
    window.location.replace('../index.html');
}

// ==========================================
// 2. LÓGICA DE LA INTERFAZ
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    fetch('../components/topbar.html')
        .then(respuesta => respuesta.text())
        .then(html => {
            const contenedor = document.getElementById('contenedor-topbar');
            if (contenedor) {
                // Inyectar el diseño
                contenedor.innerHTML = html;

                // Extraer datos del usuario y actualizar la interfaz dinámicamente
                const usuarioActualStr = localStorage.getItem('usuarioActual');
                if (usuarioActualStr) {
                    const usuarioActivo = JSON.parse(usuarioActualStr);
                    let etiquetaRol = 'Usuario';
                    
                    if (usuarioActivo.rol_id === 2) etiquetaRol = 'Odontólogo';
                    else if (usuarioActivo.rol_id === 3) etiquetaRol = 'Asistente';
                    else if (usuarioActivo.rol_id === 1) etiquetaRol = 'Admin';

                    document.getElementById('nombreRolUsuario').textContent = `${usuarioActivo.nombre} (${etiquetaRol})`;
                    document.getElementById('userAvatar').src = `https://ui-avatars.com/api/?name=${usuarioActivo.nombre}+${usuarioActivo.apellidos}&background=0284c7&color=fff`;
                }
            }
        })
        .catch(error => console.error("Error cargando la topbar:", error));
});

// ==========================================
// 3. FUNCIÓN GLOBAL: CERRAR SESIÓN
// ==========================================
function cerrarSesion() {
    const confirmarLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        // Usamos 'replace' en vez de 'href' para destruir el historial de esa pestaña
        window.location.replace('../index.html');
    };

    if (window.Swal && typeof window.Swal.fire === 'function') {
        window.Swal.fire({
            title: '¿Cerrar Sesión?',
            text: 'Saldrás de tu cuenta de DentalPlanner',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, salir',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                confirmarLogout();
            }
        });
    } else if (window.confirm('¿Cerrar sesión?')) {
        confirmarLogout();
    }
}