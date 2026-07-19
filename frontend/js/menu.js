document.addEventListener("DOMContentLoaded", () => {
    // 1. Ir a buscar el archivo HTML del menú
    fetch('../components/menu.html')
        .then(respuesta => respuesta.text())
        .then(html => {
            const contenedor = document.getElementById('contenedor-menu');
            if(contenedor) {
                // Inyectar el menú
                contenedor.innerHTML = html;
                
                // 2. Activar la lógica del botón hamburguesa
                const btnMenu = document.getElementById('btn-menu');
                const sidebar = document.getElementById('sidebar');
                
                btnMenu.addEventListener('click', () => {
                    sidebar.classList.toggle('expandido');
                });

                // 3. Lógica para resaltar la página actual (Estado Activo)
                const paginaActual = window.location.pathname.split('/').pop();
                const enlaces = sidebar.querySelectorAll('.sidebar-links a');

                enlaces.forEach(enlace => {
                    // Verificamos si el href coincide con el nombre de la página actual
                    if (enlace.getAttribute('href') === paginaActual) {
                        enlace.parentElement.classList.add('activo');
                    }
                });
            }
        })
        .catch(error => console.error("Error cargando el menú:", error));
});