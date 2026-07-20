# CD Trofense — Composição Corporal de Atletas · PRD

## Problema original
Plataforma web (React + FastAPI + MongoDB) para o departamento médico do CD Trofense gerir avaliações antropométricas, evolução de peso, fotos, relatórios comparativos mensais e objetivos dos atletas. Baseada no `Trofense_APP.jsx` original, mantendo intactas as fórmulas de cálculo (Reilly & Wallace, Evans 2005, Jackson-Pollock, Withers, Lee 2000), com autenticação por papéis (editor / viewer), UI moderna e responsive, PT-PT.

## Arquitetura
- **Backend**: FastAPI (Python) em `/app/backend/server.py` + `formulas.py` + `storage.py`. JWT (12h) via cookie httpOnly + Bearer fallback. bcrypt para passwords. Motor (async) para MongoDB.
- **Frontend**: React 19 + React Router 7 + shadcn/ui + Tailwind + Recharts + Sonner. Contextos `Auth` e `Theme`. Fonts: Barlow Condensed (display/números) + Manrope (corpo).
- **Storage**: Emergent Object Storage — fotos guardadas em `trofense/photos/{athlete_id}/{uuid}.{ext}`; metadados em MongoDB (`photos`).
- **DB coleções**: `users`, `athletes`, `evaluations`, `weighins`, `photos`.

## Personas
- **Editor** (staff médico/preparador físico) — CRUD total.
- **Viewer** (treinador, direção, atleta) — só leitura; UI oculta botões editar/apagar/criar.

## Requisitos core (estáticos)
- Autenticação com 2 papéis, seed do admin no arranque (`admin@trofense.pt` / `Trofense2026!`).
- CRUD de atletas com dados pessoais e preferências.
- Avaliações antropométricas com pregas (10) e perímetros (6), cálculos em tempo real cliente + servidor.
- Pesagens diárias com média móvel de 7 dias no gráfico.
- Fotos frontal/perfil/costas por data com comparação primeira vs. última.
- Objetivos %MG → peso-alvo automático e barra de progresso.
- Relatório comparativo mensal (média de peso, MG, IMC entre 2 meses).
- Dashboard ordenável/pesquisável com pills de estado (Ótimo/Atenção/Alto).
- Backup JSON completo + Export CSV.
- Gestão de utilizadores (criar/desativar viewers).
- Dark mode com toggle.

## Implementado — 2026-02-20
- [x] Auth JWT + seed admin + Bearer/cookie + Layout com sidebar
- [x] CRUD atletas + Dashboard com KPIs + pesquisa + ordenação
- [x] Avaliações: 4 fórmulas de %MG + Lee (MM) + IMC + rácio + status, resultados live
- [x] Pesagens com gráfico Recharts + média móvel 7d
- [x] Upload/gestão de fotos (Emergent Object Storage) + comparação primeira/última
- [x] Objetivos: %MG alvo → peso alvo + progresso
- [x] Relatório mensal comparativo
- [x] Utilizadores (criar viewers/editors, ativar/desativar)
- [x] Backup JSON + Export CSV
- [x] Dark/Light mode
- [x] PT-PT em toda a interface

