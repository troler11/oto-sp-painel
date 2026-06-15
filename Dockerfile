# ==========================================
# ESTÁGIO 1: Construção do Frontend (React/Vite)
# ==========================================
# Atualizado para usar o espelho público da AWS para evitar o erro 429 do Docker Hub
FROM public.ecr.aws/docker/library/node:20-alpine AS frontend-build
WORKDIR /app

# Instala as ferramentas de build base
RUN npm install -g create-vite
RUN create-vite frontend --template react-ts

WORKDIR /app/frontend

# Instala as dependências do Frontend
RUN npm install
RUN npm install lucide-react socket.io-client @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @fullcalendar/react @fullcalendar/core @fullcalendar/timegrid @fullcalendar/daygrid @fullcalendar/interaction
RUN npm install -D tailwindcss@3 postcss autoprefixer
RUN npm install @fullcalendar/react @fullcalendar/core @fullcalendar/timegrid @fullcalendar/interaction

# Configura o Tailwind CSS e o PostCSS automaticamente
RUN echo "export default { plugins: { tailwindcss: {}, autoprefixer: {} } }" > postcss.config.js
RUN echo "/** @type {import('tailwindcss').Config} */ export default { content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'], theme: { extend: {} }, plugins: [], }" > tailwind.config.js
RUN echo "@tailwind base; @tailwind components; @tailwind utilities;" > src/index.css

# Copia o código React atualizado
COPY frontend/src/ ./src/

COPY frontend/public ./public

# Compila o site para a versão estática de produção
RUN npx vite build

# ==========================================
# ESTÁGIO 2: Servidor Backend Seguro (Produção)
# ==========================================
# Atualizado aqui também para o espelho público da AWS
FROM public.ecr.aws/docker/library/node:20-alpine

# SEGURANÇA: Define o ambiente estritamente para produção
ENV NODE_ENV=production

WORKDIR /app

# Copia os ficheiros de dependências do backend
COPY backend/package*.json ./

# Instala as dependências base e as bibliotecas de segurança/ambiente
RUN npm install --omit=dev
RUN npm install helmet express-rate-limit dotenv

# Copia o código do backend
COPY backend/ ./

# Copia o frontend compilado do Estágio 1 para a pasta pública da API
COPY --from=frontend-build /app/frontend/dist /app/public

# SEGURANÇA: Ajusta permissões e muda para o utilizador restrito 'node'
RUN chown -R node:node /app
USER node

# Expõe a porta padrão do servidor
EXPOSE 3000
ENV PORT=3000

# Executa o servidor principal
CMD ["node", "server.js"]
