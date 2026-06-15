# ==========================================
# ESTÁGIO 1: Construção do Frontend (React/Vite)
# ==========================================
FROM public.ecr.aws/docker/library/node:20-alpine AS frontend-build
WORKDIR /app/frontend

# Copia manifesto de dependências e instala versões exatas do lock
COPY frontend/package*.json ./
RUN npm ci

# Copia toda a configuração e código-fonte
COPY frontend/index.html ./
COPY frontend/vite.config.ts ./
COPY frontend/tsconfig*.json ./
COPY frontend/tailwind.config.js ./
COPY frontend/postcss.config.js ./
COPY frontend/src/ ./src/
COPY frontend/public/ ./public/

# Compila para produção
RUN npx vite build

# ==========================================
# ESTÁGIO 2: Servidor Backend (Produção)
# ==========================================
FROM public.ecr.aws/docker/library/node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ ./

# Copia o frontend compilado
COPY --from=frontend-build /app/frontend/dist /app/public

RUN chown -R node:node /app
USER node

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
