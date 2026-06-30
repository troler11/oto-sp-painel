// ============================================================
// OTOFLOW CRM - BACKEND MELHORADO
// Melhorias: paginação, cache, logs estruturados, índices,
// refresh token, auditoria, validação robusta
// ============================================================

require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server: SocketServer } = require('socket.io');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const app = express();

// ============================================================
// CONFIGURAÇÕES BÁSICAS
// ============================================================
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://*.whatsapp.net'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Requisições sem Origin (server-to-server, curl, etc.) são permitidas
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('CORS: Origem não autorizada.'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ============================================================
// LOGGER ESTRUTURADO
// ============================================================
const LOG_LEVELS = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
const LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

const logger = {
  _log: (level, message, meta = {}) => {
    if (LOG_LEVELS[level] > LOG_LEVEL) return;
    const entry = {
      ts: new Date().toISOString(),
      level,
      message,
      ...meta
    };
    const out = JSON.stringify(entry);
    if (level === 'ERROR') return console.error(out);
    if (level === 'WARN')  return console.warn(out);
    console.log(out);
  },
  info:  (msg, meta) => logger._log('INFO', msg, meta),
  warn:  (msg, meta) => logger._log('WARN', msg, meta),
  error: (msg, meta) => logger._log('ERROR', msg, meta),
  debug: (msg, meta) => logger._log('DEBUG', msg, meta),
};

// ============================================================
// CACHE SIMPLES EM MEMÓRIA (para rotas de leitura frequente)
// ============================================================
const cache = new Map();

const setCache = (key, value, ttlMs = 60_000) => {
  cache.set(key, { value, expiry: Date.now() + ttlMs });
};

const getCache = (key) => {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) { cache.delete(key); return null; }
  return item.value;
};

const clearCache = (prefix) => {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
};

// ============================================================
// RATE LIMITING
// ============================================================
const limiterGeral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500,
  message: { erro: 'Excesso de requisições. Tente novamente em 15 minutos.' }
});
app.use('/api/', limiterGeral);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { erro: 'Muitas tentativas de login. Bloqueado por 15 minutos.' }
});

// ============================================================
// VARIÁVEIS DE AMBIENTE
// ============================================================
const WAHA_API_URL    = process.env.WAHA_API_URL;
const WAHA_SESSION    = process.env.WAHA_SESSION || 'teste';
const WAHA_API_KEY    = process.env.WAHA_API_KEY;
const WAHA_BASE_URL   = WAHA_API_URL ? (() => { try { return new URL(WAHA_API_URL).origin; } catch { return null; } })() : null;
const JWT_SECRET      = process.env.JWT_SECRET;
const REFRESH_SECRET  = process.env.REFRESH_SECRET;
const WEBHOOK_SECRET  = process.env.WEBHOOK_SECRET;
const ITSAUDE_LOGIN   = process.env.ITSAUDE_LOGIN;
const ITSAUDE_SENHA   = process.env.ITSAUDE_SENHA;

if (!JWT_SECRET || !REFRESH_SECRET) {
  console.error(JSON.stringify({ level: 'ERROR', message: 'JWT_SECRET e REFRESH_SECRET devem estar definidos nas variáveis de ambiente. O servidor não iniciará sem eles.' }));
  process.exit(1);
}

// ============================================================
// HTTP SERVER + SOCKET.IO
// ============================================================
const server = http.createServer(app);

const io = new SocketServer(server, {
  cors: {
    origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : false,
    credentials: true,
  },
});

io.use((socket, next) => {
  const cookieHeader = socket.handshake.headers.cookie || '';
  const tokenCookie = cookieHeader.split(';').find(c => c.trim().startsWith('token='));
  const token = tokenCookie ? decodeURIComponent(tokenCookie.trim().slice('token='.length)) : null;
  if (!token) return next(new Error('Não autenticado'));
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Token inválido'));
    socket.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  logger.debug('Socket conectado', { usuario: socket.user?.nome });
  socket.on('disconnect', () => logger.debug('Socket desconectado', { usuario: socket.user?.nome }));
});

app.set('io', io);

// ============================================================
// POSTGRESQL
// ============================================================
const pool = new Pool({
  user:     process.env.DB_USER,
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  // Pool ajustado para produção
  min: 3,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) logger.error('Falha ao conectar ao PostgreSQL', { message: err.message });
  else logger.info('Conectado ao PostgreSQL', { time: res.rows[0].now });
});

// ============================================================
// CRIAÇÃO AUTOMÁTICA DE ÍNDICES (melhora performance)
// ============================================================
const criarIndices = async () => {
  const indices = [
    `CREATE INDEX IF NOT EXISTS idx_agendamentos_status     ON agendamentos (status_atendimento)`,
    `CREATE INDEX IF NOT EXISTS idx_agendamentos_criacao    ON agendamentos (data_criacao DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_agendamentos_contato    ON agendamentos (contato_id)`,
    `CREATE INDEX IF NOT EXISTS idx_agendamentos_medico     ON agendamentos (medico_final)`,
    `CREATE INDEX IF NOT EXISTS idx_agendamentos_data_cons  ON agendamentos (data_consulta)`,
    `CREATE INDEX IF NOT EXISTS idx_contatos_telefone       ON contatos_whatsapp (telefone)`,
    `CREATE INDEX IF NOT EXISTS idx_contatos_status_robo    ON contatos_whatsapp (status_robo)`,
    `CREATE INDEX IF NOT EXISTS idx_chat_session            ON chat_messages (session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_chat_session_pattern    ON chat_messages (session_id text_pattern_ops)`,
    `CREATE INDEX IF NOT EXISTS idx_chat_created            ON chat_messages (created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_auditoria_usuario       ON auditoria_log (usuario_id)`,
    `CREATE INDEX IF NOT EXISTS idx_auditoria_criacao       ON auditoria_log (criado_em DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_contatos_ultima_mensagem ON contatos_whatsapp (ultima_mensagem DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_contatos_status_ultima   ON contatos_whatsapp (status_robo, ultima_mensagem DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_agendamentos_nome_medico ON agendamentos (nome_medico)`,
  ];
  for (const sql of indices) {
    try { await pool.query(sql); }
    catch (e) { logger.warn('Índice já existe ou erro', { sql, error: e.message }); }
  }
  logger.info('Índices verificados/criados com sucesso.');
};

