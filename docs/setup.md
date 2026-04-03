## Setup rápido de banco

Este repositório espera um PostgreSQL em `localhost:5432` com database `maestro_dev`. Para automatizar o ambiente local:

1. Instale o PostgreSQL (via Homebrew ou outro gerenciador).  
2. Execute `npm run setup-db` dentro da raiz do projeto. O script:
   - Verifica se `pg_isready` responde no host/porta configurada em `.env`.
   - Inicia o serviço com `brew services start postgresql` quando necessário.
   - Cria o database `maestro_dev` se ainda não existir.
   - Aplica todas as migrations e o seed (`npx prisma migrate reset --skip-generate --force`).

3. Após o script completar, rode `npm run dev` para iniciar o Next.js com o Agent IA.

Se preferir, você pode também executar manualmente:

```bash
brew services start postgresql
createdb maestro_dev
npx prisma migrate reset --skip-generate --force
npm run dev
```

> Observação: o script assumirá que você usa o cliente `psql` e o utilitário `pg_isready` instalados via Homebrew. Caso use outro método (Docker, Postgres.app etc.), apenas garanta que `pg_isready` detecta o serviço antes de chamar `npm run dev`.
