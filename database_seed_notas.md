# Datos iniciales del sistema clinico

Este paquete deja preparada una instalacion limpia con dos scripts:

- `database_full.sql`: estructura completa actual detectada en la base local.
- `database_seed_inicial.sql`: datos maestros necesarios para que el sistema pueda iniciar sin cargar catalogos a mano.

## Tablas con datos iniciales

- `rol`: se crean unicamente `ADMINISTRADOR`, `DOCTOR` y `ENFERMERA`.
- `operacion`: se crean las operaciones vigentes usadas por el frontend y backend. Las operaciones antiguas `Ver consultas` y `examen fisico` quedan fuera de la logica independiente y, si existen, se marcan inactivas.
- `rol_operacion`: se asignan permisos obligatorios solo a Doctor y Enfermera. Administrador usa permisos personalizados por usuario mediante `usuario_operacion`.
- `persona`, `usuario`, `rol_usuario`, `usuario_operacion`: se crea un administrador inicial para poder entrar en una instalacion limpia.
- `tipo_paciente`: requerido por Pacientes, Censo, Expedientes y Generar consulta.
- `facultad` y `carrera`: catalogo academico UNICAES usado por pacientes, censo y nuevo ingreso. Nuevo ingreso filtra solo Ciencias de la Salud.
- `area`: requerido para pacientes Docente, Administrativo y Servicios Generales.
- `proyecto` y `proyecto_tipo_permitido`: soportan la logica LAMAR y Proyeccion Social.
- `especialidad`: requerido al crear doctores y para la tabla de doctores en Generar consulta.
- `categoria` y `presentacion`: requeridos por Medicamentos y Recetas.
- `tipo_constancia`: requerido por documentos clinicos.
- `configuracion_sistema`: crea el registro base `sello_clinico`; la imagen se sube luego desde el modulo Sello Clinico.

## Tablas estructurales sin datos maestros

- `auditoria_sistema`: queda vacia; registra acciones del sistema en ejecucion, incluyendo IP y MAC cuando sea posible.
- `token_password`: queda vacia; se llena al activar usuarios o recuperar contrasena.
- `impresion`: queda vacia; se llena al enviar documentos clinicos a impresion.
- Tablas transaccionales como `paciente`, `consulta`, `receta`, `incapacidad`, `referencia`, `constancia`, `examen_fisico` y relaciones clinicas se llenan durante el uso normal del sistema.

## Acceso inicial

Usuario inicial:

- Usuario: `ADMIN-0001`
- Contrasena: `Cambiar123`

Esta cuenta existe solo para arranque. Cambiar la contrasena al instalar en produccion.
