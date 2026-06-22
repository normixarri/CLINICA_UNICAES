import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AdminCenso from './pages/AdminCenso';
import Usuarios from './pages/Usuarios';
import SelloClinico from './pages/SelloClinico';
import Medicamentos from './pages/Medicamentos';
import EditarMedicamento from './pages/EditarMedicamento';
import CrearMedicamento from './pages/CrearMedicamento';
import CrearUsuario from './pages/CrearUsuario';
import EditarUsuario from './pages/EditarUsuario';
import Especialidades from './pages/Especialidades';
import BuscarExpediente from './pages/BuscarExpediente';
import ExpedientePaciente from './pages/ExpedientePaciente';
import Pacientes from './pages/Pacientes';
import Areas from './pages/Areas';
import CrearPaciente from './pages/CrearPaciente';
import EditarPaciente from './pages/EditarPaciente';
import GenerarConsulta from './pages/GenerarConsulta';
import ExamenFisico from './pages/ExamenFisico';
import RealizarConsultas from './pages/RealizarConsultas';
import AtenderConsulta from './pages/AtenderConsulta';
import Impresion from './pages/Impresion';
import Login from './pages/Login';
import AccesoDenegado from './pages/AccesoDenegado';
import EstablecerPassword from './pages/EstablecerPassword';
import RecetaPrint from './pages/print/RecetaPrint';
import IncapacidadPrint from './pages/print/IncapacidadPrint';
import ConstanciaPrint from './pages/print/ConstanciaPrint';
import ReferenciaPrint from './pages/print/ReferenciaPrint';
import ProtectedRoute from './components/ProtectedRoute';
import { OPS } from './utils/permisos';

const proteger = (elemento, operaciones = [], opciones = {}) => (
  <ProtectedRoute operaciones={operaciones} {...opciones}>{elemento}</ProtectedRoute>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/establecer-password/:token" element={<EstablecerPassword />} />
        <Route path="/acceso-denegado" element={proteger(<AccesoDenegado />)} />

        <Route path="/" element={proteger(<AdminCenso />, [OPS.VER_CENSO])} />
        <Route path="/usuarios" element={proteger(<Usuarios />, [OPS.VER_USUARIOS])} />
        <Route path="/usuarios/crear" element={proteger(<CrearUsuario />, [OPS.CREAR_USUARIOS])} />
        <Route path="/usuarios/editar/:id" element={proteger(<EditarUsuario />, [OPS.EDITAR_USUARIOS])} />

        <Route path="/medicamentos" element={proteger(<Medicamentos />, [OPS.VER_MEDICAMENTOS])} />
        <Route path="/medicamentos/crear" element={proteger(<CrearMedicamento />, [OPS.CREAR_MEDICAMENTO])} />
        <Route path="/medicamentos/editar/:id" element={proteger(<EditarMedicamento />, [OPS.EDITAR_MEDICAMENTOS])} />

        <Route path="/pacientes" element={proteger(<Pacientes />, [OPS.VER_PACIENTES, OPS.REGISTRAR_PACIENTE, OPS.EDITAR_PACIENTES])} />
        <Route path="/areas" element={proteger(<Areas />, [OPS.REGISTRAR_PACIENTE, OPS.EDITAR_PACIENTES])} />
        <Route path="/pacientes/crear" element={proteger(<CrearPaciente />, [OPS.REGISTRAR_PACIENTE])} />
        <Route path="/pacientes/editar/:id_paciente" element={proteger(<EditarPaciente />, [OPS.EDITAR_PACIENTES])} />

        <Route path="/expedientes" element={proteger(<BuscarExpediente />, [OPS.VER_EXPEDIENTE])} />
        <Route path="/expedientes/:id_paciente" element={proteger(<ExpedientePaciente />, [OPS.VER_EXPEDIENTE])} />
        <Route path="/realizar-consultas/:id_consulta/expediente/:id_paciente" element={proteger(<ExpedientePaciente />, [OPS.REALIZAR_CONSULTA], { requiereDoctor: true })} />

        <Route path="/consultas/generar" element={proteger(<GenerarConsulta />, [OPS.GENERAR_CONSULTA])} />
        <Route path="/consultas/realizar" element={<Navigate to="/realizar-consultas" replace />} />
        <Route path="/realizar-consultas" element={proteger(<RealizarConsultas />, [OPS.REALIZAR_CONSULTA], { requiereDoctor: true })} />
        <Route path="/realizar-consultas/:id_consulta" element={proteger(<AtenderConsulta />, [OPS.REALIZAR_CONSULTA], { requiereDoctor: true })} />

        <Route path="/examen-fisico" element={proteger(<ExamenFisico />, [OPS.REALIZAR_CONSULTA], { requiereDoctor: true })} />
        <Route path="/impresion" element={proteger(<Impresion />, [OPS.IMPRIMIR_DOCUMENTOS])} />
        <Route path="/sello" element={proteger(<SelloClinico />, [OPS.EDITAR_SELLO_CLINICO])} />
        <Route path="/especialidades" element={proteger(<Especialidades />, [OPS.CREAR_USUARIOS, OPS.EDITAR_USUARIOS])} />

        <Route path="/imprimir/receta/:id_receta" element={proteger(<RecetaPrint />, [OPS.REALIZAR_CONSULTA, OPS.IMPRIMIR_DOCUMENTOS, OPS.VER_EXPEDIENTE])} />
        <Route path="/imprimir/incapacidad/:id_incapacidad" element={proteger(<IncapacidadPrint />, [OPS.REALIZAR_CONSULTA, OPS.IMPRIMIR_DOCUMENTOS, OPS.VER_EXPEDIENTE])} />
        <Route path="/imprimir/constancia/:id_constancia" element={proteger(<ConstanciaPrint />, [OPS.REALIZAR_CONSULTA, OPS.IMPRIMIR_DOCUMENTOS, OPS.VER_EXPEDIENTE])} />
        <Route path="/imprimir/referencia/:id_referencia" element={proteger(<ReferenciaPrint />, [OPS.REALIZAR_CONSULTA, OPS.IMPRIMIR_DOCUMENTOS, OPS.VER_EXPEDIENTE])} />

        <Route path="*" element={<Navigate to="/acceso-denegado" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
