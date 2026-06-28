-- ============================================================
-- OTOFLOW CRM — Script de criação do banco de dados
-- Execute uma única vez no seu PostgreSQL antes de subir o servidor
-- ============================================================

-- ─── Contatos / Leads WhatsApp ───────────────────────────────
CREATE TABLE IF NOT EXISTS contatos_whatsapp (
  id              SERIAL PRIMARY KEY,
  telefone        VARCHAR(20) UNIQUE NOT NULL,
  nome_titular    VARCHAR(255),
  cpf_titular     VARCHAR(20),
  status_robo     VARCHAR(50) DEFAULT 'Robô',
  ultima_mensagem TIMESTAMPTZ DEFAULT NOW(),
  data_cadastro   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Agendamentos / Kanban ───────────────────────────────────
CREATE TABLE IF NOT EXISTS agendamentos (
  id                  SERIAL PRIMARY KEY,
  contato_id          INTEGER REFERENCES contatos_whatsapp(id) ON DELETE SET NULL,
  nome_paciente       VARCHAR(255) NOT NULL,
  cpf_paciente        VARCHAR(20),
  nascimento_paciente DATE,
  para_terceiro       BOOLEAN DEFAULT FALSE,
  nome_titular        VARCHAR(255),
  intencao            VARCHAR(255),
  especialidade       VARCHAR(255),
  unidade             VARCHAR(255),
  pagamento           VARCHAR(100),
  periodo_atendimento VARCHAR(100),
  nome_medico         VARCHAR(255),
  medico_final        VARCHAR(255),
  tipo_consulta       VARCHAR(100),
  observacoes         TEXT,
  status_atendimento  VARCHAR(50) DEFAULT 'PENDENTE',
  atendente_nome      VARCHAR(255),
  data_consulta       DATE,
  hora_consulta       TIME,
  data_atendimento    TIMESTAMPTZ,
  data_cancelamento   TIMESTAMPTZ,
  data_atualizacao    TIMESTAMPTZ,
  data_criacao        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Usuários do sistema ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  senha_hash  VARCHAR(255) NOT NULL,
  papel       VARCHAR(50) NOT NULL DEFAULT 'recepcao',
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Médicos / Corpo clínico ─────────────────────────────────
CREATE TABLE IF NOT EXISTS medicos (
  id                  SERIAL PRIMARY KEY,
  nome                VARCHAR(255) NOT NULL,
  unidade             VARCHAR(255),
  inicio_expediente   TIME,
  fim_expediente      TIME,
  inicio_almoco       TIME,
  fim_almoco          TIME,
  duracao_consulta    INTEGER DEFAULT 30,
  criado_em           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Chat / Mensagens WhatsApp ───────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id          SERIAL PRIMARY KEY,
  session_id  VARCHAR(100) NOT NULL,
  message     JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Modelos de mensagem ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS modelos_mensagem (
  id             SERIAL PRIMARY KEY,
  titulo         VARCHAR(255) NOT NULL,
  texto          TEXT NOT NULL,
  criado_por_id  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Auditoria ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auditoria_log (
  id            SERIAL PRIMARY KEY,
  usuario_id    INTEGER,
  usuario_nome  VARCHAR(255),
  acao          VARCHAR(100) NOT NULL,
  entidade      VARCHAR(100),
  entidade_id   INTEGER,
  detalhes      JSONB,
  ip            VARCHAR(45),
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Refresh Tokens ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL,
  token_hash  VARCHAR(255) UNIQUE NOT NULL,
  expira_em   TIMESTAMPTZ NOT NULL,
  criado_em   TIMESTAMPTZ DEFAULT NOW(),
  revogado    BOOLEAN DEFAULT FALSE
);

-- ─── Índices de performance ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_agendamentos_status    ON agendamentos (status_atendimento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_criacao   ON agendamentos (data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_agendamentos_contato   ON agendamentos (contato_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_medico    ON agendamentos (medico_final);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_cons ON agendamentos (data_consulta);
CREATE INDEX IF NOT EXISTS idx_contatos_telefone      ON contatos_whatsapp (telefone);
CREATE INDEX IF NOT EXISTS idx_contatos_status_robo   ON contatos_whatsapp (status_robo);
CREATE INDEX IF NOT EXISTS idx_chat_session           ON chat_messages (session_id);
CREATE INDEX IF NOT EXISTS idx_chat_created           ON chat_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario      ON auditoria_log (usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_criacao      ON auditoria_log (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_contatos_ultima_mensagem ON contatos_whatsapp (ultima_mensagem DESC);
CREATE INDEX IF NOT EXISTS idx_contatos_status_ultima   ON contatos_whatsapp (status_robo, ultima_mensagem DESC);
CREATE INDEX IF NOT EXISTS idx_agendamentos_nome_medico ON agendamentos (nome_medico);

-- ─── Usuário admin inicial ───────────────────────────────────
-- Senha padrão: Admin@123 (TROQUE IMEDIATAMENTE após o primeiro login)
-- Hash bcrypt gerado com saltRounds=12
INSERT INTO usuarios (nome, email, senha_hash, papel)
VALUES (
  'Administrador',
  'admin@clinica.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oW7AqMRGm',
  'admin'
)
ON CONFLICT (email) DO NOTHING;
