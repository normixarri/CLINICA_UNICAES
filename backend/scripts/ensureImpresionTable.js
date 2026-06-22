const db = require('../config/db');

const sql = `
CREATE TABLE IF NOT EXISTS impresion (
  id_impresion INT AUTO_INCREMENT PRIMARY KEY,
  id_documento INT,
  tipo_documento VARCHAR(50),
  id_paciente INT,
  id_doctor INT,
  estado VARCHAR(50),
  fecha_creacion DATETIME,
  fecha_impresion DATETIME,
  impreso_por INT,
  version INT,
  INDEX idx_impresion_estado (estado),
  INDEX idx_impresion_documento (tipo_documento, id_documento),
  FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente),
  FOREIGN KEY (id_doctor) REFERENCES doctor(id_doctor),
  FOREIGN KEY (impreso_por) REFERENCES usuario(id_usuario)
)
`;

db.query(sql, (err) => {
  if (err) {
    console.error(err);
    process.exitCode = 1;
    db.end();
    return;
  }

  console.log('Tabla impresion lista');
  db.end();
});
