USE clinica_db;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

START TRANSACTION;

-- =========================================================
-- ROLES BASE
-- El sistema solo maneja: ADMINISTRADOR, DOCTOR, ENFERMERA.
-- Los IDs son importantes porque el backend los usa como constantes.
-- =========================================================

INSERT INTO rol (id_rol, nombre, version, fecha_creacion)
VALUES
  (1, 'ADMINISTRADOR', 1, NOW()),
  (2, 'DOCTOR', 1, NOW()),
  (3, 'ENFERMERA', 1, NOW())
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  version = VALUES(version);

-- =========================================================
-- OPERACIONES VIGENTES
-- Los IDs deben coincidir con frontend/src/utils/permisos.js.
-- =========================================================

INSERT INTO operacion
  (id_operacion, codigo, nombre, descripcion, estado, version, fecha_creacion)
VALUES
  (1,  'OP01', 'Ver usuarios',         'Permite visualizar usuarios', 1, 1, NOW()),
  (2,  'OP02', 'Crear usuarios',       'Permite crear usuarios', 1, 1, NOW()),
  (3,  'OP03', 'Editar usuarios',      'Permite editar usuarios', 1, 1, NOW()),
  (4,  'OP04', 'Registrar paciente',   'Permite registrar pacientes', 1, 1, NOW()),
  (5,  'OP05', 'Ver expediente',       'Permite acceder al modulo de expedientes', 1, 1, NOW()),
  (6,  'OP06', 'Ver censo',            'Permite acceder al modulo de censos', 1, 1, NOW()),
  (7,  'OP07', 'Generar consulta',     'Permite generar consultas pendientes desde enfermeria', 1, 1, NOW()),
  (9,  'OP09', 'Realizar consulta',    'Permite atender consultas como doctor registrado', 1, 1, NOW()),
  (10, 'OP10', 'Crear medicamento',    'Permite crear medicamentos', 1, 1, NOW()),
  (11, 'OP11', 'Ver medicamentos',     'Permite visualizar medicamentos', 1, 1, NOW()),
  (12, 'OP12', 'Editar medicamentos',  'Permite editar medicamentos', 1, 1, NOW()),
  (13, 'OP13', 'Imprimir documentos',  'Permite acceder a impresion de documentos clinicos', 1, 1, NOW()),
  (14, 'OP14', 'editar sello clinico', 'Permite editar el sello clinico institucional', 1, 1, NOW()),
  (16, 'OP16', 'Ver pacientes',        'Permite visualizar el listado de pacientes', 1, 1, NOW()),
  (17, 'OP17', 'Editar pacientes',     'Permite editar datos de pacientes', 1, 1, NOW())
ON DUPLICATE KEY UPDATE
  codigo = VALUES(codigo),
  nombre = VALUES(nombre),
  descripcion = VALUES(descripcion),
  estado = VALUES(estado),
  version = VALUES(version);


UPDATE operacion
SET estado = 0,
    fecha_modificacion = NOW()
WHERE id_operacion IN (8, 15)
   OR codigo IN ('OP08', 'OP15')
   OR LOWER(nombre) IN ('ver consultas', 'examen fisico');

-- =========================================================
-- OPERACIONES OBLIGATORIAS POR ROL
-- ADMINISTRADOR no tiene operaciones obligatorias globales:
-- sus permisos se guardan por usuario en usuario_operacion.
-- DOCTOR: realizar consulta, ver medicamentos, imprimir.
-- ENFERMERA: registrar paciente, generar consulta, ver medicamentos, imprimir y ver pacientes.
-- =========================================================

DELETE FROM rol_operacion WHERE id_rol IN (2, 3);

INSERT INTO rol_operacion (id_rol, id_operacion, version, fecha_creacion)
VALUES
  (2, 9, 1, NOW()),
  (2, 11, 1, NOW()),
  (2, 13, 1, NOW()),
  (3, 4, 1, NOW()),
  (3, 7, 1, NOW()),
  (3, 11, 1, NOW()),
  (3, 13, 1, NOW()),
  (3, 16, 1, NOW())
ON DUPLICATE KEY UPDATE
  version = VALUES(version);

-- =========================================================
-- USUARIO ADMINISTRADOR INICIAL
-- Usuario: ADMIN-0001
-- Password inicial: Cambiar123
-- Cambiar esta clave al instalar en produccion.
-- =========================================================

