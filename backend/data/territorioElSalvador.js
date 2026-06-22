const departamentos = [
  {
    nombre: 'Ahuachap\u00e1n',
    municipios: ['Ahuachap\u00e1n Norte', 'Ahuachap\u00e1n Centro', 'Ahuachap\u00e1n Sur']
  },
  {
    nombre: 'Santa Ana',
    municipios: ['Santa Ana Norte', 'Santa Ana Centro', 'Santa Ana Este', 'Santa Ana Oeste']
  },
  {
    nombre: 'Sonsonate',
    municipios: ['Sonsonate Norte', 'Sonsonate Centro', 'Sonsonate Este', 'Sonsonate Oeste']
  },
  {
    nombre: 'Chalatenango',
    municipios: ['Chalatenango Norte', 'Chalatenango Centro', 'Chalatenango Sur']
  },
  {
    nombre: 'La Libertad',
    municipios: ['La Libertad Norte', 'La Libertad Centro', 'La Libertad Oeste', 'La Libertad Este', 'La Libertad Costa', 'La Libertad Sur']
  },
  {
    nombre: 'San Salvador',
    municipios: ['San Salvador Norte', 'San Salvador Oeste', 'San Salvador Este', 'San Salvador Centro', 'San Salvador Sur']
  },
  {
    nombre: 'Cuscatl\u00e1n',
    municipios: ['Cuscatl\u00e1n Norte', 'Cuscatl\u00e1n Sur']
  },
  {
    nombre: 'La Paz',
    municipios: ['La Paz Oeste', 'La Paz Centro', 'La Paz Este']
  },
  {
    nombre: 'Caba\u00f1as',
    municipios: ['Caba\u00f1as Este', 'Caba\u00f1as Oeste']
  },
  {
    nombre: 'San Vicente',
    municipios: ['San Vicente Norte', 'San Vicente Sur']
  },
  {
    nombre: 'Usulut\u00e1n',
    municipios: ['Usulut\u00e1n Norte', 'Usulut\u00e1n Este', 'Usulut\u00e1n Oeste']
  },
  {
    nombre: 'San Miguel',
    municipios: ['San Miguel Norte', 'San Miguel Centro', 'San Miguel Oeste']
  },
  {
    nombre: 'Moraz\u00e1n',
    municipios: ['Moraz\u00e1n Norte', 'Moraz\u00e1n Sur']
  },
  {
    nombre: 'La Uni\u00f3n',
    municipios: ['La Uni\u00f3n Norte', 'La Uni\u00f3n Sur']
  }
];

const normalizar = (valor) => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const obtenerDepartamentos = () => departamentos.map((departamento, index) => ({
  id_departamento: index + 1,
  nombre: departamento.nombre,
  municipios: departamento.municipios.map((municipio, municipioIndex) => ({
    id_municipio: municipioIndex + 1,
    nombre: municipio
  }))
}));

const obtenerMunicipios = (departamentoNombre) => {
  const departamento = departamentos.find((item) => normalizar(item.nombre) === normalizar(departamentoNombre));
  if (!departamento) return [];

  return departamento.municipios.map((municipio, index) => ({
    id_municipio: index + 1,
    departamento: departamento.nombre,
    nombre: municipio
  }));
};

const existeDepartamento = (departamentoNombre) => {
  if (!departamentoNombre) return true;
  return departamentos.some((departamento) => normalizar(departamento.nombre) === normalizar(departamentoNombre));
};

const existeMunicipioEnDepartamento = (departamentoNombre, municipioNombre) => {
  if (!municipioNombre) return true;
  const municipios = obtenerMunicipios(departamentoNombre);
  return municipios.some((municipio) => normalizar(municipio.nombre) === normalizar(municipioNombre));
};

module.exports = {
  departamentos,
  obtenerDepartamentos,
  obtenerMunicipios,
  existeDepartamento,
  existeMunicipioEnDepartamento
};
