FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV VERSION3_SERVER_HOST=0.0.0.0
ENV VERSION3_LOCAL_DATA_FILE=/data/version3-data.json

RUN mkdir -p /app/server /data && chown -R node:node /app /data

COPY --chown=node:node server/version3-local-server.mjs ./server/version3-local-server.mjs

USER node

EXPOSE 4303

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -qO- "http://127.0.0.1:${PORT:-4303}/health" >/dev/null || exit 1

CMD ["node", "server/version3-local-server.mjs"]
