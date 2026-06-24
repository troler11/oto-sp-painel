export interface Sessao { user: { email?: string; nome: string; usuario?: string; papel: string }; }
export interface Usuario { id: number; nome: string; usuario?: string; papel: string; }
export interface ModeloMensagem { id: number; titulo: string; texto: string; }
export interface Medico {
  id: number; nome: string; unidade: string;
  inicio_expediente: string; fim_expediente: string;
  inicio_almoco: string; fim_almoco: string; duracao_consulta: number;
}
export interface Agendamento {
  id: number; data_criacao: string; intencao: string; especialidade: string;
  unidade: string; pagamento: string; periodo_atendimento?: string;
  nome_medico?: string; status_atendimento: string; nome_paciente: string;
  para_terceiro: boolean; nome_titular: string; atendente_nome?: string;
  data_consulta?: string; hora_consulta?: string; medico_final?: string;
  observacoes?: string; telefone: string; cpf_paciente?: string;
  nascimento_paciente?: string; tipo_consulta?: string;
  data_atualizacao?: string; data_atendimento?: string; data_cancelamento?: string;
}
export interface Lead {
  id: number; telefone: string; nome_titular: string; cpf_titular?: string;
  status_robo: string; ultima_mensagem: string; data_cadastro: string;
}
export interface Notificacao { id: number; texto: string; tipo: 'info' | 'sucesso' | 'aviso'; lida: boolean; hora: string; }
export interface MensagemChat { texto: string; origem: 'paciente' | 'ia_ou_recepcao' | 'sistema'; data: string; }
export interface PacienteChat { telefone: string; nome_paciente: string; bloquearEnvio: boolean; }