// ============================================================
// TABELAS NOVAS: AUDITORIA + REFRESH TOKENS
// ============================================================
const criarTabelasExtras = async () => {
  try {
    await pool.query(`
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
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id          SERIAL PRIMARY KEY,
        usuario_id  INTEGER NOT NULL,
        token_hash  VARCHAR(255) UNIQUE NOT NULL,
        expira_em   TIMESTAMPTZ NOT NULL,
        criado_em   TIMESTAMPTZ DEFAULT NOW(),
        revogado    BOOLEAN DEFAULT FALSE
      )
    `);

    // Adiciona coluna 'usuario' (login) se ainda não existir
    await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS usuario VARCHAR(100)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios (usuario) WHERE usuario IS NOT NULL`);
    // Remove restrição NOT NULL do email (campo opcional nas novas contas)
    await pool.query(`ALTER TABLE usuarios ALTER COLUMN email DROP NOT NULL`);
    // Resincroniza o sequence do id caso tenha sido inserido manualmente
    await pool.query(`SELECT setval(pg_get_serial_sequence('usuarios', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM usuarios`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS mensagens_midia (
        id               SERIAL PRIMARY KEY,
        mimetype         VARCHAR(100) NOT NULL,
        conteudo_base64  TEXT NOT NULL,
        data_criacao     TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_limpo (
        id       SERIAL PRIMARY KEY,
        telefone VARCHAR(20) NOT NULL,
        texto    TEXT NOT NULL,
        origem   VARCHAR(30) NOT NULL,
        midia_id INTEGER REFERENCES mensagens_midia(id),
        data     TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_limpo_tel_data ON chat_limpo (telefone, data ASC)`);

    logger.info('Tabelas de auditoria e refresh tokens verificadas.');
  } catch (e) {
    logger.error('Erro ao criar tabelas extras', { error: e.message });
  }
};

// Inicializa índices e tabelas ao arrancar
(async () => {
  await criarTabelasExtras();
  await criarIndices();
})();

// ============================================================
// HELPER: REGISTAR AUDITORIA
// ============================================================
const registarAuditoria = async ({ usuario_id, usuario_nome, acao, entidade, entidade_id, detalhes, ip }) => {
  try {
    await pool.query(
      `INSERT INTO auditoria_log (usuario_id, usuario_nome, acao, entidade, entidade_id, detalhes, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [usuario_id, usuario_nome, acao, entidade, entidade_id, JSON.stringify(detalhes || {}), ip]
    );
  } catch (e) {
    logger.warn('Erro ao registar auditoria', { error: e.message });
  }
};

// ============================================================
// VALIDAÇÃO (substituição simples de joi/zod)
// ============================================================
const validar = {
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '')),
  minLen: (v, n) => String(v || '').trim().length >= n,
  numero: (v, min = 0) => !isNaN(Number(v)) && Number(v) >= min,
  time:   (v) => !v || /^\d{2}:\d{2}(:\d{2})?$/.test(String(v)),
  date:   (v) => !v || !isNaN(Date.parse(String(v))),
};

// ============================================================
// MIDDLEWARE: VERIFICAR TOKEN JWT
// ============================================================
const verificarToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(403).json({ erro: 'Acesso negado. Token não fornecido.' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') return res.status(401).json({ erro: 'Sessão expirada.', expirado: true });
      return res.status(401).json({ erro: 'Token inválido.' });
    }
    req.user = decoded;
    next();
  });
};

// ============================================================
// MIDDLEWARE: LOG DE REQUISIÇÕES
// ============================================================
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api/')) {
      logger.info('HTTP', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - start,
        ip: req.ip,
      });
    }
  });
  next();
});

// ============================================================
// WEBHOOK PARA RECEBER MENSAGENS
// ============================================================
app.post('/api/webhook/receber', async (req, res) => {
  const tokenFornecido = req.headers['x-webhook-secret'];

  if (!WEBHOOK_SECRET) {
    logger.error('WEBHOOK_SECRET não configurado');
    return res.status(500).json({ erro: 'Erro de configuração.' });
  }

  const secretValido = (() => {
    if (!tokenFornecido) return false;
    try {
      const a = Buffer.from(WEBHOOK_SECRET);
      const b = Buffer.from(tokenFornecido);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch { return false; }
  })();

  if (!secretValido) {
    logger.warn('Bloqueio no Webhook. Token inválido.', { ip: req.ip });
    return res.status(401).json({ erro: 'Não autorizado.' });
  }

  try {
    const body = req.body;
    let telefoneRaw = '', texto = '', fromMe = false;
    let midiaMimetype = null, midiaBase64 = null;

    if (body.event === 'message' && body.payload) {
      telefoneRaw = body.payload.from;
      texto = body.payload.body || '';
      fromMe = body.payload.fromMe;
      if (body.payload.hasMedia && body.payload.media?.data) {
        midiaMimetype = body.payload.media.mimetype || 'application/octet-stream';
        midiaBase64 = body.payload.media.data;
      }
    } else if (body.data?.message) {
      telefoneRaw = body.data.key?.remoteJid;
      texto = body.data.message?.conversation || body.data.message?.extendedTextMessage?.text || '';
      fromMe = body.data.key?.fromMe;
    } else if (body.telefone && body.texto) {
      telefoneRaw = body.telefone;
      texto = body.texto;
    }

    if (!telefoneRaw || fromMe || (!texto && !midiaBase64)) return res.json({ status: 'Ignorado' });

    // Extrai apenas os dígitos iniciais — ignora sufixos como -v23-UUID ou @s.whatsapp.net
    const telefoneLimpo = telefoneRaw.match(/^\d+/)?.[0] || '';
    const { rows } = await pool.query(
      'SELECT status_robo FROM contatos_whatsapp WHERE telefone = $1',
      [telefoneLimpo]
    );

    if (rows.length > 0) {
      if (rows[0].status_robo === 'Humano' || rows[0].status_robo === 'Bloqueado') {
        let midia_id = null;
        if (midiaBase64 && midiaMimetype) {
          const midiaRes = await pool.query(
            'INSERT INTO mensagens_midia (mimetype, conteudo_base64) VALUES ($1, $2) RETURNING id',
            [midiaMimetype, midiaBase64]
          );
          midia_id = midiaRes.rows[0].id;
        }
        const msgData = { type: 'human', content: texto || '', additional_kwargs: midia_id ? { midia_id } : {} };
        const { rows: [{ created_at: msgCreatedAt }] } = await pool.query(
          'INSERT INTO chat_messages (session_id, message) VALUES ($1, $2) RETURNING created_at',
          [`${telefoneLimpo}@s.whatsapp.net`, JSON.stringify(msgData)]
        );
        await pool.query(
          'INSERT INTO chat_limpo (telefone, texto, origem, midia_id) VALUES ($1, $2, $3, $4)',
          [telefoneLimpo, texto || '', 'paciente', midia_id || null]
        );
        await pool.query(
          'UPDATE contatos_whatsapp SET ultima_mensagem = NOW() WHERE telefone = $1',
          [telefoneLimpo]
        );
        req.app.get('io')?.emit('mensagem:nova', { telefone: telefoneLimpo, texto, created_at: msgCreatedAt });
      } else {
        // Bot mode: atualiza ultima_mensagem e desfaz 'concluido' se o bot já havia
        // encerrado o fluxo — sem isso o contato seria bloqueado pelo filtro do frontend
        await pool.query(
          `UPDATE contatos_whatsapp
           SET ultima_mensagem = NOW(),
               sessao_intencao = CASE WHEN sessao_intencao = 'concluido' THEN 'triagem' ELSE sessao_intencao END
           WHERE telefone = $1`,
          [telefoneLimpo]
        );
      }
    }

    res.json({ sucesso: true });
  } catch (err) {
    logger.error('Erro no Webhook', { error: err.message });
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ============================================================
// WEBHOOK — SALVA MENSAGEM MESMO EM MODO ROBÔ
// Usar este endpoint nos fluxos N8N onde o histórico do bot deve
// aparecer no chat do staff (ex: confirmação de consulta, triagem ativa).
// ============================================================
app.post('/api/webhook/receber-robo', async (req, res) => {
  const tokenFornecido = req.headers['x-webhook-secret'];

  if (!WEBHOOK_SECRET) {
    logger.error('WEBHOOK_SECRET não configurado');
    return res.status(500).json({ erro: 'Erro de configuração.' });
  }

  const secretValido = (() => {
    if (!tokenFornecido) return false;
    try {
      const a = Buffer.from(WEBHOOK_SECRET);
      const b = Buffer.from(tokenFornecido);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch { return false; }
  })();

  if (!secretValido) {
    logger.warn('Bloqueio no Webhook Robô. Token inválido.', { ip: req.ip });
    return res.status(401).json({ erro: 'Não autorizado.' });
  }

  try {
    const body = req.body;
    let telefoneRaw = '', texto = '', fromMe = false;
    let midiaMimetype = null, midiaBase64 = null;

    if (body.event === 'message' && body.payload) {
      telefoneRaw = body.payload.from;
      texto = body.payload.body || '';
      fromMe = body.payload.fromMe;
      if (body.payload.hasMedia && body.payload.media?.data) {
        midiaMimetype = body.payload.media.mimetype || 'application/octet-stream';
        midiaBase64 = body.payload.media.data;
      }
    } else if (body.data?.message) {
      telefoneRaw = body.data.key?.remoteJid;
      texto = body.data.message?.conversation || body.data.message?.extendedTextMessage?.text || '';
      fromMe = body.data.key?.fromMe;
    } else if (body.telefone && body.texto) {
      telefoneRaw = body.telefone;
      texto = body.texto;
    }

    if (!telefoneRaw || fromMe || (!texto && !midiaBase64)) return res.json({ status: 'Ignorado' });

    const telefoneLimpo = telefoneRaw.match(/^\d+/)?.[0] || '';

    // Salva a mensagem independente do status_robo (Robô, Humano ou Bloqueado)
    let midia_id = null;
    if (midiaBase64 && midiaMimetype) {
      const midiaRes = await pool.query(
        'INSERT INTO mensagens_midia (mimetype, conteudo_base64) VALUES ($1, $2) RETURNING id',
        [midiaMimetype, midiaBase64]
      );
      midia_id = midiaRes.rows[0].id;
    }

    const msgData = { type: 'human', content: texto || '', additional_kwargs: midia_id ? { midia_id } : {} };
    const { rows: [{ created_at: msgCreatedAt }] } = await pool.query(
      'INSERT INTO chat_messages (session_id, message) VALUES ($1, $2) RETURNING created_at',
      [`${telefoneLimpo}@s.whatsapp.net`, JSON.stringify(msgData)]
    );
    await pool.query(
      'INSERT INTO chat_limpo (telefone, texto, origem, midia_id) VALUES ($1, $2, $3, $4)',
      [telefoneLimpo, texto || '', 'paciente', midia_id || null]
    );
    await pool.query(
      `UPDATE contatos_whatsapp
       SET ultima_mensagem = NOW(),
           sessao_intencao = CASE WHEN sessao_intencao = 'concluido' THEN 'triagem' ELSE sessao_intencao END
       WHERE telefone = $1`,
      [telefoneLimpo]
    );

    req.app.get('io')?.emit('mensagem:nova', { telefone: telefoneLimpo, texto, created_at: msgCreatedAt });

    res.json({ sucesso: true });
  } catch (err) {
    logger.error('Erro no Webhook Robô', { error: err.message });
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ============================================================
// WEBHOOK — SALVA COMO MENSAGEM ENVIADA PELO STAFF/BOT (lado direito do chat)
// Usar quando o N8N envia uma mensagem em nome do bot e quer que apareça
// no chat como se fosse o atendente/sistema enviando.
// ============================================================
app.post('/api/webhook/receber-enviado', async (req, res) => {
  const tokenFornecido = req.headers['x-webhook-secret'];

  if (!WEBHOOK_SECRET) {
    logger.error('WEBHOOK_SECRET não configurado');
    return res.status(500).json({ erro: 'Erro de configuração.' });
  }

  const secretValido = (() => {
    if (!tokenFornecido) return false;
    try {
      const a = Buffer.from(WEBHOOK_SECRET);
      const b = Buffer.from(tokenFornecido);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch { return false; }
  })();

  if (!secretValido) {
    logger.warn('Bloqueio no Webhook Enviado. Token inválido.', { ip: req.ip });
    return res.status(401).json({ erro: 'Não autorizado.' });
  }

  try {
    const body = req.body;
    let telefoneRaw = '', texto = '';
    let midiaMimetype = null, midiaBase64 = null;

    // Formato WAHA nativo (fromMe=true — mensagem enviada pelo sistema)
    if (body.event === 'message' && body.payload) {
      telefoneRaw = body.payload.to || body.payload.from;
      texto = body.payload.body || '';
      if (body.payload.hasMedia && body.payload.media?.data) {
        midiaMimetype = body.payload.media.mimetype || 'application/octet-stream';
        midiaBase64 = body.payload.media.data;
      }
    } else if (body.data?.message) {
      telefoneRaw = body.data.key?.remoteJid;
      texto = body.data.message?.conversation || body.data.message?.extendedTextMessage?.text || '';
    } else if (body.telefone && body.texto) {
      telefoneRaw = body.telefone;
      texto = body.texto;
    }

    if (!telefoneRaw || (!texto && !midiaBase64)) return res.json({ status: 'Ignorado' });

    const telefoneLimpo = telefoneRaw.match(/^\d+/)?.[0] || '';

    // Ignora números fora do padrão brasileiro (55 + DDD + número = 12 ou 13 dígitos)
    if (!/^55\d{10,11}$/.test(telefoneLimpo)) return res.json({ status: 'Ignorado' });

    // Dedup: ignora se o mesmo texto já foi salvo nos últimos 5s (enviado pelo chat do OtoFlow)
    if (texto) {
      const { rows: jaExiste } = await pool.query(
        `SELECT 1 FROM chat_limpo
         WHERE telefone = $1 AND texto = $2 AND origem = 'ia_ou_recepcao'
         AND data > NOW() - INTERVAL '5 seconds' LIMIT 1`,
        [telefoneLimpo, texto]
      );
      if (jaExiste.length > 0) return res.json({ status: 'Ignorado' });
    }

    let midia_id = null;
    if (midiaBase64 && midiaMimetype) {
      const midiaRes = await pool.query(
        'INSERT INTO mensagens_midia (mimetype, conteudo_base64) VALUES ($1, $2) RETURNING id',
        [midiaMimetype, midiaBase64]
      );
      midia_id = midiaRes.rows[0].id;
    }

    // type: 'ai' → aparece no lado direito do chat (como staff/bot)
    const msgData = { type: 'ai', content: texto || '', additional_kwargs: { sender: 'Bot', ...(midia_id ? { midia_id } : {}) } };
    const { rows: [{ created_at: msgCreatedAt }] } = await pool.query(
      'INSERT INTO chat_messages (session_id, message) VALUES ($1, $2) RETURNING created_at',
      [`${telefoneLimpo}@s.whatsapp.net`, JSON.stringify(msgData)]
    );
    await pool.query(
      'INSERT INTO chat_limpo (telefone, texto, origem, midia_id) VALUES ($1, $2, $3, $4)',
      [telefoneLimpo, texto || '', 'ia_ou_recepcao', midia_id || null]
    );
    await pool.query(
      `INSERT INTO contatos_whatsapp (telefone, ultima_mensagem)
       VALUES ($1, NOW())
       ON CONFLICT (telefone) DO UPDATE SET ultima_mensagem = NOW()`,
      [telefoneLimpo]
    );

    req.app.get('io')?.emit('mensagem:nova', { telefone: telefoneLimpo, texto, origem: 'ia_ou_recepcao', created_at: msgCreatedAt });

    res.json({ sucesso: true });
  } catch (err) {
    logger.error('Erro no Webhook Enviado', { error: err.message });
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// ============================================================
// AUTH: LOGIN + REFRESH TOKEN
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'OtoFlow Operacional', ts: new Date().toISOString() });
});

app.post('/api/login', loginLimiter, async (req, res) => {
  const { email, senha } = req.body;

  if (!validar.minLen(email, 1) || !validar.minLen(senha, 1)) {
    return res.status(400).json({ erro: 'Usuário ou senha inválidos.' });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE usuario = $1 OR email = $1 OR nome = $1', [email]);
    if (rows.length === 0) return res.status(401).json({ erro: 'Dados incorretos.' });

    const usuario = rows[0];
    if (!await bcrypt.compare(senha, usuario.senha_hash)) {
      logger.warn('Tentativa de login falhada', { login: email, ip: req.ip });
      return res.status(401).json({ erro: 'Dados incorretos.' });
    }

    const payload = { id: usuario.id, email: usuario.email, nome: usuario.nome, usuario: usuario.usuario, papel: usuario.papel };

    // Access token: 12h
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

    // Refresh token: 7 dias
    const refreshToken = jwt.sign({ id: usuario.id }, REFRESH_SECRET, { expiresIn: '7d' });
    const refreshHash = await bcrypt.hash(refreshToken, 8);
    const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO refresh_tokens (usuario_id, token_hash, expira_em) VALUES ($1, $2, $3)`,
      [usuario.id, refreshHash, expiraEm]
    );

    await registarAuditoria({
      usuario_id: usuario.id, usuario_nome: usuario.nome,
      acao: 'LOGIN', entidade: 'usuarios', entidade_id: usuario.id,
      detalhes: { email }, ip: req.ip
    });

    const cookieBase = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' };
    res.cookie('token', token, { ...cookieBase, maxAge: 12 * 60 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...cookieBase, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/refresh-token' });

    res.json({ usuario: { email: usuario.email, nome: usuario.nome, usuario: usuario.usuario, papel: usuario.papel } });
  } catch (err) {
    logger.error('Erro no login', { error: err.message });
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

app.post('/api/refresh-token', async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) return res.status(400).json({ erro: 'Refresh token não fornecido.' });

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

    // Verifica se o token existe e não foi revogado
    const { rows } = await pool.query(
      `SELECT rt.*, u.email, u.nome, u.usuario, u.papel
       FROM refresh_tokens rt
       JOIN usuarios u ON u.id = rt.usuario_id
       WHERE rt.usuario_id = $1 AND rt.revogado = false AND rt.expira_em > NOW()
       ORDER BY rt.criado_em DESC LIMIT 10`,
      [decoded.id]
    );

    // Verifica hash
    let tokenValido = null;
    for (const row of rows) {
      if (await bcrypt.compare(refreshToken, row.token_hash)) {
        tokenValido = row; break;
      }
    }

    if (!tokenValido) return res.status(401).json({ erro: 'Refresh token inválido ou expirado.' });

    const novoToken = jwt.sign(
      { id: tokenValido.usuario_id, email: tokenValido.email, nome: tokenValido.nome, usuario: tokenValido.usuario, papel: tokenValido.papel },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.cookie('token', novoToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 12 * 60 * 60 * 1000,
    });

    res.json({ sucesso: true });
  } catch (err) {
    logger.warn('Refresh token inválido', { error: err.message });
    res.status(401).json({ erro: 'Token inválido.' });
  }
});

app.post('/api/logout', verificarToken, async (req, res) => {
  try {
    // Revoga todos os refresh tokens do utilizador
    await pool.query(
      'UPDATE refresh_tokens SET revogado = true WHERE usuario_id = $1',
      [req.user.id]
    );
    await registarAuditoria({
      usuario_id: req.user.id, usuario_nome: req.user.nome,
      acao: 'LOGOUT', entidade: 'usuarios', entidade_id: req.user.id,
      ip: req.ip
    });
    res.clearCookie('token');
    res.clearCookie('refresh_token', { path: '/api/refresh-token' });
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao fazer logout.' });
  }
});

app.get('/api/me', verificarToken, (req, res) => {
  res.json({ usuario: req.user });
});

// ============================================================
// AUDITORIA (Admin/Gerente)
// ============================================================
app.get('/api/auditoria', verificarToken, async (req, res) => {
  if (!['admin', 'gerente'].includes(req.user.papel)) {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }

  const page  = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, parseInt(req.query.limit || '50', 10));
  const offset = (page - 1) * limit;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM auditoria_log ORDER BY criado_em DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const { rows: total } = await pool.query('SELECT COUNT(*) FROM auditoria_log');
    res.json({ dados: rows, total: parseInt(total[0].count), page, limit });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar auditoria.' });
  }
});

