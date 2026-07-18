document.addEventListener("DOMContentLoaded", () => {
    // 1. Ir a buscar el archivo HTML del menú
    // Ajusta la ruta dependiendo de dónde esté este archivo JS en relación al menu.html
    fetch('../components/menu.html')
        .then(respuesta => respuesta.text())
        .then(html => {
            // 2. Inyectarlo en el contenedor
            const contenedor = document.getElementById('contenedor-menu');
            if(contenedor) {
                contenedor.innerHTML = html;
                
                // 3. Activar la lógica del botón hamburguesa
                const btnMenu = document.getElementById('btn-menu');
                const sidebar = document.getElementById('sidebar');
                
                btnMenu.addEventListener('click', () => {
                    sidebar.classList.toggle('expandido');
                });
            }
        })
        .catch(error => console.error("Error cargando el menú:", error));
});