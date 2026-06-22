CREATE DATABASE IF NOT EXISTS clinica_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE clinica_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `auditoria_sistema`;
DROP TABLE IF EXISTS `token_password`;
DROP TABLE IF EXISTS `impresion`;
DROP TABLE IF EXISTS `constancia`;
DROP TABLE IF EXISTS `tipo_constancia`;
DROP TABLE IF EXISTS `referencia`;
DROP TABLE IF EXISTS `incapacidad`;
DROP TABLE IF EXISTS `receta_medicamento`;
DROP TABLE IF EXISTS `receta`;
DROP TABLE IF EXISTS `medicamento`;
DROP TABLE IF EXISTS `presentacion`;
DROP TABLE IF EXISTS `categoria`;
DROP TABLE IF EXISTS `examen_fisico`;
DROP TABLE IF EXISTS `consulta`;
DROP TABLE IF EXISTS `recepcion`;
DROP TABLE IF EXISTS `especialidad_doctor`;
DROP TABLE IF EXISTS `especialidad`;
DROP TABLE IF EXISTS `enfermera`;
DROP TABLE IF EXISTS `doctor`;
DROP TABLE IF EXISTS `proyecto_tipo_permitido`;
DROP TABLE IF EXISTS `paciente_proyecto`;
DROP TABLE IF EXISTS `proyecto`;
DROP TABLE IF EXISTS `nuevo_ingreso`;
DROP TABLE IF EXISTS `contacto_emergencia`;
DROP TABLE IF EXISTS `paciente`;
DROP TABLE IF EXISTS `tipo_paciente`;
DROP TABLE IF EXISTS `area`;
DROP TABLE IF EXISTS `carrera`;
DROP TABLE IF EXISTS `facultad`;
DROP TABLE IF EXISTS `usuario_operacion`;
DROP TABLE IF EXISTS `rol_operacion`;
DROP TABLE IF EXISTS `operacion`;
DROP TABLE IF EXISTS `rol_usuario`;
DROP TABLE IF EXISTS `rol`;
DROP TABLE IF EXISTS `usuario`;
DROP TABLE IF EXISTS `persona`;
DROP TABLE IF EXISTS `configuracion_sistema`;
SET FOREIGN_KEY_CHECKS = 1;

