-- =========================================================
-- Script: medicamentos_clinica_unicaes.sql
-- Sistema: CLINICA_UNICAES
-- Objetivo:
--   Insertar medicamentos utilizados por la Clinica Universitaria.
--
-- Importante:
--   Este script es independiente. No modifica database_full.sql,
--   database_seed_inicial.sql ni scripts oficiales existentes.
--
-- Estructura real usada:
--   categoria(id_categoria, codigo, nombre, estado, version, fecha_creacion)
--   presentacion(id_presentacion, descripcion, nombre_presentacion, version, fecha_creacion)
--   medicamento(id_medicamento, nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
--
-- Notas:
--   - No existe tabla inventario en la estructura actual; el stock se guarda en medicamento.stock.
--   - No existe tabla categoria_medicamento; la relacion se hace con medicamento.id_categoria.
--   - La tabla medicamento no tiene campo descripcion; por eso no se insertan descripciones sin cambiar estructura.
--   - Stock inicial de prueba: 100 unidades.
-- =========================================================

USE clinica_db;

START TRANSACTION;

-- ===============================
-- CATEGORIAS
-- ===============================
INSERT INTO categoria (codigo, nombre, estado, version, fecha_creacion)
SELECT 'ANAL', 'Analgesicos', 1, 1, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM categoria WHERE codigo = 'ANAL' OR LOWER(nombre) = LOWER('Analgesicos')
);

INSERT INTO categoria (codigo, nombre, estado, version, fecha_creacion)
SELECT 'ANTB', 'Antibioticos', 1, 1, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM categoria WHERE codigo = 'ANTB' OR LOWER(nombre) = LOWER('Antibioticos')
);

INSERT INTO categoria (codigo, nombre, estado, version, fecha_creacion)
SELECT 'ANTIINF', 'Antiinflamatorios', 1, 1, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM categoria WHERE codigo = 'ANTIINF' OR LOWER(nombre) = LOWER('Antiinflamatorios')
);

INSERT INTO categoria (codigo, nombre, estado, version, fecha_creacion)
SELECT 'ANTH', 'Antihistaminicos', 1, 1, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM categoria WHERE codigo = 'ANTH' OR LOWER(nombre) = LOWER('Antihistaminicos')
);

INSERT INTO categoria (codigo, nombre, estado, version, fecha_creacion)
SELECT 'GAST', 'Gastrointestinales', 1, 1, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM categoria WHERE codigo = 'GAST' OR LOWER(nombre) = LOWER('Gastrointestinales')
);

INSERT INTO categoria (codigo, nombre, estado, version, fecha_creacion)
SELECT 'ANTIHIP', 'Antihipertensivos', 1, 1, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM categoria WHERE codigo = 'ANTIHIP' OR LOWER(nombre) = LOWER('Antihipertensivos')
);

INSERT INTO categoria (codigo, nombre, estado, version, fecha_creacion)
SELECT 'OFTA', 'Oftalmicos', 1, 1, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM categoria WHERE codigo = 'OFTA' OR LOWER(nombre) = LOWER('Oftalmicos')
);

INSERT INTO categoria (codigo, nombre, estado, version, fecha_creacion)
SELECT 'VIT', 'Vitaminas', 1, 1, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM categoria WHERE codigo = 'VIT' OR LOWER(nombre) = LOWER('Vitaminas')
);

INSERT INTO categoria (codigo, nombre, estado, version, fecha_creacion)
SELECT 'CREMA', 'Cremas', 1, 1, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM categoria WHERE codigo = 'CREMA' OR LOWER(nombre) = LOWER('Cremas')
);

INSERT INTO categoria (codigo, nombre, estado, version, fecha_creacion)
SELECT 'INY', 'Inyectables', 1, 1, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM categoria WHERE codigo = 'INY' OR LOWER(nombre) = LOWER('Inyectables')
);

INSERT INTO categoria (codigo, nombre, estado, version, fecha_creacion)
SELECT 'OTRO', 'Otros', 1, 1, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM categoria WHERE codigo = 'OTRO' OR LOWER(nombre) = LOWER('Otros')
);

-- ===============================
-- PRESENTACIONES
-- ===============================
INSERT INTO presentacion (nombre_presentacion, descripcion, version, fecha_creacion)
SELECT 'Tableta', 'Tabletas', 1, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Tableta')
);

INSERT INTO presentacion (nombre_presentacion, descripcion, version, fecha_creacion)
SELECT 'Capsula', 'Capsulas', 1, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Capsula')
);

INSERT INTO presentacion (nombre_presentacion, descripcion, version, fecha_creacion)
SELECT 'Sobre', 'Sobres', 1, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Sobre')
);

INSERT INTO presentacion (nombre_presentacion, descripcion, version, fecha_creacion)
SELECT 'Frasco', 'Frasco', 1, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Frasco')
);

INSERT INTO presentacion (nombre_presentacion, descripcion, version, fecha_creacion)
SELECT 'Crema', 'Crema', 1, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Crema')
);

INSERT INTO presentacion (nombre_presentacion, descripcion, version, fecha_creacion)
SELECT 'Gotas', 'Gotas oftalmicas', 1, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Gotas')
);

INSERT INTO presentacion (nombre_presentacion, descripcion, version, fecha_creacion)
SELECT 'Ampolla', 'Ampolla', 1, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Ampolla')
);