// ============================================================
// GESTÃO DE USUÁRIOS
// ============================================================
app.post('/api/usuarios', verificarToken, async (req, res) => {
  if (!['admin', 'gerente'].includes(req.user.papel)) {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }

  const { nome, usuario, senha, papel } = req.body;

  const erros = [];
  if (!validar.minLen(nome, 2))      erros.push('Nome deve ter pelo menos 2 caracteres.');
  if (!validar.minLen(usuario, 2))   erros.push('Usuário deve ter pelo menos 2 caracteres.');
  if (/\s/.test(usuario))            erros.push('Usuário não pode conter espaços.');
  if (!validar.minLen(senha, 6))     erros.push('Senha deve ter pelo menos 6 caracteres.');
  if (!['recepcao', 'gerente'].includes(papel)) erros.push('Papel inválido.');
  if (erros.length) return res.status(400).json({ erro: erros.join(' ') });

  try {
    const checkUsuario = await pool.query('SELECT id FROM usuarios WHERE usuario = $1', [usuario.toLowerCase().trim()]);
    if (checkUsuario.rows.length > 0) return res.status(400).json({ erro: 'Nome de usuário já em uso.' });

    const senhaHash = await bcrypt.hash(senha, 12);
    const { rows } = await pool.query(
      'INSERT INTO usuarios (nome, usuario, senha_hash, papel) VALUES ($1, $2, $3, $4) RETURNING id',
      [nome.trim(), usuario.toLowerCase().trim(), senhaHash, papel]
    );

    await registarAuditoria({
      usuario_id: req.user.id, usuario_nome: req.user.nome,
      acao: 'CRIAR_USUARIO', entidade: 'usuarios', entidade_id: rows[0].id,
      detalhes: { nome, usuario, papel }, ip: req.ip
    });

    res.json({ sucesso: true, mensagem: 'Conta criada com sucesso!' });
  } catch (err) {
    logger.error('Erro ao criar utilizador', { error: err.message });
    res.status(500).json({ erro: 'Erro ao criar utilizador.' });
  }
});

app.get('/api/usuarios', verificarToken, async (req, res) => {
  if (!['admin', 'gerente'].includes(req.user.papel)) {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }
  try {
    const { rows } = await pool.query('SELECT id, nome, usuario, papel FROM usuarios ORDER BY nome ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar utilizadores.' });
  }
});

app.put('/api/usuarios/:id', verificarToken, async (req, res) => {
  if (!['admin', 'gerente'].includes(req.user.papel)) return res.status(403).json({ erro: 'Acesso negado.' });
  const { id } = req.params;
  const { nome } = req.body;
  if (!validar.minLen(nome, 2)) return res.status(400).json({ erro: 'Nome inválido.' });
  try {
    await pool.query('UPDATE usuarios SET nome = $1 WHERE id = $2', [nome.trim(), id]);
    await registarAuditoria({
      usuario_id: req.user.id, usuario_nome: req.user.nome,
      acao: 'EDITAR_USUARIO', entidade: 'usuarios', entidade_id: parseInt(id),
      detalhes: { nome }, ip: req.ip
    });
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar.' });
  }
});

