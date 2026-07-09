FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV BONSUNG_SERVER_HOST=0.0.0.0
ENV BONSUNG_LOCAL_DATA_FILE=/data/stage-data.json

RUN mkdir -p /app/server /data && chown -R node:node /app /data

COPY --chown=node:node server/stage-server.mjs ./server/stage-server.mjs
COPY --chown=node:node server/bonsung-initial-data.mjs ./server/bonsung-initial-data.mjs

USER node

EXPOSE 4303

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -qO- "http://127.0.0.1:${PORT:-4303}/health" >/dev/null || exit 1

CMD ["node", "server/stage-server.mjs"]