INSERT INTO presentacion (nombre_presentacion, descripcion, version, fecha_creacion)
SELECT 'Inyectable', 'Medicamento inyectable', 1, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Inyectable')
);

-- ===============================
-- MEDICAMENTOS
-- ===============================
INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'CIPROFLOXACINA 500 MG',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Tableta') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'ANTB' OR LOWER(nombre) = LOWER('Antibioticos') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('CIPROFLOXACINA 500 MG'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'TMP-SMZ (TRIMETOPRIM + SULFAMETOXAZOL 160/800 MG)',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Tableta') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'ANTB' OR LOWER(nombre) = LOWER('Antibioticos') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('TMP-SMZ (TRIMETOPRIM + SULFAMETOXAZOL 160/800 MG)'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'AMOXICILINA 500 MG',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Capsula') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'ANTB' OR LOWER(nombre) = LOWER('Antibioticos') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('AMOXICILINA 500 MG'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'ACETAMINOFÉN 500 MG',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Tableta') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'ANAL' OR LOWER(nombre) = LOWER('Analgesicos') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('ACETAMINOFÉN 500 MG'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'IBUPROFENO 600 MG',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Tableta') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'ANTIINF' OR LOWER(nombre) = LOWER('Antiinflamatorios') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('IBUPROFENO 600 MG'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'DICLOFENAC 50 MG',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Tableta') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'ANTIINF' OR LOWER(nombre) = LOWER('Antiinflamatorios') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('DICLOFENAC 50 MG'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'CLID 4 MG',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Tableta') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'ANTH' OR LOWER(nombre) = LOWER('Antihistaminicos') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('CLID 4 MG'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'NO-VOMIT 50 MG',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Tableta') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'GAST' OR LOWER(nombre) = LOWER('Gastrointestinales') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('NO-VOMIT 50 MG'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'LORATADINA 10 MG',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Tableta') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'ANTH' OR LOWER(nombre) = LOWER('Antihistaminicos') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('LORATADINA 10 MG'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'CLORFENIRAMINA 8 MG',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Tableta') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'ANTH' OR LOWER(nombre) = LOWER('Antihistaminicos') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('CLORFENIRAMINA 8 MG'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'METOCARBAMOL 500 MG',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Tableta') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'ANTIINF' OR LOWER(nombre) = LOWER('Antiinflamatorios') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('METOCARBAMOL 500 MG'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'OMEPRAZOL 20 MG',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Capsula') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'GAST' OR LOWER(nombre) = LOWER('Gastrointestinales') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('OMEPRAZOL 20 MG'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'SUERO ORAL SOBRES',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Sobre') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'GAST' OR LOWER(nombre) = LOWER('Gastrointestinales') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('SUERO ORAL SOBRES'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'ENALAPRIL 20 MG',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Tableta') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'ANTIHIP' OR LOWER(nombre) = LOWER('Antihipertensivos') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('ENALAPRIL 20 MG'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'PROPRANOLOL 40 MG',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Tableta') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'ANTIHIP' OR LOWER(nombre) = LOWER('Antihipertensivos') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('PROPRANOLOL 40 MG'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'CLORANFENICOL LÁGRIMAS',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Gotas') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'OFTA' OR LOWER(nombre) = LOWER('Oftalmicos') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('CLORANFENICOL LÁGRIMAS'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'INTESTINOMICINAS',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Tableta') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'GAST' OR LOWER(nombre) = LOWER('Gastrointestinales') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('INTESTINOMICINAS'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'CLOTRIMAZOL 1% CREMA',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Crema') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'CREMA' OR LOWER(nombre) = LOWER('Cremas') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('CLOTRIMAZOL 1% CREMA'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'NEOBACINA CREMA',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Crema') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'CREMA' OR LOWER(nombre) = LOWER('Cremas') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('NEOBACINA CREMA'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'PASMOLIT IM',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Inyectable') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'INY' OR LOWER(nombre) = LOWER('Inyectables') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('PASMOLIT IM'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'FENALER IM',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Inyectable') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'INY' OR LOWER(nombre) = LOWER('Inyectables') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('FENALER IM'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'ORFENAFLEX 60MG/2ML',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Ampolla') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'INY' OR LOWER(nombre) = LOWER('Inyectables') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('ORFENAFLEX 60MG/2ML'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'DEXAMETASONA 8MG/1ML',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Ampolla') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'INY' OR LOWER(nombre) = LOWER('Inyectables') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('DEXAMETASONA 8MG/1ML'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'DICLOFENAC 75MG/3ML',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Ampolla') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'INY' OR LOWER(nombre) = LOWER('Inyectables') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('DICLOFENAC 75MG/3ML'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'DRAMAVOL 50MG/2ML',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Ampolla') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'INY' OR LOWER(nombre) = LOWER('Inyectables') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('DRAMAVOL 50MG/2ML'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'COMPLEJO B FRASCO',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Frasco') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'VIT' OR LOWER(nombre) = LOWER('Vitaminas') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('COMPLEJO B FRASCO'));

INSERT INTO medicamento (nombre, id_presentacion, id_categoria, stock, estado, fecha_creacion, version)
SELECT 'MULTIVITAMINAS',
       (SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER('Tableta') LIMIT 1),
       (SELECT id_categoria FROM categoria WHERE codigo = 'VIT' OR LOWER(nombre) = LOWER('Vitaminas') LIMIT 1),
       100, 1, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM medicamento WHERE UPPER(nombre) = UPPER('MULTIVITAMINAS'));

COMMIT;