app.put('/api/usuarios/:id/senha', verificarToken, async (req, res) => {
  if (!['admin', 'gerente'].includes(req.user.papel)) return res.status(403).json({ erro: 'Acesso negado.' });
  const { id } = req.params;
  const { novaSenha } = req.body;
  if (!validar.minLen(novaSenha, 6)) return res.status(400).json({ erro: 'Senha deve ter pelo menos 6 caracteres.' });
  try {
    const senhaHash = await bcrypt.hash(novaSenha, 12);
    await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [senhaHash, id]);
    // Revoga refresh tokens antigos ao trocar senha
    await pool.query('UPDATE refresh_tokens SET revogado = true WHERE usuario_id = $1', [id]);
    await registarAuditoria({
      usuario_id: req.user.id, usuario_nome: req.user.nome,
      acao: 'ALTERAR_SENHA', entidade: 'usuarios', entidade_id: parseInt(id),
      ip: req.ip
    });
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao alterar senha.' });
  }
});

app.delete('/api/usuarios/:id', verificarToken, async (req, res) => {
  if (!['admin', 'gerente'].includes(req.user.papel)) return res.status(403).json({ erro: 'Acesso negado.' });
  const id = req.params.id;
  if (parseInt(id) === req.user.id) return res.status(400).json({ erro: 'Não pode excluir a si mesmo.' });
  try {
    await pool.query('DELETE FROM refresh_tokens WHERE usuario_id = $1', [id]);
    await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
    await registarAuditoria({
      usuario_id: req.user.id, usuario_nome: req.user.nome,
      acao: 'EXCLUIR_USUARIO', entidade: 'usuarios', entidade_id: parseInt(id),
      ip: req.ip
    });
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir.' });
  }
});

// ============================================================
// MÉDICOS (com cache)
// ============================================================
app.get('/api/medicos', verificarToken, async (req, res) => {
  const cacheKey = 'medicos:todos';
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const { rows } = await pool.query('SELECT * FROM medicos ORDER BY nome ASC');
    setCache(cacheKey, rows, 5 * 60_000); // cache 5 min
    res.json(rows);
  } catch (err) {
    logger.error('Erro ao buscar médicos', { error: err.message });
    res.status(500).json({ erro: 'Erro ao buscar corpo clínico.' });
  }
});

app.post('/api/medicos', verificarToken, async (req, res) => {
  if (!['admin', 'gerente'].includes(req.user.papel)) {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }

  const { nome, unidade, inicio_expediente, fim_expediente, inicio_almoco, fim_almoco, duracao_consulta } = req.body;

  // Validação
  const erros = [];
  if (!validar.minLen(nome, 2))          erros.push('Nome inválido.');
  if (!validar.minLen(unidade, 2))       erros.push('Unidade inválida.');
  if (!validar.time(inicio_expediente))  erros.push('Horário de início inválido.');
  if (!validar.time(fim_expediente))     erros.push('Horário de fim inválido.');
  if (!validar.numero(duracao_consulta, 10)) erros.push('Duração mínima 10 min.');
  if (erros.length) return res.status(400).json({ erro: erros.join(' ') });

  try {
    const { rows } = await pool.query(
      `INSERT INTO medicos (nome, unidade, inicio_expediente, fim_expediente, inicio_almoco, fim_almoco, duracao_consulta)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nome.trim(), unidade, inicio_expediente, fim_expediente, inicio_almoco || null, fim_almoco || null, duracao_consulta || 30]
    );

    clearCache('medicos:');
    await registarAuditoria({
      usuario_id: req.user.id, usuario_nome: req.user.nome,
      acao: 'CRIAR_MEDICO', entidade: 'medicos', entidade_id: rows[0].id,
      detalhes: { nome, unidade }, ip: req.ip
    });

    res.json(rows[0]);
  } catch (err) {
    logger.error('Erro ao salvar médico', { error: err.message });
    res.status(500).json({ erro: 'Erro ao salvar médico.' });
  }
});

app.put('/api/medicos/:id', verificarToken, async (req, res) => {
  if (!['admin', 'gerente'].includes(req.user.papel)) {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }

  const { id } = req.params;
  const { nome, unidade, inicio_expediente, fim_expediente, inicio_almoco, fim_almoco, duracao_consulta } = req.body;

  if (!validar.minLen(nome, 2) || !validar.minLen(unidade, 2)) {
    return res.status(400).json({ erro: 'Nome e unidade são obrigatórios.' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE medicos SET nome=$1, unidade=$2, inicio_expediente=$3, fim_expediente=$4,
       inicio_almoco=$5, fim_almoco=$6, duracao_consulta=$7
       WHERE id=$8 RETURNING *`,
      [nome.trim(), unidade, inicio_expediente, fim_expediente, inicio_almoco, fim_almoco, duracao_consulta, id]
    );

    if (rows.length === 0) return res.status(404).json({ erro: 'Médico não encontrado.' });

    clearCache('medicos:');
    await registarAuditoria({
      usuario_id: req.user.id, usuario_nome: req.user.nome,
      acao: 'EDITAR_MEDICO', entidade: 'medicos', entidade_id: parseInt(id),
      detalhes: { nome, unidade }, ip: req.ip
    });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar médico.' });
  }
});

app.delete('/api/medicos/:id', verificarToken, async (req, res) => {
  if (!['admin', 'gerente'].includes(req.user.papel)) {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }

  try {
    const { rowCount } = await pool.query('DELETE FROM medicos WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ erro: 'Médico não encontrado.' });

    clearCache('medicos:');
    await registarAuditoria({
      usuario_id: req.user.id, usuario_nome: req.user.nome,
      acao: 'EXCLUIR_MEDICO', entidade: 'medicos', entidade_id: parseInt(req.params.id),
      ip: req.ip
    });

    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover médico.' });
  }
});

// ============================================================
// AGENDAMENTOS (com paginação)
// ============================================================
app.get('/api/agendamentos', verificarToken, async (req, res) => {
  // Paginação opcional: ?page=1&limit=100 (default sem limite para compatibilidade com o frontend)
  const page  = req.query.page  ? Math.max(1, parseInt(req.query.page, 10))   : null;
  const limit = req.query.limit ? Math.min(500, parseInt(req.query.limit, 10)) : null;
  const offset = page && limit ? (page - 1) * limit : null;

  // Filtros opcionais na query string
  const { status, medico, unidade, data_inicio, data_fim } = req.query;

  try {
    let where = [];
    let params = [];
    let pIdx = 1;

    if (status) { where.push(`a.status_atendimento = $${pIdx++}`); params.push(status); }
    if (medico) { where.push(`(a.medico_final ILIKE $${pIdx} OR a.nome_medico ILIKE $${pIdx})`); params.push(`%${medico}%`); pIdx++; }
    if (unidade) { where.push(`a.unidade ILIKE $${pIdx++}`); params.push(`%${unidade}%`); }
    if (data_inicio) { where.push(`a.data_criacao >= $${pIdx++}`); params.push(data_inicio); }
    if (data_fim)    { where.push(`a.data_criacao <= $${pIdx++}`); params.push(data_fim + 'T23:59:59'); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const query = `
      SELECT
        a.id, a.data_criacao, a.intencao, a.especialidade,
        a.unidade, a.pagamento, a.periodo_atendimento, a.nome_medico, a.observacoes,
        a.status_atendimento, a.nome_paciente, a.para_terceiro,
        a.atendente_nome, a.data_consulta, a.hora_consulta, a.medico_final,
        a.cpf_paciente, a.nascimento_paciente, a.tipo_consulta,
        a.data_atendimento, a.data_cancelamento,
        c.telefone, c.nome_titular, c.ultima_mensagem
      FROM agendamentos a
      LEFT JOIN contatos_whatsapp c ON a.contato_id = c.id
      ${whereClause}
      ORDER BY a.data_criacao DESC
      ${limit ? `LIMIT $${pIdx++} OFFSET $${pIdx++}` : ''}
    `;

    if (limit) { params.push(limit); params.push(offset); }

    const { rows } = await pool.query(query, params);

    if (page && limit) {
      const { rows: total } = await pool.query(
        `SELECT COUNT(*) FROM agendamentos a ${whereClause}`,
        params.slice(0, params.length - 2)
      );
      return res.json({ dados: rows, total: parseInt(total[0].count), page, limit });
    }

    res.json(rows);
  } catch (err) {
    logger.error('Erro ao buscar agendamentos', { error: err.message });
    res.status(500).json({ erro: 'Erro ao buscar agendamentos.' });
  }
});

// ============================================================
// LEADS
// ============================================================
app.get('/api/leads', verificarToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        c.id, c.telefone, c.nome_titular, c.nome_atendimento, c.cpf_titular, c.status_robo,
        c.ultima_mensagem, c.data_cadastro, c.sessao_intencao, c.classificacao_itsaude
      FROM contatos_whatsapp c
      WHERE
        NOT EXISTS (
          SELECT 1 FROM agendamentos a
          JOIN contatos_whatsapp c2 ON c2.id = a.contato_id
          WHERE c2.telefone = c.telefone
          AND a.status_atendimento IN ('PENDENTE', 'EM ATENDIMENTO')
        )
        AND (
          NOT EXISTS (
            SELECT 1 FROM agendamentos a
            JOIN contatos_whatsapp c2 ON c2.id = a.contato_id
            WHERE c2.telefone = c.telefone
          )
          OR
          c.ultima_mensagem > (
            SELECT MAX(COALESCE(a.data_atualizacao, a.data_criacao))
            FROM agendamentos a
            JOIN contatos_whatsapp c2 ON c2.id = a.contato_id
            WHERE c2.telefone = c.telefone
          )
        )
        AND c.status_robo != 'Bloqueado'
      ORDER BY c.ultima_mensagem DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar leads.' });
  }
});

