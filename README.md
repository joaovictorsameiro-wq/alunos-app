# Gestão de Alunos — Sameiro Educacional

Plataforma de gestão de alunos com integração Hotmart.

## Deploy na Vercel

### 1. Suba para o GitHub
```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/alunos-app.git
git push -u origin main
```

### 2. Importe na Vercel
- Acesse vercel.com/new
- Importe o repositório
- Configure as variáveis de ambiente abaixo

### 3. Variáveis de Ambiente (Vercel → Settings → Environment Variables)

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Connection string do Neon PostgreSQL |
| `APP_PASSWORD` | Senha para acessar o app |
| `JWT_SECRET` | String aleatória longa (ex: gere em https://generate-secret.vercel.app/32) |
| `HOTMART_CLIENT_ID` | Client ID da API Hotmart |
| `HOTMART_CLIENT_SECRET` | Client Secret da API Hotmart |
| `HOTMART_SUBDOMAIN` | prime-expert |

### 4. Redeploy após configurar as variáveis

## Funcionalidades
- ✅ Login com senha
- ✅ Dashboard com estatísticas
- ✅ Sincronização automática com Hotmart
- ✅ Progresso real dos alunos via API Hotmart
- ✅ Controle de vencimento de acesso
- ✅ Tarefas e entregas por aluno
- ✅ Observações e histórico
- ✅ Cadastro manual de alunos
