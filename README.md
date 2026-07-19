# DentalPlanner 🦷

Sistema web dinámico y modular diseñado para la gestión y optimización de agendas, control de citas médicas y administración de bloqueos horarios por consultorios en clínicas odontológicas.

## 🚀 Características Principales
*   **Módulo de Autenticación:** Control de acceso y enrutamiento dinámico basado en privilegios de usuario (Roles).
*   **Dashboard en Tiempo Real:** Tarjetas con métricas clave (Citas programadas, sillones disponibles) y línea de tiempo diaria.
*   **Gestión de Bloqueos Horarios:** Interfaz con calendario personalizado para restringir el uso de sillones específicos por mantenimiento u otros motivos.
*   **Agenda Semanal Avanzada:** Matriz horaria interactiva con doble scroll independiente y algoritmo de aproximación temporal.

## 🛠️ Tecnologías Utilizadas
*   **Backend:** Node.js, Express.js.
*   **Base de Datos:** MySQL (Driver `mysql2` con soporte de Promesas y Pool de conexiones).
*   **Frontend:** HTML5, CSS3 (Grid y Flexbox), JavaScript Nativo (Vanilla JS) y SweetAlert2 para alertas.

## 📋 Prerrequisitos
Antes de desplegar el proyecto, asegúrate de tener instalado:
*   [Node.js](https://nodejs.org/) (Versión 18 o superior recomendada)
*   Servidor MySQL activo (XAMPP, Laragon o instalación nativa)

## 🔧 Instrucciones de Instalación y Despliegue

### 1. Configuración de la Base de Datos
1. Abre tu gestor de MySQL (phpMyAdmin, Workbench, etc.).
2. Crea una base de datos llamada `dentalplanner`.
3. Importa el script SQL correspondiente con las tablas estructuradas (`Rol`, `Usuario`, `Odontologo`, `Paciente`, `Consultorio_sillon`, `Cita`, `Bloqueo_horario`).

### 2. Configuración del Backend
Abre una terminal en la raíz del proyecto y dirígete a la carpeta del servidor:
```bash
Instala las dependencias necesarias definidas en el package.json:
Bash
npm install
Asegúrate de configurar las credenciales de tu base de datos en el archivo .env:

Fragmento de código
DB_HOST=localhost
DB_USER=tu_usuario_mysql
DB_PASSWORD=tu_contraseña_mysql
DB_NAME=dentalplanner
PORT=3000

3. Ejecutar el Servidor
Para encender la API REST del sistema, ejecuta:

Bash
node server.js
4. Acceso al Frontend
Una vez levantado el backend, puedes abrir directamente el archivo frontend/index.html en cualquier navegador web moderno o utilizar la extensión Live Server de VS Code para iniciar la navegación en el sistema.