app.get('/api/leads/:id/classificar-itsaude', verificarToken, async (req, res) => {
  if (!ITSAUDE_LOGIN || !ITSAUDE_SENHA) return res.json({ classificacao: null });

  const cacheKey = `itsaude-classif:${req.params.id}`;
  const cached = getCache(cacheKey);
  if (cached !== null) return res.json(cached);

  try {
    const leadRes = await pool.query('SELECT telefone FROM contatos_whatsapp WHERE id = $1', [req.params.id]);
    if (leadRes.rowCount === 0) return res.status(404).json({ erro: 'Lead não encontrado.' });

    const tel = leadRes.rows[0].telefone;
    const telLocal = tel.startsWith('55') ? tel.slice(2) : tel;

    let token = _itsaudeTokenExpira > Date.now() ? _itsaudeToken : await _loginItsaude();

    const buscarPaciente = (t) => fetch(
      `https://api.tisaude.com/api/patients?cellphone=${encodeURIComponent(telLocal)}`,
      { headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8_000) }
    );
    let pResp = await buscarPaciente(token);
    if (pResp.status === 401) { token = await _loginItsaude(); pResp = await buscarPaciente(token); }

    if (!pResp.ok) {
      const r = { classificacao: 'novo_lead' };
      await pool.query('UPDATE contatos_whatsapp SET classificacao_itsaude = $1 WHERE id = $2', [r.classificacao, req.params.id]);
      setCache(cacheKey, r, 30 * 60_000);
      return res.json(r);
    }

    const pData = await pResp.json();
    const paciente = Array.isArray(pData) ? pData[0] : (pData.data ? pData.data[0] : (pData.id ? pData : null));

    if (!paciente) {
      const r = { classificacao: 'novo_lead' };
      await pool.query('UPDATE contatos_whatsapp SET classificacao_itsaude = $1 WHERE id = $2', [r.classificacao, req.params.id]);
      setCache(cacheKey, r, 30 * 60_000);
      return res.json(r);
    }

    const doisAnosFuturo = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const cincoAnosAtras = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const tResp = await fetch(
      `https://api.tisaude.com/api/patients/${paciente.id}/timeline?startDate=${cincoAnosAtras}&endDate=${doisAnosFuturo}&page=1`,
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8_000) }
    );

    let totalConsultas = 0;
    if (tResp.ok) {
      const tData = await tResp.json();
      if (tData.next_page_url) {
        totalConsultas = -1; // há mais páginas = recorrente, sem contagem exata
      } else {
        for (const dia of (tData.data || [])) {
          for (const ev of (dia.data || [])) {
            if (ev.type !== 'appointment') continue;
            if ((ev.status?.name || '').toLowerCase().includes('desmarcado')) continue;
            totalConsultas++;
          }
        }
      }
    }

    const resultado = totalConsultas !== 0
      ? { classificacao: 'recorrente', nome_itsaude: paciente.name, ...(totalConsultas > 0 && { total_consultas: totalConsultas }) }
      : { classificacao: 'novo_paciente', nome_itsaude: paciente.name };

    await pool.query('UPDATE contatos_whatsapp SET classificacao_itsaude = $1 WHERE id = $2', [resultado.classificacao, req.params.id]);
    setCache(cacheKey, resultado, 30 * 60_000);
    res.json(resultado);
  } catch (err) {
    logger.error('Erro ao classificar lead no iTSaúde', { error: err.message });
    res.json({ classificacao: null });
  }
});

// ============================================================
// MODELOS DE MENSAGEM (com cache)
// ============================================================
app.get('/api/modelos', verificarToken, async (req, res) => {
  const cacheKey = 'modelos:todos';
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const { rows } = await pool.query('SELECT * FROM modelos_mensagem ORDER BY id ASC');
    setCache(cacheKey, rows, 2 * 60_000);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar modelos.' });
  }
});