INSERT INTO persona
  (id_persona, nombre, apellidos, sexo, correo_electronico, telefono, dui, fecha_nacimiento, fecha_creacion, version)
VALUES
  (1, 'Administrador', 'Inicial Sistema', 'Femenino', 'admin@unicaes.edu.sv', '70000000', '00000000-0', '1990-01-01', NOW(), 1)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  apellidos = VALUES(apellidos),
  correo_electronico = VALUES(correo_electronico),
  telefono = VALUES(telefono);

INSERT INTO usuario
  (id_usuario, correlativo, secuencia, id_persona, password, estado, fecha_creacion, version)
VALUES
  (1, 'ADMIN-0001', 1, 1, 'scrypt$f7c1123d61635742a15ca61446c15769$7fadf823325aa57b0ceccff2681566c1604c9c3cee10f3d9d34844f8db0b7661ba023e0eb388af26b261051bfac1dff0ece37a44632ad8bcd3195b0653878dc3', 1, NOW(), 1)
ON DUPLICATE KEY UPDATE
  id_persona = VALUES(id_persona),
  estado = VALUES(estado);

INSERT INTO rol_usuario (id_rol, id_usuario, fecha_creacion, version)
VALUES (1, 1, NOW(), 1)
ON DUPLICATE KEY UPDATE version = VALUES(version);

DELETE FROM usuario_operacion WHERE id_usuario = 1;

INSERT INTO usuario_operacion (id_usuario, id_operacion, version, fecha_creacion)
VALUES
  (1, 1, 1, NOW()),
  (1, 2, 1, NOW()),
  (1, 3, 1, NOW()),
  (1, 4, 1, NOW()),
  (1, 5, 1, NOW()),
  (1, 6, 1, NOW()),
  (1, 7, 1, NOW()),
  (1, 10, 1, NOW()),
  (1, 11, 1, NOW()),
  (1, 12, 1, NOW()),
  (1, 13, 1, NOW()),
  (1, 14, 1, NOW()),
  (1, 15, 1, NOW()),
  (1, 16, 1, NOW()),
  (1, 17, 1, NOW())
ON DUPLICATE KEY UPDATE version = VALUES(version);

-- =========================================================
-- TIPOS DE PACIENTE
-- Requeridos por Pacientes, Censo, Expedientes y Generar consulta.
-- =========================================================

INSERT INTO tipo_paciente
  (codigo, nombre, descripcion, estado, version, fecha_creacion, usuario_creacion)
SELECT 'EST', 'Estudiante', 'Paciente estudiante', 1, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM tipo_paciente WHERE nombre = 'Estudiante');

INSERT INTO tipo_paciente
  (codigo, nombre, descripcion, estado, version, fecha_creacion, usuario_creacion)
SELECT 'DOC', 'Docente', 'Paciente docente', 1, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM tipo_paciente WHERE nombre = 'Docente');

INSERT INTO tipo_paciente
  (codigo, nombre, descripcion, estado, version, fecha_creacion, usuario_creacion)
SELECT 'ADM', 'Administrativo', 'Paciente administrativo', 1, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM tipo_paciente WHERE nombre = 'Administrativo');

INSERT INTO tipo_paciente
  (codigo, nombre, descripcion, estado, version, fecha_creacion, usuario_creacion)
SELECT 'SG', 'Servicios Generales', 'Paciente de servicios generales', 1, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM tipo_paciente WHERE nombre = 'Servicios Generales');

INSERT INTO tipo_paciente
  (codigo, nombre, descripcion, estado, version, fecha_creacion, usuario_creacion)
SELECT 'EXT', 'Externo', 'Paciente externo', 1, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM tipo_paciente WHERE nombre = 'Externo');

-- =========================================================
-- FACULTADES UNICAES
-- =========================================================

INSERT INTO facultad (codigo, nombre, descripcion, estado, version, fecha_creacion)
SELECT 'CE', 'Ciencias Empresariales', 'Facultad de Ciencias Empresariales', 1, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM facultad WHERE nombre = 'Ciencias Empresariales');

