import React from 'react';
import { useParams } from 'react-router-dom';
import PacienteFormulario from './PacienteFormulario';

function EditarPaciente() {
  const { id_paciente } = useParams();
  return <PacienteFormulario modo="editar" idPaciente={id_paciente} />;
}

export default EditarPaciente;