## Implementado — 2026-07-20
- [x] Import de pesagens via Excel (openpyxl backend + UI upload em `WeighinsPanel`)
- [x] Migração histórica: 18 atletas importados a partir de `trofense_backup_2026-07-15.json` (via `scripts/import_json.py`)
- [x] Fórmulas exatas alinhadas 1:1 com `trofense_composicao_corporal.jsx` (validado numericamente)
- [x] Remoção do "Σ 7 pregas" (mantido apenas Σ 8)
- [x] Nova Avaliação em Dialog modal (a partir do perfil do atleta)
- [x] Fotos por Avaliação — 3 slots fixos (Frente/Perfil/Costas) com crop livre de 8 pegas + linhas guia via `react-image-crop`
- [x] Slots renderizam em `object-contain` com o fundo da página a preencher o espaço restante
- [x] Upload de fotos ligado a `evaluation_id` (backend suporta na `POST /api/athletes/{aid}/photos`)
- [x] Aba `Fotos` com selector de avaliação + slots recortáveis/substituíveis
- [x] Histórico de avaliações vertical com pregas/perímetros um abaixo do outro
- [x] Objetivos de Equipa (`/objetivos-equipa`) com 6 sumários + filtros multi-dimensão + colunas ordenáveis + PDF replica-ecrã
- [x] Estados granulares de peso-alvo (`lib/goalStatus.js`) reutilizados na aba individual + team
- [x] Export PDF client-side com `jspdf` + `jspdf-autotable`: Dashboard, Objetivos de Equipa, PDF individual do atleta (capa + KPIs + métodos + evolução + histórico + fotos)
- [x] Identidade visual do clube: emblema oficial + faixa vermelha + acento amarelo + paleta trocada de verde para vermelho/navy/amarelo
- [x] Comparativo entre métodos em tabela (perfil + histórico)
- [x] Auditoria criado_por + data nas avaliações
- [x] Foto de perfil separada das fotos de avaliação (`AthleteAvatar.jsx`)
- [x] Envio de PDF por email (endpoint pronto — aguarda EMERGENT_EMAIL_KEY)
- [x] BUG P0: apagar utilizador (endpoint DELETE /api/users adicionado, testado 100%)
- [x] Progresso do objetivo mostra "N/A" + texto explicativo quando só há 1 avaliação
- [x] Campos email + contacto no atleta
- [x] Bugs visuais no PDF individual: overlap gráficos↔objetivo (chartY dinâmico), Σ 8 pregas com "mm", fotos com aspect ratio preservado (`fitContain`), símbolos Σ/Δ substituídos por "Soma"/"Dif." (Helvetica não suporta glifos gregos), setas ↑/↓ substituídas por "A perder peso"/"A ganhar peso"
- [x] Fotos do PDF com orientação EXIF respeitada (via `createImageBitmap` + canvas) — antes apareciam deitadas quando tiradas com telemóvel
- [x] Página 3 do PDF individual em orientação LANDSCAPE para fotos maiores lado a lado
- [x] **Envio por email via Resend direto** — chave configurada, HTML brandado + PDF em anexo. Remetente `onboarding@resend.dev` (Opção A) → só envia para o email da conta Resend enquanto o domínio `trofense.pt` não estiver verificado
- [x] **Histórico de Pesagens** (`/pesagens`) — nova aba na sidebar com vista matriz (atletas × dias) das últimas pesagens. Importa Excel modelo (aceita 2 formatos: long "Nome/Data/Peso" ou wide "Atleta + datas em colunas"). Detecta automaticamente onde está o cabeçalho. Botão "Descarregar modelo" para o utilizador reutilizar. Delta "+X kg no período" por atleta. Re-import do mesmo dia substitui o valor anterior
- [x] **Objetivos de Equipa** — nova página `/objetivos-equipa` (aba na sidebar) com vista consolidada dos ajustes de peso individuais: 6 cards de sumário (Prioritário/Em progresso/Quase lá/Atingido/Sem objetivo/Todos), **filtros multi-dimensão** (pesquisa por nome, posição, estado, direção do ajuste), **colunas ordenáveis** (nome, posição, estado, peso, %MG, alvo, Δ), tabela ordenada por prioridade com Δ peso + progresso, click numa linha vai ao perfil
- [x] **Estados granulares de peso-alvo** (`lib/goalStatus.js`): Atingido (|Δ|≤0.5kg) / Quase lá (≤2kg) / Em progresso (≤5kg) / Prioritário (>5kg). Pill reutilizada no `GoalsPanel` individual + `TeamGoals`
- [x] **Export PDF client-side** (`lib/pdf.js` com `jspdf` + `jspdf-autotable`) — botão "Descarregar PDF" no Dashboard (KPIs + plantel com badges coloridos por banda) e nos Objetivos de Equipa (sumário + tabela priorizada com colorização por estado). Suporte completo a caracteres PT-PT, cabeçalho com faixa vermelha/amarela do clube, emblema oficial incorporado e rodapé com paginação + "Desde 1930 · história, paixão e glória"
- [x] **Identidade visual do clube**: emblema oficial na sidebar (com marca d'água discreta), no login (marca d'água gigante + estrelas amarelas + "★ Clube Desportivo Trofense ★" + mote "Cada grama conta.") e nos cabeçalhos de PDF. Paleta trocada de verde para as **cores institucionais**: vermelho `354 82% 44%` como primário, azul-marinho `220 55% 12%` na sidebar, amarelo `48 100% 50%` como accent
- [x] Testes E2E: 100% pass em duas iterações (fotos + objetivos de equipa) + smoke visual da identidade renovada

## Backlog priorizado (atualizado)
- **P1** Export Excel nativo (com múltiplas folhas: resumo + histórico) usando `xlsx`
- **P1** UI de Restore de backup JSON (endpoint + página)
- **P2** Slider de comparação de fotos com scrubber (before/after)
- **P2** A11y: DialogDescription em modais Radix
- **P3** Notificações quando atleta atinge objetivo ou sai de faixa
- **P3** Integração com balanças de bioimpedância
- **P3** App mobile companion
- **P3** Envio de relatório PDF individual por email (Resend)
os de Equipa passou a preto (removido `text-primary`)
- [x] Testes E2E: 100% pass em duas iterações (fotos + objetivos de equipa) + smoke visual da identidade renovada + upload de foto de perfil + geração de PDF individual verificada por análise IA

## Backlog priorizado (atualizado)
- **P1** Export Excel nativo (com múltiplas folhas: resumo + histórico) usando `xlsx`
- **P1** UI de Restore de backup JSON (endpoint + página)
- **P1** Alinhar visual com mockup do utilizador: avatar redondo com iniciais (gradient), Comparativo em tabela, histórico em tabela com colunas e badges coloridos, CTA "Registar avaliação" em accent dourado
- **P2** Foto de perfil separada das fotos de avaliação
- **P2** Slider de comparação de fotos com scrubber (before/after)
- **P2** Auditoria: exibir criado_por + data em avaliações
- **P2** A11y: DialogDescription em modais Radix
- **P2** PDF individual por atleta (foto frente/perfil/costas + KPIs + evolução histórica)
- **P3** Notificações quando atleta atinge objetivo ou sai de faixa
- **P3** Integração com balanças de bioimpedância
- **P3** App mobile companion