app.post('/api/modelos', verificarToken, async (req, res) => {
  if (!['admin', 'gerente'].includes(req.user.papel)) {
    return res.status(403).json({ erro: 'Apenas gestores podem criar modelos.' });
  }
  const { titulo, texto } = req.body;
  if (!validar.minLen(titulo, 2) || !validar.minLen(texto, 2)) {
    return res.status(400).json({ erro: 'Título e texto são obrigatórios.' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO modelos_mensagem (titulo, texto, criado_por_id) VALUES ($1, $2, $3) RETURNING *',
      [titulo.trim(), texto.trim(), req.user.id]
    );
    clearCache('modelos:');
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao salvar modelo.' });
  }
});

app.put('/api/modelos/:id', verificarToken, async (req, res) => {
  if (!['admin', 'gerente'].includes(req.user.papel)) {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }
  const { titulo, texto } = req.body;
  if (!validar.minLen(titulo, 2) || !validar.minLen(texto, 2)) {
    return res.status(400).json({ erro: 'Título e texto são obrigatórios.' });
  }
  try {
    const { rows } = await pool.query(
      'UPDATE modelos_mensagem SET titulo=$1, texto=$2 WHERE id=$3 RETURNING *',
      [titulo.trim(), texto.trim(), req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Modelo não encontrado.' });
    clearCache('modelos:');
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar modelo.' });
  }
});

app.delete('/api/modelos/:id', verificarToken, async (req, res) => {
  if (!['admin', 'gerente'].includes(req.user.papel)) {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }
  try {
    await pool.query('DELETE FROM modelos_mensagem WHERE id = $1', [req.params.id]);
    clearCache('modelos:');
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover modelo.' });
  }
});

// ============================================================
// STATUS DE AGENDAMENTOS
// ============================================================
app.put('/api/status', verificarToken, async (req, res) => {
  const { id, status, atendente, observacoes, notificar, data_atendimento, data_cancelamento } = req.body;

  const statusValidos = ['PENDENTE', 'EM ATENDIMENTO', 'AGENDADO', 'CONFIRMADO', 'FINALIZADO', 'CANCELADO'];
  if (!statusValidos.includes(status)) {
    return res.status(400).json({ erro: 'Status inválido.' });
  }

  try {
    // Verificação de propriedade para recepcionistas
    if (req.user.papel === 'recepcao') {
      const check = await pool.query('SELECT atendente_nome FROM agendamentos WHERE id = $1', [id]);
      if (check.rows.length > 0 && check.rows[0].atendente_nome &&
          check.rows[0].atendente_nome !== req.user.nome && status !== 'PENDENTE') {
        return res.status(403).json({ erro: 'Não pode alterar um paciente assumido por outro colega.' });
      }
    }

    let query = 'UPDATE agendamentos SET status_atendimento = $1';
    let params = [status];
    let p = 2;

    if (status === 'PENDENTE') {
      query += `, atendente_nome = NULL`;
    } else if (atendente) {
      query += `, atendente_nome = $${p++}`; params.push(atendente);
    }

    if (observacoes)        { query += `, observacoes = $${p++}`;        params.push(observacoes); }
    if (data_atendimento)   { query += `, data_atendimento = $${p++}`;   params.push(data_atendimento); }
    if (data_cancelamento)  { query += `, data_cancelamento = $${p++}`;  params.push(data_cancelamento); }

    query += `, data_atualizacao = NOW()`;
    query += ` WHERE id = $${p} RETURNING contato_id, nome_paciente, especialidade, unidade, id_itsaude`;
    params.push(id);

    const { rows: agendados } = await pool.query(query, params);
    let avisoItsaude = null;

    // Assumir ficha → pausa o bot para a equipe poder conversar
    if (status === 'EM ATENDIMENTO' && agendados.length > 0) {
      await pool.query(
        `UPDATE contatos_whatsapp SET status_robo = 'Humano' WHERE id = $1`,
        [agendados[0].contato_id]
      );
    }

    // Devolver à fila → reativa o bot
    if (status === 'PENDENTE' && agendados.length > 0) {
      await pool.query(
        `UPDATE contatos_whatsapp SET status_robo = 'Robô' WHERE id = $1`,
        [agendados[0].contato_id]
      );
    }

    // Notificação WhatsApp para cancelamento
    if (status === 'CANCELADO' && agendados.length > 0) {
      const ag = agendados[0];
      const { rows: contatos } = await pool.query(
        `UPDATE contatos_whatsapp SET
          status_robo          = 'Robô',
          sessao_intencao      = 'triagem',
          sessao_rota          = 0,
          sessao_atualizada_em = NOW(),
          coleta_unidade       = '',
          coleta_data          = '',
          coleta_periodo       = '',
          coleta_horario       = '',
          coleta_convenio      = '',
          coleta_medico        = '',
          nome_atendimento     = '',
          coleta_id_tisaude    = ''
        WHERE id = $1 RETURNING telefone`,
        [ag.contato_id]
      );

      if (notificar && contatos.length > 0) {
        const tel = contatos[0].telefone.replace(/\D/g, '');
        const msg = `Olá, *${ag.nome_paciente}*.\n\nInfelizmente a sua consulta precisou ser *CANCELADA* ❌.\n\nPara remarcar, envie uma nova mensagem.`;
        await enviarWhatsApp(tel, msg);
      }

      if (ag.id_itsaude) {
        try {
          await cancelarNoItsaude(ag.id_itsaude);
          logger.info('Consulta cancelada no iTSaúde', { id_itsaude: ag.id_itsaude });
        } catch (e) {
          logger.error('Falha ao cancelar no iTSaúde', { error: e.message, id_itsaude: ag.id_itsaude });
          avisoItsaude = 'Falha ao cancelar no iTSaúde — verifique manualmente.';
        }
      }
    }

    // Finalizar ficha → reativa bot e limpa dados de coleta para próximo atendimento
    if (status === 'FINALIZADO' && agendados.length > 0) {
      await pool.query(
        `UPDATE contatos_whatsapp SET
          status_robo          = 'Robô',
          sessao_intencao      = 'triagem',
          sessao_rota          = 0,
          sessao_atualizada_em = NOW(),
          coleta_unidade       = '',
          coleta_data          = '',
          coleta_periodo       = '',
          coleta_horario       = '',
          coleta_convenio      = '',
          coleta_medico        = '',
          nome_atendimento     = '',
          coleta_id_tisaude    = ''
        WHERE id = $1`,
        [agendados[0].contato_id]
      );
    }

    await registarAuditoria({
      usuario_id: req.user.id, usuario_nome: req.user.nome,
      acao: `STATUS_${status}`, entidade: 'agendamentos', entidade_id: parseInt(id),
      detalhes: { status, atendente, observacoes }, ip: req.ip
    });

    req.app.get('io')?.emit('agendamento:atualizado', {
      id: parseInt(id),
      status_atendimento: status,
      atendente_nome: status === 'PENDENTE' ? null : (atendente || undefined),
      data_atendimento: data_atendimento || undefined,
      data_cancelamento: data_cancelamento || undefined,
      observacoes: observacoes || undefined,
    });

    res.json({ sucesso: true, ...(avisoItsaude ? { avisoItsaude } : {}) });
  } catch (err) {
    logger.error('Erro ao atualizar status', { error: err.message });
    res.status(500).json({ erro: 'Erro ao atualizar status.' });
  }
});

// ============================================================
// AGENDAR CONSULTA
// ============================================================
app.put('/api/agendar', verificarToken, async (req, res) => {
  const { id, data_consulta, hora_consulta, medico_final } = req.body;

  // Validação
  if (!validar.date(data_consulta)) return res.status(400).json({ erro: 'Data inválida.' });
  if (!validar.time(hora_consulta)) return res.status(400).json({ erro: 'Hora inválida.' });
  if (!validar.minLen(medico_final, 2)) return res.status(400).json({ erro: 'Médico é obrigatório.' });

  try {
    if (req.user.papel === 'recepcao') {
      const check = await pool.query('SELECT atendente_nome FROM agendamentos WHERE id = $1', [id]);
      if (check.rows.length > 0 && check.rows[0].atendente_nome && check.rows[0].atendente_nome !== req.user.nome) {
        return res.status(403).json({ erro: 'Não pode agendar um paciente assumido por outro colega.' });
      }
    }

    const { rows: agendados } = await pool.query(
      `UPDATE agendamentos SET status_atendimento='AGENDADO', data_consulta=$1, hora_consulta=$2,
       medico_final=$3, data_atualizacao=NOW()
       WHERE id=$4 RETURNING contato_id, nome_paciente, especialidade, unidade`,
      [data_consulta, hora_consulta, medico_final, id]
    );

    if (agendados.length > 0) {
      const ag = agendados[0];
      const { rows: contatos } = await pool.query(
        `UPDATE contatos_whatsapp SET
          status_robo          = 'Robô',
          sessao_intencao      = 'triagem',
          sessao_rota          = 0,
          sessao_atualizada_em = NOW(),
          coleta_unidade       = '',
          coleta_data          = '',
          coleta_periodo       = '',
          coleta_horario       = '',
          coleta_convenio      = '',
          coleta_medico        = '',
          nome_atendimento     = '',
          coleta_id_tisaude    = ''
        WHERE id=$1 RETURNING telefone`,
        [ag.contato_id]
      );

      if (contatos.length > 0) {
        const tel = contatos[0].telefone.replace(/\D/g, '');
        const [ano, mes, dia] = data_consulta.split('-');
        const msg = `Olá, *${ag.nome_paciente}*! ✅\n\nSua consulta de *${ag.especialidade}* foi confirmada:\n\n📅 *Data:* ${dia}/${mes}/${ano}\n⏰ *Horário:* ${hora_consulta}\n👨‍⚕️ *Médico(a):* Dr(a). ${medico_final}\n🏥 *Unidade:* ${ag.unidade}\n\nAté logo! 😊`;
        await enviarWhatsApp(tel, msg);
      }
    }

    await registarAuditoria({
      usuario_id: req.user.id, usuario_nome: req.user.nome,
      acao: 'AGENDAR_CONSULTA', entidade: 'agendamentos', entidade_id: parseInt(id),
      detalhes: { data_consulta, hora_consulta, medico_final }, ip: req.ip
    });

    req.app.get('io')?.emit('agendamento:atualizado', {
      id: parseInt(id),
      status_atendimento: 'AGENDADO',
      data_consulta,
      hora_consulta,
      medico_final,
    });

    res.json({ sucesso: true });
  } catch (err) {
    logger.error('Erro ao agendar', { error: err.message });
    res.status(500).json({ erro: 'Erro ao agendar consulta.' });
  }
});

// ============================================================
// CHAT
// ============================================================
app.get('/api/chat/:telefone', verificarToken, async (req, res) => {
  const telefoneLimpo = req.params.telefone.replace(/\D/g, '');
  const desde = req.query.desde;
  try {
    const params = [telefoneLimpo];
    let filtroDesde = '';
    if (desde) { filtroDesde = ` AND data > $2`; params.push(new Date(desde)); }
    const { rows } = await pool.query(
      `SELECT id, texto, origem, data, midia_id
       FROM chat_limpo
       WHERE telefone = $1${filtroDesde}
       ORDER BY data ASC
       LIMIT 200`,
      params
    );

    const midiaIds = rows.map(r => r.midia_id).filter(Boolean);
    let midiaMap = {};
    if (midiaIds.length > 0) {
      const midiaRows = await pool.query(
        'SELECT id, mimetype, conteudo_base64 FROM mensagens_midia WHERE id = ANY($1)',
        [midiaIds]
      );
      midiaRows.rows.forEach(m => { midiaMap[m.id] = m; });
    }

    const formatado = rows.map(r => {
      const midia = r.midia_id ? midiaMap[r.midia_id] : null;
      return {
        texto: r.texto,
        origem: r.origem,
        data: r.data,
        mediaBase64: midia?.conteudo_base64 || null,
        mediaMimetype: midia?.mimetype || null,
      };
    });
    res.json(formatado);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar histórico.' });
  }
});

app.post('/api/chat/enviar', verificarToken, async (req, res) => {
  const { telefone, texto } = req.body;

  if (!validar.minLen(texto, 1)) return res.status(400).json({ erro: 'Texto vazio.' });

  const telefoneLimpo = telefone.replace(/\D/g, '');
  try {
    await enviarWhatsApp(telefoneLimpo, texto);
    const msgData = { type: 'ai', content: texto, additional_kwargs: { sender: req.user.nome } };
    await pool.query(
      'INSERT INTO chat_messages (session_id, message) VALUES ($1, $2)',
      [`${telefoneLimpo}@s.whatsapp.net`, JSON.stringify(msgData)]
    );
    await pool.query(
      'INSERT INTO chat_limpo (telefone, texto, origem) VALUES ($1, $2, $3)',
      [telefoneLimpo, texto, 'ia_ou_recepcao']
    );
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao enviar mensagem.' });
  }
});

app.post('/api/chat/enviar-midia', verificarToken, upload.single('arquivo'), async (req, res) => {
  const { telefone } = req.body;
  if (!req.file) return res.status(400).json({ erro: 'Arquivo não recebido.' });
  if (!WAHA_BASE_URL) return res.status(503).json({ erro: 'WAHA não configurado.' });

  const telefoneLimpo = telefone.replace(/\D/g, '');
  const base64 = req.file.buffer.toString('base64');
  const filename = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const mimetype = req.file.mimetype;

  try {
    await enviarWhatsAppMidia(telefoneLimpo, base64, mimetype, filename);
    const { rows: [midiaRow] } = await pool.query(
      'INSERT INTO mensagens_midia (mimetype, conteudo_base64) VALUES ($1, $2) RETURNING id',
      [mimetype, base64]
    );
    const msgData = { type: 'ai', content: `📎 ${filename}`, additional_kwargs: { sender: req.user.nome, midia_id: midiaRow.id, mediaMimetype: mimetype } };
    await pool.query(
      'INSERT INTO chat_messages (session_id, message) VALUES ($1, $2)',
      [`${telefoneLimpo}@s.whatsapp.net`, JSON.stringify(msgData)]
    );
    await pool.query(
      'INSERT INTO chat_limpo (telefone, texto, origem, midia_id) VALUES ($1, $2, $3, $4)',
      [telefoneLimpo, `📎 ${filename}`, 'ia_ou_recepcao', midiaRow.id]
    );
    res.json({ sucesso: true, filename });
  } catch (err) {
    logger.error('Erro ao enviar mídia', { error: err.message });
    res.status(500).json({ erro: 'Erro ao enviar arquivo.' });
  }
});

app.put('/api/chat/:telefone/interromper-robo', verificarToken, async (req, res) => {
  const telefoneLimpo = req.params.telefone.replace(/\D/g, '');
  try {
    const { rowCount } = await pool.query(
      `UPDATE contatos_whatsapp SET status_robo='Humano' WHERE telefone=$1`,
      [telefoneLimpo]
    );
    if (rowCount === 0) return res.status(404).json({ erro: 'Contacto não encontrado.' });

    await registarAuditoria({
      usuario_id: req.user.id, usuario_nome: req.user.nome,
      acao: 'PAUSAR_ROBO', entidade: 'contatos_whatsapp',
      detalhes: { telefone: telefoneLimpo }, ip: req.ip
    });

    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao pausar robô.' });
  }
});

// ============================================================
// RENOMEAR PACIENTE (agendamento) e TITULAR (lead/triagem)
// ============================================================
app.patch('/api/agendamentos/:id/nome', verificarToken, async (req, res) => {
  const { nome } = req.body;
  if (!validar.minLen(nome, 2)) return res.status(400).json({ erro: 'Nome muito curto.' });
  try {
    const { rowCount } = await pool.query(
      'UPDATE agendamentos SET nome_paciente = $1 WHERE id = $2',
      [nome.trim(), req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao renomear.' });
  }
});

app.patch('/api/leads/:id/nome', verificarToken, async (req, res) => {
  const { nome } = req.body;
  if (!validar.minLen(nome, 2)) return res.status(400).json({ erro: 'Nome muito curto.' });
  try {
    const { rowCount } = await pool.query(
      'UPDATE contatos_whatsapp SET nome_titular = $1 WHERE id = $2',
      [nome.trim(), req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ erro: 'Lead não encontrado.' });
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao renomear.' });
  }
});

// LEADS: DESCARTAR E CONVERTER
// ============================================================
app.delete('/api/leads/:id', verificarToken, async (req, res) => {
  if (!['admin', 'gerente'].includes(req.user.papel)) {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }
  try {
    await pool.query('DELETE FROM contatos_whatsapp WHERE id = $1', [req.params.id]);
    clearCache('leads:');
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao descartar lead.' });
  }
});

app.post('/api/leads/:id/converter', verificarToken, async (req, res) => {
  if (!['admin', 'gerente', 'recepcao'].includes(req.user.papel)) {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }
  try {
    const leadRes = await pool.query('SELECT * FROM contatos_whatsapp WHERE id = $1', [req.params.id]);
    if (leadRes.rowCount === 0) return res.status(404).json({ erro: 'Contacto não encontrado.' });

    const lead = leadRes.rows[0];

    await pool.query(`
      INSERT INTO agendamentos (contato_id, nome_paciente, cpf_paciente, status_atendimento, intencao, especialidade, unidade, pagamento, para_terceiro)
      VALUES ($1, $2, $3, 'PENDENTE', 'Conversão Manual', 'Não informada', 'A Definir', 'A Combinar', false)
    `, [lead.id, lead.nome_atendimento || lead.nome_titular || lead.telefone || 'Paciente sem nome', lead.cpf_titular || null]);

    await pool.query(
      `UPDATE contatos_whatsapp SET status_robo='Humano' WHERE id=$1`,
      [lead.id]
    );

    await registarAuditoria({
      usuario_id: req.user.id, usuario_nome: req.user.nome,
      acao: 'CONVERTER_LEAD', entidade: 'contatos_whatsapp', entidade_id: lead.id,
      ip: req.ip
    });

    clearCache('leads:');
    res.json({ sucesso: true });
  } catch (err) {
    logger.error('Erro ao converter lead', { error: err.message });
    res.status(500).json({ erro: 'Erro ao converter lead.' });
  }
});

// ============================================================
// CRIAR TICKET MANUAL (sem lead prévio)
// ============================================================
app.post('/api/agendamentos/manual', verificarToken, async (req, res) => {
  const { nome, telefone } = req.body;
  let tel = String(telefone || '').replace(/\D/g, '');
  if (tel.length === 10 || tel.length === 11) tel = '55' + tel;
  if (tel.length < 12 || tel.length > 13) return res.status(400).json({ erro: 'Telefone inválido. Informe DDD + número (ex: 11999887766).' });
  const nomeFinal = (nome || '').trim() || tel;

  try {
    // Upsert contato
    const contatoRes = await pool.query(`
      INSERT INTO contatos_whatsapp (telefone, nome_titular, status_robo, data_cadastro)
      VALUES ($1, $2, 'Humano', NOW())
      ON CONFLICT (telefone) DO UPDATE SET
        nome_titular = COALESCE(NULLIF(EXCLUDED.nome_titular, $2), contatos_whatsapp.nome_titular),
        status_robo  = 'Humano'
      RETURNING id, telefone, nome_titular
    `, [tel, nomeFinal]);
    const contato = contatoRes.rows[0];

    await pool.query(`
      INSERT INTO agendamentos (contato_id, nome_paciente, status_atendimento, intencao, especialidade, unidade, pagamento, para_terceiro)
      VALUES ($1, $2, 'PENDENTE', 'Contato Ativo', 'Não informada', 'A Definir', 'A Combinar', false)
    `, [contato.id, nomeFinal]);

    await registarAuditoria({
      usuario_id: req.user.id, usuario_nome: req.user.nome,
      acao: 'CRIAR_TICKET_MANUAL', entidade: 'agendamentos', entidade_id: contato.id,
      ip: req.ip
    });

    res.json({ sucesso: true });
  } catch (err) {
    logger.error('Erro ao criar ticket manual', { error: err.message });
    res.status(500).json({ erro: 'Erro ao criar ticket.' });
  }
});

// ============================================================
// CONTATOS
// ============================================================
app.get('/api/contatos', verificarToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, telefone, nome_titular, nome_atendimento, cpf_titular,
             status_robo, ultima_mensagem, data_cadastro, sessao_intencao, classificacao_itsaude
      FROM contatos_whatsapp
      ORDER BY ultima_mensagem DESC
      LIMIT 500
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar contatos.' });
  }
});

app.patch('/api/contatos/:id/bloquear', verificarToken, async (req, res) => {
  const { bloquear } = req.body;
  try {
    await pool.query(
      'UPDATE contatos_whatsapp SET status_robo = $1 WHERE id = $2',
      [bloquear ? 'Bloqueado' : 'Robô', req.params.id]
    );
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao bloquear contato.' });
  }
});

app.get('/api/contatos/:telefone/foto', verificarToken, async (req, res) => {
  if (!WAHA_BASE_URL) return res.status(503).end();
  const tel = req.params.telefone.replace(/\D/g, '');
  const cacheKey = `foto:${tel}`;
  const cached = getCache(cacheKey);
  // 'NONE' = sem foto (cacheado); null = não está em cache
  if (cached === 'NONE') return res.status(404).end();
  if (cached) return res.json({ url: cached });
  try {
    // WAHA aceita @s.whatsapp.net ou @c.us dependendo da versão
    const contactId = `${tel}@s.whatsapp.net`;
    const wahaUrl = `${WAHA_BASE_URL}/api/contacts/profile-picture?contactId=${encodeURIComponent(contactId)}&session=${WAHA_SESSION}`;
    const resp = await fetch(wahaUrl, { headers: wahaHeaders(), signal: AbortSignal.timeout(5_000) });
    if (!resp.ok) { setCache(cacheKey, 'NONE', 60 * 60 * 1000); return res.status(404).end(); }
    const data = await resp.json();
    const url = data.eurl || data.profilePictureURL || data.profilePictureUrl || data.url || null;
    if (!url) { setCache(cacheKey, 'NONE', 60 * 60 * 1000); return res.status(404).end(); }
    setCache(cacheKey, url, 60 * 60 * 1000);
    res.json({ url });
  } catch (e) {
    logger.error('Erro ao buscar foto WAHA', { error: e.message });
    setCache(cacheKey, 'NONE', 60 * 60 * 1000);
    res.status(404).end();
  }
});

app.post('/api/contatos', verificarToken, async (req, res) => {
  const { telefone, nome } = req.body;
  const tel = (telefone || '').replace(/\D/g, '');
  if (!tel) return res.status(400).json({ erro: 'Telefone obrigatório.' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO contatos_whatsapp (telefone, nome_titular) VALUES ($1, $2)
       ON CONFLICT (telefone) DO UPDATE SET nome_titular = EXCLUDED.nome_titular
       RETURNING id, telefone, nome_titular, nome_atendimento, cpf_titular, status_robo, ultima_mensagem, data_cadastro, sessao_intencao`,
      [tel, nome || null]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao adicionar contato.' });
  }
});

app.patch('/api/contatos/:id', verificarToken, async (req, res) => {
  const { nome, telefone } = req.body;
  const tel = telefone ? telefone.replace(/\D/g, '') : null;
  try {
    const { rows } = await pool.query(
      `UPDATE contatos_whatsapp
       SET nome_titular = COALESCE($1, nome_titular),
           telefone     = COALESCE($2, telefone)
       WHERE id = $3
       RETURNING id, telefone, nome_titular, nome_atendimento, cpf_titular, status_robo, ultima_mensagem, data_cadastro, sessao_intencao`,
      [nome ?? null, tel || null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ erro: 'Contato não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao editar contato.' });
  }
});

// ============================================================
// RELATÓRIOS AVANÇADOS
// ============================================================
app.get('/api/relatorios/resumo', verificarToken, async (req, res) => {
  if (!['admin', 'gerente'].includes(req.user.papel)) {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }

  const { data_inicio, data_fim } = req.query;
  const cacheKey = `relatorios:resumo:${data_inicio || ''}:${data_fim || ''}`;
  const cached = getCache(cacheKey);
  if (cached !== null) return res.json(cached);

  try {
    const params = [];
    let dateFilter = '';
    if (data_inicio && data_fim) {
      dateFilter = `WHERE a.data_criacao BETWEEN $1 AND $2`;
      params.push(data_inicio, data_fim + 'T23:59:59');
    }

    const medicoWhere = dateFilter
      ? `${dateFilter} AND (medico_final IS NOT NULL OR nome_medico IS NOT NULL)`
      : `WHERE (medico_final IS NOT NULL OR nome_medico IS NOT NULL)`;

    const [totalRes, statusRes, unidadeRes, pagamentoRes, medicoRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM agendamentos a ${dateFilter}`, params),
      pool.query(`SELECT status_atendimento, COUNT(*) as qtd FROM agendamentos a ${dateFilter} GROUP BY status_atendimento`, params),
      pool.query(`SELECT unidade, COUNT(*) as qtd FROM agendamentos a ${dateFilter} GROUP BY unidade`, params),
      pool.query(`SELECT pagamento, COUNT(*) as qtd FROM agendamentos a ${dateFilter} GROUP BY pagamento`, params),
      pool.query(`SELECT COALESCE(medico_final, nome_medico) as medico, COUNT(*) as qtd FROM agendamentos a ${medicoWhere} GROUP BY 1 ORDER BY 2 DESC LIMIT 10`, params),
    ]);

    const resultado = {
      total: parseInt(totalRes.rows[0].total),
      porStatus: statusRes.rows,
      porUnidade: unidadeRes.rows,
      porPagamento: pagamentoRes.rows,
      topMedicos: medicoRes.rows,
    };
    setCache(cacheKey, resultado, 5 * 60_000);
    res.json(resultado);
  } catch (err) {
    logger.error('Erro nos relatórios', { error: err.message });
    res.status(500).json({ erro: 'Erro ao gerar relatórios.' });
  }
});

app.get('/api/relatorios/evolucao-diaria', verificarToken, async (req, res) => {
  const diasRaw = parseInt(req.query.dias || '30', 10);
  const dias = isNaN(diasRaw) ? 30 : Math.min(90, Math.max(1, diasRaw));
  const cacheKey = `relatorios:evolucao:${dias}`;
  const cached = getCache(cacheKey);
  if (cached !== null) return res.json(cached);
  try {
    const { rows } = await pool.query(`
      SELECT
        DATE(data_criacao) as dia,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status_atendimento = 'AGENDADO')   as agendados,
        COUNT(*) FILTER (WHERE status_atendimento = 'FINALIZADO')  as finalizados,
        COUNT(*) FILTER (WHERE status_atendimento = 'CANCELADO')   as cancelados
      FROM agendamentos
      WHERE data_criacao >= NOW() - ($1 * INTERVAL '1 day')
      GROUP BY DATE(data_criacao)
      ORDER BY dia ASC
    `, [dias]);
    setCache(cacheKey, rows, 10 * 60_000);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro na evolução diária.' });
  }
});

// ============================================================
// HELPER: ITSAUDE
// ============================================================
let _itsaudeToken = null;
let _itsaudeTokenExpira = 0;

async function _loginItsaude() {
  const resp = await fetch('https://api.tisaude.com/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: ITSAUDE_LOGIN, senha: ITSAUDE_SENHA }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) throw new Error(`iTSaúde login ${resp.status}`);
  const data = await resp.json();
  const token = data.token || data.access_token || data.data?.token || data.accessToken;
  if (!token) throw new Error('iTSaúde: campo token não encontrado na resposta do login');
  _itsaudeToken = token;
  _itsaudeTokenExpira = Date.now() + 50 * 60 * 1000; // cache 50min
  return token;
}

async function cancelarNoItsaude(idItsaude) {
  if (!ITSAUDE_LOGIN || !ITSAUDE_SENHA) return;
  let token = _itsaudeTokenExpira > Date.now() ? _itsaudeToken : await _loginItsaude();
  const url = `https://api.tisaude.com/api/schedule/status/update/${idItsaude}/-2`;
  const chamar = (t) => fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  let resp = await chamar(token);
  if (resp.status === 401) {
    token = await _loginItsaude();
    resp = await chamar(token);
  }
  if (!resp.ok) {
    const corpo = await resp.text().catch(() => '');
    throw new Error(`iTSaúde ${resp.status}: ${corpo}`);
  }
}

// ============================================================
async function enviarWhatsApp(telefone, texto) {
  if (!WAHA_API_URL) {
    logger.warn('WAHA_API_URL não configurado. Mensagem não enviada.', { telefone });
    return;
  }
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  if (WAHA_API_KEY) headers['X-Api-Key'] = WAHA_API_KEY;

  try {
    const resp = await fetch(WAHA_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ chatId: `${telefone}@c.us`, text: texto, session: WAHA_SESSION }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) logger.warn('WAHA retornou erro', { status: resp.status, telefone });
  } catch (err) {
    logger.error('Falha ao enviar WhatsApp', { error: err.message, telefone });
  }
}

async function enviarWhatsAppMidia(telefone, base64, mimetype, filename) {
  if (!WAHA_BASE_URL) throw new Error('WAHA_BASE_URL não configurado');
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  if (WAHA_API_KEY) headers['X-Api-Key'] = WAHA_API_KEY;

  const isImagem = mimetype.startsWith('image/');
  const endpoint = isImagem ? `${WAHA_BASE_URL}/api/sendImage` : `${WAHA_BASE_URL}/api/sendFile`;

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      session: WAHA_SESSION,
      chatId: `${telefone}@c.us`,
      file: { data: base64, filename, mimetype },
      caption: '',
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!resp.ok) {
    const corpo = await resp.text().catch(() => '');
    logger.error('WAHA mídia retornou erro', { status: resp.status, telefone, corpo });
    throw new Error(`WAHA ${resp.status}: ${corpo}`);
  }
}