INSERT INTO facultad (codigo, nombre, descripcion, estado, version, fecha_creacion)
SELECT 'IA', 'Ingeniería y Arquitectura', 'Facultad de Ingeniería y Arquitectura', 1, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM facultad WHERE nombre IN ('Ingeniería y Arquitectura', 'Ingenieria y Arquitectura'));

UPDATE facultad
SET nombre = 'Ingeniería y Arquitectura', codigo = 'IA'
WHERE nombre = 'Ingenieria y Arquitectura';

INSERT INTO facultad (codigo, nombre, descripcion, estado, version, fecha_creacion)
SELECT 'CH', 'Ciencias y Humanidades', 'Facultad de Ciencias y Humanidades', 1, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM facultad WHERE nombre = 'Ciencias y Humanidades');

INSERT INTO facultad (codigo, nombre, descripcion, estado, version, fecha_creacion)
SELECT 'CS', 'Ciencias de la Salud', 'Facultad de Ciencias de la Salud', 1, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM facultad WHERE nombre = 'Ciencias de la Salud');

INSERT INTO facultad (codigo, nombre, descripcion, estado, version, fecha_creacion)
SELECT 'POS', 'Posgrados', 'Escuela de Posgrados', 1, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM facultad WHERE nombre = 'Posgrados');

-- =========================================================
-- CARRERAS UNICAES
-- =========================================================

INSERT INTO carrera (id_facultad, codigo, nombre, descripcion, estado, version, fecha_creacion)
SELECT f.id_facultad, x.codigo, x.nombre, NULL, 1, 1, NOW()
FROM facultad f
JOIN (
  SELECT 'Ciencias Empresariales' facultad, 'CE-ADE' codigo, 'Licenciatura en Administración de Empresas' nombre UNION ALL
  SELECT 'Ciencias Empresariales', 'CE-CON', 'Licenciatura en Contaduría Pública' UNION ALL
  SELECT 'Ciencias Empresariales', 'CE-MNI', 'Licenciatura en Mercadeo y Negocios Internacionales' UNION ALL
  SELECT 'Ciencias Empresariales', 'CE-GDT', 'Licenciatura en Gestión y Desarrollo Turístico' UNION ALL
  SELECT 'Ciencias Empresariales', 'CE-GND', 'Licenciatura en Gestión de Negocios Digitales' UNION ALL
  SELECT 'Ciencias Empresariales', 'CE-RIC', 'Licenciatura en Relaciones Internacionales y Comercio Exterior' UNION ALL
  SELECT 'Ciencias Empresariales', 'CE-GAH', 'Licenciatura en Gastronomía y Hostelería' UNION ALL
  SELECT 'Ciencias Empresariales', 'CE-LOG', 'Licenciatura en Logística y Operaciones' UNION ALL
  SELECT 'Ciencias Empresariales', 'CE-TGV', 'Técnico en Gestión de Ventas' UNION ALL
  SELECT 'Ingeniería y Arquitectura', 'IA-IQU', 'Ingeniería Química' UNION ALL
  SELECT 'Ingeniería y Arquitectura', 'IA-IME', 'Ingeniería Mecánica' UNION ALL
  SELECT 'Ingeniería y Arquitectura', 'IA-IDS', 'Ingeniería en Desarrollo de Software' UNION ALL
  SELECT 'Ingeniería y Arquitectura', 'IA-ITR', 'Ingeniería en Telecomunicaciones y Redes' UNION ALL
  SELECT 'Ingeniería y Arquitectura', 'IA-ARQ', 'Arquitectura' UNION ALL
  SELECT 'Ingeniería y Arquitectura', 'IA-ICI', 'Ingeniería Civil' UNION ALL
  SELECT 'Ingeniería y Arquitectura', 'IA-ISI', 'Ingeniería en Sistemas Informáticos' UNION ALL
  SELECT 'Ingeniería y Arquitectura', 'IA-IAG', 'Ingeniería Agronómica' UNION ALL
  SELECT 'Ingeniería y Arquitectura', 'IA-IIN', 'Ingeniería Industrial' UNION ALL
  SELECT 'Ingeniería y Arquitectura', 'IA-IEL', 'Ingeniería Eléctrica' UNION ALL
  SELECT 'Ingeniería y Arquitectura', 'IA-TPA', 'Ingeniería en Tecnología y Procesamiento de Alimentos' UNION ALL
  SELECT 'Ingeniería y Arquitectura', 'IA-TEX', 'Técnico en Textiles' UNION ALL
  SELECT 'Ciencias y Humanidades', 'CH-DGP', 'Licenciatura en Diseño Gráfico Publicitario' UNION ALL
  SELECT 'Ciencias y Humanidades', 'CH-CJU', 'Licenciatura en Ciencias Jurídicas' UNION ALL
  SELECT 'Ciencias y Humanidades', 'CH-PCA', 'Licenciatura en Periodismo y Comunicación Audiovisual' UNION ALL
  SELECT 'Ciencias y Humanidades', 'CH-IIN', 'Licenciatura en Idioma Inglés' UNION ALL
  SELECT 'Ciencias y Humanidades', 'CH-EII', 'Licenciatura en Ciencias de la Educación con Especialidad en Idioma Inglés' UNION ALL
  SELECT 'Ciencias y Humanidades', 'CH-REL', 'Licenciatura en Ciencias Religiosas' UNION ALL
  SELECT 'Ciencias de la Salud', 'CS-MED', 'Doctorado en Medicina' UNION ALL
  SELECT 'Ciencias de la Salud', 'CS-LEN', 'Licenciatura en Enfermería' UNION ALL
  SELECT 'Ciencias de la Salud', 'CS-TEN', 'Técnico en Enfermería' UNION ALL
  SELECT 'Ciencias de la Salud', 'CS-NYD', 'Licenciatura en Nutrición y Dietética' UNION ALL
  SELECT 'Ciencias de la Salud', 'CS-QFA', 'Licenciatura en Química y Farmacia' UNION ALL
  SELECT 'Posgrados', 'POS-MAE', 'Maestría en Asesoría Educativa' UNION ALL
  SELECT 'Posgrados', 'POS-MDE', 'Maestría en Dirección Estratégica de Empresas' UNION ALL
  SELECT 'Posgrados', 'POS-MGA', 'Maestría en Gerencia y Gestión Ambiental' UNION ALL
  SELECT 'Posgrados', 'POS-MSI', 'Maestría en Seguridad Informática' UNION ALL
  SELECT 'Posgrados', 'POS-MIE', 'Maestría en Investigación Educativa' UNION ALL
  SELECT 'Posgrados', 'POS-DED', 'Doctorado en Educación' UNION ALL
  SELECT 'Posgrados', 'POS-DDE', 'Doctorado en Dirección Estratégica de Empresas' UNION ALL
  SELECT 'Posgrados', 'POS-DIA', 'Doctorado en Ingeniería Ambiental'
) x ON f.nombre = x.facultad
WHERE NOT EXISTS (
  SELECT 1
  FROM carrera c
  WHERE c.id_facultad = f.id_facultad
    AND c.nombre = x.nombre
);