-- ===============================
-- configuracion_sistema
-- ===============================
CREATE TABLE IF NOT EXISTS `configuracion_sistema` (
  `id_configuracion` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) DEFAULT NULL,
  `valor` longblob,
  `tipo` varchar(50) DEFAULT NULL,
  `descripcion` text,
  `version` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_configuracion`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- persona
-- ===============================
CREATE TABLE IF NOT EXISTS `persona` (
  `id_persona` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) DEFAULT NULL,
  `apellidos` varchar(100) DEFAULT NULL,
  `sexo` varchar(10) DEFAULT NULL,
  `correo_electronico` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `dui` varchar(10) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `version` int DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_persona`),
  UNIQUE KEY `dui` (`dui`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- usuario
-- ===============================
CREATE TABLE IF NOT EXISTS `usuario` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `correlativo` varchar(50) DEFAULT NULL,
  `secuencia` int DEFAULT NULL,
  `id_persona` int DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `estado` tinyint(1) DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `version` int DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `correlativo` (`correlativo`),
  KEY `id_persona` (`id_persona`),
  CONSTRAINT `usuario_ibfk_1` FOREIGN KEY (`id_persona`) REFERENCES `persona` (`id_persona`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- rol
-- ===============================
CREATE TABLE IF NOT EXISTS `rol` (
  `id_rol` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) DEFAULT NULL,
  `version` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- rol_usuario
-- ===============================
CREATE TABLE IF NOT EXISTS `rol_usuario` (
  `id_rol` int NOT NULL,
  `id_usuario` int NOT NULL,
  `fecha_creacion` datetime NOT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `version` int NOT NULL DEFAULT '1',
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_rol`,`id_usuario`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `rol_usuario_ibfk_1` FOREIGN KEY (`id_rol`) REFERENCES `rol` (`id_rol`),
  CONSTRAINT `rol_usuario_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- operacion
-- ===============================
CREATE TABLE IF NOT EXISTS `operacion` (
  `id_operacion` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) DEFAULT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `descripcion` text,
  `estado` tinyint(1) DEFAULT NULL,
  `version` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_operacion`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- rol_operacion
-- ===============================
CREATE TABLE IF NOT EXISTS `rol_operacion` (
  `id_rol` int NOT NULL,
  `id_operacion` int NOT NULL,
  `version` int NOT NULL DEFAULT '1',
  `fecha_creacion` datetime NOT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_rol`,`id_operacion`),
  KEY `id_operacion` (`id_operacion`),
  CONSTRAINT `rol_operacion_ibfk_1` FOREIGN KEY (`id_rol`) REFERENCES `rol` (`id_rol`),
  CONSTRAINT `rol_operacion_ibfk_2` FOREIGN KEY (`id_operacion`) REFERENCES `operacion` (`id_operacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- usuario_operacion
-- ===============================
CREATE TABLE IF NOT EXISTS `usuario_operacion` (
  `id_usuario` int NOT NULL,
  `id_operacion` int NOT NULL,
  `version` int NOT NULL DEFAULT '1',
  `fecha_creacion` datetime NOT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_usuario`,`id_operacion`),
  KEY `id_operacion` (`id_operacion`),
  CONSTRAINT `usuario_operacion_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `usuario_operacion_ibfk_2` FOREIGN KEY (`id_operacion`) REFERENCES `operacion` (`id_operacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- facultad
-- ===============================
CREATE TABLE IF NOT EXISTS `facultad` (
  `id_facultad` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) DEFAULT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `descripcion` text,
  `estado` tinyint(1) DEFAULT NULL,
  `version` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_facultad`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- carrera
-- ===============================
CREATE TABLE IF NOT EXISTS `carrera` (
  `id_carrera` int NOT NULL AUTO_INCREMENT,
  `id_facultad` int DEFAULT NULL,
  `codigo` varchar(50) DEFAULT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `descripcion` text,
  `estado` tinyint(1) DEFAULT NULL,
  `version` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_carrera`),
  KEY `id_facultad` (`id_facultad`),
  CONSTRAINT `carrera_ibfk_1` FOREIGN KEY (`id_facultad`) REFERENCES `facultad` (`id_facultad`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- area
-- ===============================
CREATE TABLE IF NOT EXISTS `area` (
  `id_area` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) DEFAULT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `descripcion` text,
  `estado` tinyint(1) DEFAULT NULL,
  `version` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_area`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- tipo_paciente
-- ===============================
CREATE TABLE IF NOT EXISTS `tipo_paciente` (
  `id_tipo` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) DEFAULT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `descripcion` text,
  `estado` tinyint(1) DEFAULT NULL,
  `version` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_tipo`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- paciente
-- ===============================
CREATE TABLE IF NOT EXISTS `paciente` (
  `id_paciente` int NOT NULL AUTO_INCREMENT,
  `id_persona` int DEFAULT NULL,
  `correlativo` varchar(50) DEFAULT NULL,
  `secuencia` int DEFAULT NULL,
  `id_tipo_paciente` int DEFAULT NULL,
  `id_carrera` int DEFAULT NULL,
  `id_area` int DEFAULT NULL,
  `sector` varchar(10) DEFAULT NULL,
  `departamento_nacimiento` varchar(100) DEFAULT NULL,
  `municipio_nacimiento` varchar(100) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `departamento` varchar(100) DEFAULT NULL,
  `municipio_residencia` varchar(100) DEFAULT NULL,
  `nombre_padre` varchar(100) DEFAULT NULL,
  `nombre_madre` varchar(100) DEFAULT NULL,
  `nombre_empleado_referencia` varchar(100) DEFAULT NULL,
  `carnet` varchar(50) DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `version` int DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_paciente`),
  UNIQUE KEY `correlativo` (`correlativo`),
  KEY `id_persona` (`id_persona`),
  KEY `id_tipo_paciente` (`id_tipo_paciente`),
  KEY `id_carrera` (`id_carrera`),
  KEY `id_area` (`id_area`),
  KEY `usuario_creacion` (`usuario_creacion`),
  KEY `usuario_modificacion` (`usuario_modificacion`),
  CONSTRAINT `paciente_ibfk_1` FOREIGN KEY (`id_persona`) REFERENCES `persona` (`id_persona`),
  CONSTRAINT `paciente_ibfk_2` FOREIGN KEY (`id_tipo_paciente`) REFERENCES `tipo_paciente` (`id_tipo`),
  CONSTRAINT `paciente_ibfk_3` FOREIGN KEY (`id_carrera`) REFERENCES `carrera` (`id_carrera`),
  CONSTRAINT `paciente_ibfk_4` FOREIGN KEY (`id_area`) REFERENCES `area` (`id_area`),
  CONSTRAINT `paciente_ibfk_5` FOREIGN KEY (`usuario_creacion`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `paciente_ibfk_6` FOREIGN KEY (`usuario_modificacion`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- contacto_emergencia
-- ===============================
CREATE TABLE IF NOT EXISTS `contacto_emergencia` (
  `id_contacto` int NOT NULL AUTO_INCREMENT,
  `id_paciente` int DEFAULT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `parentesco` varchar(50) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `version` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_contacto`),
  KEY `id_paciente` (`id_paciente`),
  CONSTRAINT `contacto_emergencia_ibfk_1` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`id_paciente`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- nuevo_ingreso
-- ===============================
CREATE TABLE IF NOT EXISTS `nuevo_ingreso` (
  `id_nuevo_ingreso` int NOT NULL AUTO_INCREMENT,
  `id_paciente` int DEFAULT NULL,
  `id_consulta` int DEFAULT NULL,
  `dt` tinyint(1) DEFAULT NULL,
  `dt_fecha_dosis` date DEFAULT NULL,
  `dt_dosis` int DEFAULT NULL,
  `hepatitis_b` tinyint(1) DEFAULT NULL,
  `hepatitis_b_fecha_dosis` date DEFAULT NULL,
  `hepatitis_b_dosis` int DEFAULT NULL,
  `otras_vacunas` varchar(255) DEFAULT NULL,
  `enfermedades_cronicas` tinyint(1) DEFAULT NULL,
  `detalle_enfermedades` text,
  `problemas_auditivos` tinyint(1) DEFAULT NULL,
  `detalle_auditivos` text,
  `problemas_visuales` tinyint(1) DEFAULT NULL,
  `detalle_visuales` text,
  `fecha_creacion` date DEFAULT NULL,
  `fecha_modificacion` date DEFAULT NULL,
  `version` int DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_nuevo_ingreso`),
  UNIQUE KEY `unique_nuevo_ingreso_consulta` (`id_consulta`),
  KEY `idx_nuevo_ingreso_paciente` (`id_paciente`),
  CONSTRAINT `nuevo_ingreso_ibfk_1` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`id_paciente`),
  CONSTRAINT `fk_nuevo_ingreso_consulta` FOREIGN KEY (`id_consulta`) REFERENCES `consulta` (`id_consulta`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- proyecto
-- ===============================
CREATE TABLE IF NOT EXISTS `proyecto` (
  `id_proyecto` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) DEFAULT NULL,
  `estado` tinyint(1) DEFAULT NULL,
  `descripcion` text,
  `version` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_proyecto`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- paciente_proyecto
-- ===============================
CREATE TABLE IF NOT EXISTS `paciente_proyecto` (
  `id_paciente` int NOT NULL,
  `id_proyecto` int NOT NULL,
  `version` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_paciente`,`id_proyecto`),
  KEY `id_proyecto` (`id_proyecto`),
  CONSTRAINT `paciente_proyecto_ibfk_1` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`id_paciente`),
  CONSTRAINT `paciente_proyecto_ibfk_2` FOREIGN KEY (`id_proyecto`) REFERENCES `proyecto` (`id_proyecto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- proyecto_tipo_permitido
-- ===============================
CREATE TABLE IF NOT EXISTS `proyecto_tipo_permitido` (
  `id_tipo_paciente` int NOT NULL,
  `id_proyecto` int NOT NULL,
  `version` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_tipo_paciente`,`id_proyecto`),
  KEY `id_proyecto` (`id_proyecto`),
  CONSTRAINT `proyecto_tipo_permitido_ibfk_1` FOREIGN KEY (`id_tipo_paciente`) REFERENCES `tipo_paciente` (`id_tipo`),
  CONSTRAINT `proyecto_tipo_permitido_ibfk_2` FOREIGN KEY (`id_proyecto`) REFERENCES `proyecto` (`id_proyecto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- doctor
-- ===============================
CREATE TABLE IF NOT EXISTS `doctor` (
  `id_doctor` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int DEFAULT NULL,
  `jvpm` int DEFAULT NULL,
  `firma` longblob,
  `sello` longblob,
  `version` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_doctor`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `doctor_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- enfermera
-- ===============================
CREATE TABLE IF NOT EXISTS `enfermera` (
  `id_enfermera` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int DEFAULT NULL,
  `jvpe` int DEFAULT NULL,
  `version` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_enfermera`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `enfermera_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- especialidad
-- ===============================
CREATE TABLE IF NOT EXISTS `especialidad` (
  `id_especialidad` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) DEFAULT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `descripcion` text,
  `estado` tinyint(1) DEFAULT NULL,
  `version` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_especialidad`),
  UNIQUE KEY `uq_especialidad_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- especialidad_doctor
-- ===============================
CREATE TABLE IF NOT EXISTS `especialidad_doctor` (
  `id_especialidad` int NOT NULL,
  `id_doctor` int NOT NULL,
  `version` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_especialidad`,`id_doctor`),
  KEY `id_doctor` (`id_doctor`),
  CONSTRAINT `especialidad_doctor_ibfk_1` FOREIGN KEY (`id_especialidad`) REFERENCES `especialidad` (`id_especialidad`),
  CONSTRAINT `especialidad_doctor_ibfk_2` FOREIGN KEY (`id_doctor`) REFERENCES `doctor` (`id_doctor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- recepcion
-- ===============================
CREATE TABLE IF NOT EXISTS `recepcion` (
  `id_recepcion` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int DEFAULT NULL,
  `id_paciente` int DEFAULT NULL,
  `fecha_ingreso` date DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `version` int DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_recepcion`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_paciente` (`id_paciente`),
  CONSTRAINT `recepcion_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `recepcion_ibfk_2` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`id_paciente`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- consulta
-- ===============================
CREATE TABLE IF NOT EXISTS `consulta` (
  `id_consulta` int NOT NULL AUTO_INCREMENT,
  `id_recepcion` int DEFAULT NULL,
  `id_paciente` int DEFAULT NULL,
  `id_doctor` int DEFAULT NULL,
  `tipo_consulta` varchar(50) DEFAULT NULL,
  `estado` varchar(50) DEFAULT NULL,
  `diagnostico` text,
  `tratamiento` text,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `version` int DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_consulta`),
  KEY `id_recepcion` (`id_recepcion`),
  KEY `id_paciente` (`id_paciente`),
  KEY `id_doctor` (`id_doctor`),
  KEY `usuario_creacion` (`usuario_creacion`),
  KEY `usuario_modificacion` (`usuario_modificacion`),
  CONSTRAINT `consulta_ibfk_1` FOREIGN KEY (`id_recepcion`) REFERENCES `recepcion` (`id_recepcion`),
  CONSTRAINT `consulta_ibfk_2` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`id_paciente`),
  CONSTRAINT `consulta_ibfk_3` FOREIGN KEY (`id_doctor`) REFERENCES `doctor` (`id_doctor`),
  CONSTRAINT `consulta_ibfk_4` FOREIGN KEY (`usuario_creacion`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `consulta_ibfk_5` FOREIGN KEY (`usuario_modificacion`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- examen_fisico
-- ===============================
CREATE TABLE IF NOT EXISTS `examen_fisico` (
  `id_examen_fisico` int NOT NULL AUTO_INCREMENT,
  `id_paciente` int DEFAULT NULL,
  `id_consulta` int DEFAULT NULL,
  `peso` decimal(5,2) DEFAULT NULL,
  `unidad_peso` varchar(10) DEFAULT NULL,
  `talla` decimal(4,2) DEFAULT NULL,
  `unidad_talla` varchar(10) DEFAULT NULL,
  `temperatura` decimal(4,1) DEFAULT NULL,
  `pulso` int DEFAULT NULL,
  `frecuencia_cardiaca` int DEFAULT NULL,
  `presion_sistolica` int DEFAULT NULL,
  `presion_diastolica` int DEFAULT NULL,
  `antecedentes` text,
  `examen_fisico` text,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `version` int DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_examen_fisico`),
  KEY `id_paciente` (`id_paciente`),
  KEY `fk_examen_fisico_consulta` (`id_consulta`),
  CONSTRAINT `examen_fisico_ibfk_1` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`id_paciente`),
  CONSTRAINT `fk_examen_fisico_consulta` FOREIGN KEY (`id_consulta`) REFERENCES `consulta` (`id_consulta`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- categoria
-- ===============================
CREATE TABLE IF NOT EXISTS `categoria` (
  `id_categoria` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `estado` tinyint(1) DEFAULT NULL,
  `version` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_categoria`),
  UNIQUE KEY `codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- presentacion
-- ===============================
CREATE TABLE IF NOT EXISTS `presentacion` (
  `id_presentacion` int NOT NULL AUTO_INCREMENT,
  `descripcion` text,
  `nombre_presentacion` varchar(100) DEFAULT NULL,
  `version` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_presentacion`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- medicamento
-- ===============================
CREATE TABLE IF NOT EXISTS `medicamento` (
  `id_medicamento` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) DEFAULT NULL,
  `id_presentacion` int DEFAULT NULL,
  `id_categoria` int DEFAULT NULL,
  `stock` int DEFAULT NULL,
  `estado` tinyint(1) DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `version` int DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_medicamento`),
  KEY `id_presentacion` (`id_presentacion`),
  KEY `id_categoria` (`id_categoria`),
  KEY `usuario_creacion` (`usuario_creacion`),
  KEY `usuario_modificacion` (`usuario_modificacion`),
  CONSTRAINT `medicamento_ibfk_1` FOREIGN KEY (`id_presentacion`) REFERENCES `presentacion` (`id_presentacion`),
  CONSTRAINT `medicamento_ibfk_2` FOREIGN KEY (`id_categoria`) REFERENCES `categoria` (`id_categoria`),
  CONSTRAINT `medicamento_ibfk_3` FOREIGN KEY (`usuario_creacion`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `medicamento_ibfk_4` FOREIGN KEY (`usuario_modificacion`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- receta
-- ===============================
CREATE TABLE IF NOT EXISTS `receta` (
  `id_receta` int NOT NULL AUTO_INCREMENT,
  `id_consulta` int DEFAULT NULL,
  `indicaciones` text,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `version` int DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_receta`),
  KEY `id_consulta` (`id_consulta`),
  KEY `usuario_creacion` (`usuario_creacion`),
  KEY `usuario_modificacion` (`usuario_modificacion`),
  CONSTRAINT `receta_ibfk_1` FOREIGN KEY (`id_consulta`) REFERENCES `consulta` (`id_consulta`),
  CONSTRAINT `receta_ibfk_2` FOREIGN KEY (`usuario_creacion`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `receta_ibfk_3` FOREIGN KEY (`usuario_modificacion`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- receta_medicamento
-- ===============================
CREATE TABLE IF NOT EXISTS `receta_medicamento` (
  `id_receta` int NOT NULL,
  `id_medicamento` int NOT NULL,
  `dosis` decimal(10,2) DEFAULT NULL,
  `cantidad_por_toma` decimal(10,2) DEFAULT NULL,
  `frecuencia` varchar(255) DEFAULT NULL,
  `duracion` int DEFAULT NULL,
  `cantidad_indicada` int DEFAULT NULL,
  `cantidad_entregada` int DEFAULT NULL,
  `unidad_entrega` varchar(50) DEFAULT NULL,
  `unidad_dosis` varchar(50) DEFAULT NULL,
  `intervalo` int DEFAULT NULL,
  `unidad_intervalo` varchar(50) DEFAULT NULL,
  `unidad_duracion` varchar(50) DEFAULT NULL,
  `indicacion_generada` text,
  `observacion` text,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `version` int DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_receta`,`id_medicamento`),
  KEY `id_medicamento` (`id_medicamento`),
  CONSTRAINT `receta_medicamento_ibfk_1` FOREIGN KEY (`id_receta`) REFERENCES `receta` (`id_receta`),
  CONSTRAINT `receta_medicamento_ibfk_2` FOREIGN KEY (`id_medicamento`) REFERENCES `medicamento` (`id_medicamento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- incapacidad
-- ===============================
CREATE TABLE IF NOT EXISTS `incapacidad` (
  `id_incapacidad` int NOT NULL AUTO_INCREMENT,
  `id_consulta` int DEFAULT NULL,
  `diagnostico` text,
  `dias_incapacidad` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `version` int DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_incapacidad`),
  KEY `id_consulta` (`id_consulta`),
  CONSTRAINT `incapacidad_ibfk_1` FOREIGN KEY (`id_consulta`) REFERENCES `consulta` (`id_consulta`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- referencia
-- ===============================
CREATE TABLE IF NOT EXISTS `referencia` (
  `id_referencia` int NOT NULL AUTO_INCREMENT,
  `id_consulta` int DEFAULT NULL,
  `lugar_referencia` varchar(100) DEFAULT NULL,
  `especialidad` varchar(100) DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `version` int DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_referencia`),
  KEY `id_consulta` (`id_consulta`),
  CONSTRAINT `referencia_ibfk_1` FOREIGN KEY (`id_consulta`) REFERENCES `consulta` (`id_consulta`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- tipo_constancia
-- ===============================
CREATE TABLE IF NOT EXISTS `tipo_constancia` (
  `id_tipo_constancia` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) DEFAULT NULL,
  `descripcion` text,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `version` int DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_tipo_constancia`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- constancia
-- ===============================
CREATE TABLE IF NOT EXISTS `constancia` (
  `id_constancia` int NOT NULL AUTO_INCREMENT,
  `id_consulta` int DEFAULT NULL,
  `id_tipo_constancia` int DEFAULT NULL,
  `fecha_emision` date DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_modificacion` datetime DEFAULT NULL,
  `version` int DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_constancia`),
  KEY `id_consulta` (`id_consulta`),
  KEY `id_tipo_constancia` (`id_tipo_constancia`),
  CONSTRAINT `constancia_ibfk_1` FOREIGN KEY (`id_consulta`) REFERENCES `consulta` (`id_consulta`),
  CONSTRAINT `constancia_ibfk_2` FOREIGN KEY (`id_tipo_constancia`) REFERENCES `tipo_constancia` (`id_tipo_constancia`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- impresion
-- ===============================
CREATE TABLE IF NOT EXISTS `impresion` (
  `id_impresion` int NOT NULL AUTO_INCREMENT,
  `id_documento` int DEFAULT NULL,
  `tipo_documento` varchar(50) DEFAULT NULL,
  `id_paciente` int DEFAULT NULL,
  `id_doctor` int DEFAULT NULL,
  `estado` varchar(50) DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_impresion` datetime DEFAULT NULL,
  `impreso_por` int DEFAULT NULL,
  `version` int DEFAULT NULL,
  `usuario_creacion` int DEFAULT NULL,
  `usuario_modificacion` int DEFAULT NULL,
  PRIMARY KEY (`id_impresion`),
  KEY `id_paciente` (`id_paciente`),
  KEY `id_doctor` (`id_doctor`),
  KEY `impreso_por` (`impreso_por`),
  CONSTRAINT `impresion_ibfk_1` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`id_paciente`),
  CONSTRAINT `impresion_ibfk_2` FOREIGN KEY (`id_doctor`) REFERENCES `doctor` (`id_doctor`),
  CONSTRAINT `impresion_ibfk_3` FOREIGN KEY (`impreso_por`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- token_password
-- ===============================
CREATE TABLE IF NOT EXISTS `token_password` (
  `id_token` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `tipo` enum('CREACION_USUARIO','ACTIVACION_USUARIO','RECUPERACION_PASSWORD') NOT NULL,
  `fecha_expiracion` datetime NOT NULL,
  `usado` tinyint(1) DEFAULT '0',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_token`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `token_password_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===============================
-- auditoria_sistema
-- ===============================
CREATE TABLE IF NOT EXISTS `auditoria_sistema` (
  `id_auditoria` int NOT NULL AUTO_INCREMENT,
  `tabla_afectada` varchar(100) NOT NULL,
  `id_registro` int DEFAULT NULL,
  `accion` enum('INSERT','UPDATE','DELETE') NOT NULL,
  `usuario_accion` int DEFAULT NULL,
  `direccion_ip` varchar(45) DEFAULT NULL,
  `direccion_mac` varchar(50) DEFAULT NULL,
  `fecha_accion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `datos_anteriores` json DEFAULT NULL,
  `datos_nuevos` json DEFAULT NULL,
  `descripcion` text,
  PRIMARY KEY (`id_auditoria`),
  KEY `usuario_accion` (`usuario_accion`),
  CONSTRAINT `auditoria_sistema_ibfk_1` FOREIGN KEY (`usuario_accion`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