// ============================================================
// WAHA — GESTÃO DE SESSÃO (admin only)
// ============================================================
const wahaHeaders = () => {
  const h = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  if (WAHA_API_KEY) h['X-Api-Key'] = WAHA_API_KEY;
  return h;
};

const apenasAdmin = (req, res, next) => {
  if (!['admin', 'gerente'].includes(req.user?.papel)) return res.status(403).json({ erro: 'Acesso restrito a admin e gerente.' });
  next();
};


app.get('/api/waha/status', verificarToken, apenasAdmin, async (req, res) => {
  if (!WAHA_BASE_URL) return res.status(503).json({ erro: 'WAHA_API_URL não configurado.' });
  try {
    const r = await fetch(`${WAHA_BASE_URL}/api/sessions`, { headers: wahaHeaders(), signal: AbortSignal.timeout(8000) });
    if (!r.ok) return res.json({ status: 'STOPPED', me: null });
    const list = await r.json();
    if (!Array.isArray(list) || list.length === 0) return res.json({ status: 'STOPPED', me: null });
    const session = list.find(s => s.name === WAHA_SESSION) || list[0];
    res.json({ status: session?.status || 'STOPPED', me: session?.me || null });
  } catch (err) {
    res.status(502).json({ erro: 'Não foi possível contactar o WAHA.', detalhe: err.message });
  }
});