-- =========================================================
-- AREAS
-- Requeridas para pacientes Docente, Administrativo y
-- Servicios Generales.
-- =========================================================

INSERT INTO area (codigo, nombre, descripcion, estado, version, fecha_creacion, usuario_creacion)
SELECT 'DOC', 'Docencia', 'Area docente', 1, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM area WHERE nombre = 'Docencia');

INSERT INTO area (codigo, nombre, descripcion, estado, version, fecha_creacion, usuario_creacion)
SELECT 'ADM', 'Administración', 'Area administrativa', 1, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM area WHERE nombre IN ('Administración', 'Administracion'));

UPDATE area SET nombre = 'Administración' WHERE nombre = 'Administracion';

INSERT INTO area (codigo, nombre, descripcion, estado, version, fecha_creacion, usuario_creacion)
SELECT 'SG', 'Servicios Generales', 'Area de servicios generales', 1, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM area WHERE nombre = 'Servicios Generales');

-- =========================================================
-- PROYECTOS
-- La logica actual permite LAMAR a Estudiante, Docente,
-- Administrativo y Externo; Proyeccion Social solo a Externo.
-- =========================================================

INSERT INTO proyecto (nombre, estado, descripcion, version, fecha_creacion, usuario_creacion)
SELECT 'LAMAR', 1, 'Proyecto LAMAR', 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM proyecto WHERE nombre = 'LAMAR');

