# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Estoque Doméstico Inteligente** is a household inventory management system that uses QR Codes to track food items, expiration dates, quantities, and storage locations. The project is currently in the **specification phase** — no source code has been implemented yet. All documentation is in Brazilian Portuguese.

## Repository Structure

- `briefing.md` — High-level technical description of the entire system
- `etapas/etapa1.md` — Vision & Requirements (SRS): MVP scope, functional/non-functional requirements, business rules
- `etapas/etapa2.md` — Data Modeling: PostgreSQL schema with 7 tables, indices, optimistic locking
- `etapas/etapa3.md` — REST API Specification: all endpoints, request/response contracts, error patterns
- `etapas/etapa4.md` — UX Flows: screen map, user journeys, interaction patterns

## Architecture (Specified)

Three-tier system: **Mobile App** → **REST API (stateless, JWT auth)** → **PostgreSQL**

### Core Domain Entities
- `usuario` — users
- `estoque` — pantries/households (N:N with users via `estoque_usuario`)
- `item_estoque` — inventory items (central entity, has `version` field for optimistic locking)
- `qr_code` — physical QR identifiers (one active QR per active item, reusable after consumption)
- `movimentacao_item` — audit trail (ENTRADA, CONSUMO, AJUSTE, DESCARTE)
- `notificacao` — expiration alerts (AVISO, URGENTE, VENCIDO)

### Key Business Rules
- Item statuses: ATIVO, CONSUMIDO, DESCARTADO, VENCIDO
- Expiration thresholds: OK (>5 days), ATENCAO (5-2 days), URGENTE (<=1 day), VENCIDO (<0 days) — configurable per user
- QR Code payload contains only a UUID; all data lives on the backend
- Quantity cannot go negative; every quantity change creates a `movimentacao_item` record
- All API requests validate user authentication AND membership in the target `estoque`
- Concurrency handled via optimistic locking (`version` field, HTTP 409 on conflict)

### API Base URL
`https://api.estoque-domestico.app/v1`

### Core API Flow
`POST /qr/resolve` — returns either `EXISTENTE` (with item data) or `NOVO` (with `qr_code_id` for registration)

## Tech Stack (Under Consideration)
- **Frontend:** Flutter / React Native / Kotlin / Swift
- **Backend:** Node.js / PHP (Laminas) / Java / Python
- **Database:** PostgreSQL (primary) / MySQL
- **Auth:** JWT with short-lived tokens
- **Push Notifications:** Firebase / APNs

## UX Principles
- Scan-first: QR Code is the primary entry point
- Max 2 touches after scan for any action (consume, discard)
- Offline-first with local cache and background sync
- Visual status indicators (green=OK, yellow=attention, red=urgent/expired)
