document.addEventListener("DOMContentLoaded", () => {
    fetch('../components/topbar.html')
        .then(respuesta => respuesta.text())
        .then(html => {
            const contenedor = document.getElementById('contenedor-topbar');
            if (contenedor) {
                // 1. Inyectar el diseño
                contenedor.innerHTML = html;

                // 2. Extraer datos del usuario y actualizar la interfaz dinámicamente
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