INSERT INTO proyecto (nombre, estado, descripcion, version, fecha_creacion, usuario_creacion)
SELECT 'Proyeccion Social', 1, 'Proyecto de proyeccion social', 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM proyecto WHERE nombre IN ('Proyeccion Social', 'Proyección Social'));

UPDATE proyecto SET nombre = 'Proyeccion Social' WHERE nombre = 'Proyección Social';

INSERT INTO proyecto_tipo_permitido (id_tipo_paciente, id_proyecto, version, fecha_creacion)
SELECT tp.id_tipo, p.id_proyecto, 1, NOW()
FROM tipo_paciente tp
JOIN proyecto p ON p.nombre = 'LAMAR'
WHERE tp.nombre IN ('Estudiante', 'Docente', 'Administrativo', 'Externo')
AND NOT EXISTS (
  SELECT 1 FROM proyecto_tipo_permitido ptp
  WHERE ptp.id_tipo_paciente = tp.id_tipo AND ptp.id_proyecto = p.id_proyecto
);

INSERT INTO proyecto_tipo_permitido (id_tipo_paciente, id_proyecto, version, fecha_creacion)
SELECT tp.id_tipo, p.id_proyecto, 1, NOW()
FROM tipo_paciente tp
JOIN proyecto p ON p.nombre = 'Proyeccion Social'
WHERE tp.nombre = 'Externo'
AND NOT EXISTS (
  SELECT 1 FROM proyecto_tipo_permitido ptp
  WHERE ptp.id_tipo_paciente = tp.id_tipo AND ptp.id_proyecto = p.id_proyecto
);

-- =========================================================
-- ESPECIALIDADES MEDICAS
-- Requeridas para crear usuarios con rol Doctor.
-- =========================================================

INSERT INTO especialidad (codigo, nombre, descripcion, estado, version, fecha_creacion, usuario_creacion)
SELECT 'GEN', 'Medicina General', 'Atencion medica general', 1, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM especialidad WHERE nombre = 'Medicina General');

INSERT INTO especialidad (codigo, nombre, descripcion, estado, version, fecha_creacion, usuario_creacion)
SELECT 'PED', 'Pediatría', 'Especialidad pediatrica', 1, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM especialidad WHERE nombre IN ('Pediatría', 'Pediatria'));

UPDATE especialidad SET nombre = 'Pediatría' WHERE nombre = 'Pediatria';

INSERT INTO especialidad (codigo, nombre, descripcion, estado, version, fecha_creacion, usuario_creacion)
SELECT 'CARD', 'Cardiología', 'Especialidad cardiologica', 1, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM especialidad WHERE nombre IN ('Cardiología', 'Cardiologia'));

UPDATE especialidad SET nombre = 'Cardiología' WHERE nombre = 'Cardiologia';

INSERT INTO especialidad (codigo, nombre, descripcion, estado, version, fecha_creacion, usuario_creacion)
SELECT 'DER', 'Dermatología', 'Especialidad dermatologica', 1, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM especialidad WHERE nombre = 'Dermatología');

INSERT INTO especialidad (codigo, nombre, descripcion, estado, version, fecha_creacion, usuario_creacion)
SELECT 'NEU', 'Neurología', 'Especialidad neurologica', 1, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM especialidad WHERE nombre = 'Neurología');

-- =========================================================
-- CATEGORIAS Y PRESENTACIONES DE MEDICAMENTOS
-- Requeridas por Crear/Editar Medicamento y Recetas.
-- =========================================================

INSERT INTO categoria (codigo, nombre, estado, version, fecha_creacion, usuario_creacion)
SELECT 'ANAL', 'Analgesicos', 1, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM categoria WHERE codigo = 'ANAL' OR nombre = 'Analgesicos');

INSERT INTO categoria (codigo, nombre, estado, version, fecha_creacion, usuario_creacion)
SELECT 'ANTB', 'Antibioticos', 1, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM categoria WHERE codigo = 'ANTB' OR nombre = 'Antibioticos');

INSERT INTO categoria (codigo, nombre, estado, version, fecha_creacion, usuario_creacion)
SELECT 'VIT', 'Vitaminas', 1, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM categoria WHERE codigo = 'VIT' OR nombre = 'Vitaminas');