app.get('/api/waha/qr', verificarToken, apenasAdmin, async (req, res) => {
  if (!WAHA_BASE_URL) return res.status(503).json({ erro: 'WAHA_API_URL não configurado.' });
  try {
    const r = await fetch(`${WAHA_BASE_URL}/api/${WAHA_SESSION}/auth/qr`, { headers: wahaHeaders(), signal: AbortSignal.timeout(8000) });
    const data = await r.json();
    const dataUri = data.data ? `data:${data.mimetype || 'image/png'};base64,${data.data}` : null;
    res.json({ qr: dataUri });
  } catch (err) {
    res.status(502).json({ erro: 'Erro ao buscar QR code.', detalhe: err.message });
  }
});

app.post('/api/waha/start', verificarToken, apenasAdmin, async (req, res) => {
  if (!WAHA_BASE_URL) return res.status(503).json({ erro: 'WAHA_API_URL não configurado.' });
  try {
    // Para a sessão primeiro (reset de FAILED/estados quebrados) — ignora erros
    await fetch(`${WAHA_BASE_URL}/api/sessions/${WAHA_SESSION}/stop`, { method: 'POST', headers: wahaHeaders(), signal: AbortSignal.timeout(5000) }).catch(() => {});
    // Tenta iniciar
    let r = await fetch(`${WAHA_BASE_URL}/api/sessions/${WAHA_SESSION}/start`, { method: 'POST', headers: wahaHeaders(), signal: AbortSignal.timeout(10000) });
    // Se sessão não existe (404/422/400), cria e inicia
    if (!r.ok && [404, 422, 400].includes(r.status)) {
      await fetch(`${WAHA_BASE_URL}/api/sessions`, {
        method: 'POST', headers: wahaHeaders(), signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ name: WAHA_SESSION, config: { webhooks: [{ url: process.env.WAHA_WEBHOOK_URL || '', events: ['message'] }] } }),
      }).catch(() => {});
      r = await fetch(`${WAHA_BASE_URL}/api/sessions/${WAHA_SESSION}/start`, { method: 'POST', headers: wahaHeaders(), signal: AbortSignal.timeout(10000) });
    }
    res.json({ status: 'STARTING' });
  } catch (err) {
    res.status(502).json({ erro: 'Erro ao iniciar sessão.', detalhe: err.message });
  }
});

app.post('/api/waha/stop', verificarToken, apenasAdmin, async (req, res) => {
  if (!WAHA_BASE_URL) return res.status(503).json({ erro: 'WAHA_API_URL não configurado.' });
  try {
    const r = await fetch(`${WAHA_BASE_URL}/api/sessions/${WAHA_SESSION}/stop`, { method: 'POST', headers: wahaHeaders(), signal: AbortSignal.timeout(10000) });
    const data = await r.json();
    res.json({ status: data?.status || 'STOPPED' });
  } catch (err) {
    res.status(502).json({ erro: 'Erro ao parar sessão.', detalhe: err.message });
  }
});

app.post('/api/waha/logout', verificarToken, apenasAdmin, async (req, res) => {
  if (!WAHA_BASE_URL) return res.status(503).json({ erro: 'WAHA_API_URL não configurado.' });
  try {
    await fetch(`${WAHA_BASE_URL}/api/sessions/${WAHA_SESSION}/stop`, { method: 'POST', headers: wahaHeaders(), signal: AbortSignal.timeout(10000) });
    const r = await fetch(`${WAHA_BASE_URL}/api/sessions/${WAHA_SESSION}/logout`, { method: 'POST', headers: wahaHeaders(), signal: AbortSignal.timeout(10000) });
    const data = await r.json();
    res.json({ status: data?.status || 'STOPPED' });
  } catch (err) {
    res.status(502).json({ erro: 'Erro ao deslogar.', detalhe: err.message });
  }
});

// ============================================================
// LIMPEZA PERIÓDICA: refresh tokens expirados
// ============================================================
setInterval(async () => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM refresh_tokens WHERE expira_em < NOW() OR revogado = true`
    );
    if (rowCount > 0) logger.info(`Limpeza: ${rowCount} refresh tokens removidos.`);
  } catch (e) {
    logger.warn('Erro na limpeza de tokens', { error: e.message });
  }
}, 60 * 60 * 1000); // 1 hora

// ============================================================
// SERVIR O FRONTEND REACT
// ============================================================
const publicPath = path.resolve(__dirname, 'public');
app.use(express.static(publicPath));

app.get('*', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      logger.error('index.html não encontrado', { path: indexPath });
      res.status(404).send('Frontend não encontrado. Verifique a compilação.');
    }
  });
});

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recebido. Encerrando graciosamente...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT recebido. Encerrando...');
  await pool.end();
  process.exit(0);
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================
const PORT = parseInt(process.env.PORT || '3000', 10);
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`OtoFlow iniciado`, { porta: PORT, ambiente: process.env.NODE_ENV || 'development' });
});
