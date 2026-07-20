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

## Backlog priorizado
- **P1** Import Excel de pesagens (xlsx → parse → POST em massa)
- **P1** Export Excel nativo (com múltiplas folhas: resumo + histórico) usando `xlsx`
- **P1** Página HTML estática read-only para partilha
- **P2** Restore de backup JSON (importar ficheiro)
- **P2** Somatório 7/8 pregas exibido junto aos resultados
- **P2** Slider de comparação de fotos com scrubber
- **P2** Auditoria: exibir criado_por + data em avaliações
- **P3** Notificações quando atleta atinge objetivo ou sai de faixa
- **P3** Integração com balanças de bioimpedância
- **P3** Export PDF nativo dos relatórios individuais
- **P3** App mobile companion