INSERT INTO categoria (codigo, nombre, estado, version, fecha_creacion, usuario_creacion)
SELECT 'AINE', 'Antiinflamatorios', 1, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM categoria WHERE codigo = 'AINE' OR nombre = 'Antiinflamatorios');

INSERT INTO categoria (codigo, nombre, estado, version, fecha_creacion, usuario_creacion)
SELECT 'GI', 'Gastrointestinales', 1, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM categoria WHERE codigo = 'GI' OR nombre = 'Gastrointestinales');

INSERT INTO presentacion (descripcion, nombre_presentacion, version, fecha_creacion, usuario_creacion)
SELECT 'Tabletas', 'Tableta', 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM presentacion WHERE nombre_presentacion = 'Tableta');

INSERT INTO presentacion (descripcion, nombre_presentacion, version, fecha_creacion, usuario_creacion)
SELECT 'Capsulas', 'Capsula', 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM presentacion WHERE nombre_presentacion = 'Capsula');

INSERT INTO presentacion (descripcion, nombre_presentacion, version, fecha_creacion, usuario_creacion)
SELECT 'Jarabe', 'Jarabe', 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM presentacion WHERE nombre_presentacion = 'Jarabe');

INSERT INTO presentacion (descripcion, nombre_presentacion, version, fecha_creacion, usuario_creacion)
SELECT 'Gotas', 'Gotas', 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM presentacion WHERE nombre_presentacion = 'Gotas');

INSERT INTO presentacion (descripcion, nombre_presentacion, version, fecha_creacion, usuario_creacion)
SELECT 'Crema', 'Crema', 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM presentacion WHERE nombre_presentacion = 'Crema');

INSERT INTO presentacion (descripcion, nombre_presentacion, version, fecha_creacion, usuario_creacion)
SELECT 'Frasco', 'Frasco', 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM presentacion WHERE nombre_presentacion = 'Frasco');

-- =========================================================
-- TIPOS DE CONSTANCIA
-- La constancia se decide automaticamente segun tipo_consulta.
-- =========================================================

INSERT INTO tipo_constancia (nombre, descripcion, fecha_creacion, version, usuario_creacion)
SELECT 'Constancia medica general', 'Constancia medica general', NOW(), 1, 1
WHERE NOT EXISTS (SELECT 1 FROM tipo_constancia WHERE nombre = 'Constancia medica general');

INSERT INTO tipo_constancia (nombre, descripcion, fecha_creacion, version, usuario_creacion)
SELECT 'Constancia de nuevo ingreso', 'Constancia de nuevo ingreso', NOW(), 1, 1
WHERE NOT EXISTS (SELECT 1 FROM tipo_constancia WHERE nombre = 'Constancia nuevo ingreso');

-- =========================================================
-- CONFIGURACION BASE
-- El valor del sello queda NULL hasta que se cargue desde el modulo.
-- =========================================================

INSERT INTO configuracion_sistema
  (nombre, valor, tipo, descripcion, version, fecha_creacion, usuario_creacion)
SELECT 'sello_clinico', NULL, 'imagen', 'Sello clinico institucional', 1, NOW(), 1
WHERE NOT EXISTS (
  SELECT 1 FROM configuracion_sistema WHERE nombre IN ('sello_clinico', 'sello')
);

COMMIT;

-- =========================================================
-- VERIFICACION RAPIDA
-- =========================================================

SELECT 'roles' AS catalogo, COUNT(*) AS total FROM rol
UNION ALL SELECT 'operaciones', COUNT(*) FROM operacion WHERE estado = 1 AND id_operacion NOT IN (8, 15)
UNION ALL SELECT 'tipos_paciente', COUNT(*) FROM tipo_paciente
UNION ALL SELECT 'facultades', COUNT(*) FROM facultad
UNION ALL SELECT 'carreras', COUNT(*) FROM carrera
UNION ALL SELECT 'areas', COUNT(*) FROM area
UNION ALL SELECT 'proyectos', COUNT(*) FROM proyecto
UNION ALL SELECT 'especialidades', COUNT(*) FROM especialidad
UNION ALL SELECT 'categorias', COUNT(*) FROM categoria
UNION ALL SELECT 'presentaciones', COUNT(*) FROM presentacion
UNION ALL SELECT 'tipos_constancia', COUNT(*) FROM tipo_constancia;
