# DentalPlanner 

Sistema web de gestión clínica odontológica diseñado para la optimización de agendas, control de citas y administración de recursos médicos.

## Características Principales
* **Autenticación Segura:** Sistema de login con hashing de contraseñas (Bcrypt) y control de acceso por roles.
* **Trazabilidad (Auditoría):** Registro automático de todas las operaciones críticas (logins, registros, reservas) en base de datos.
* **Gestión de Agenda:** Algoritmos de validación de cruces horarios para sillones y odontólogos.
* **Dashboard Dinámico:** Visualización en tiempo real de métricas y disponibilidad.

## tack Tecnológico
* **Backend:** Node.js, Express.js.
* **Base de Datos:** MySQL (Driver: `mysql2/promise`).
* **Frontend:** HTML5, CSS3 (Grid/Flexbox), Vanilla JavaScript.
* **Seguridad:** Bcrypt (Hashing), Dotenv (Variables de entorno).
* **Alertas:** SweetAlert2.

## Prerrequisitos
- [Node.js](https://nodejs.org/) (v18 o superior).
- [MySQL Server](https://www.mysql.com/) (Instancia local o remota).

## Instrucciones de Instalación

### 1. Preparación del Entorno
Clona este repositorio o descarga el proyecto. Abre una terminal en la carpeta raíz del backend y ejecuta:
```bash
npm init -y
npm install express mysql2 bcrypt dotenv cors

## 2 Crea un archivo llamado .env en la raíz del backend y define tus credenciales:

PORT_SERVER=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=dentalplanner
DB_PORT=3306

## 3. ejercucion de backend

node server.js