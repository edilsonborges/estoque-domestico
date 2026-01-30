-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('ADMIN', 'MEMBRO');

-- CreateEnum
CREATE TYPE "StatusItem" AS ENUM ('ATIVO', 'CONSUMIDO', 'DESCARTADO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('ENTRADA', 'CONSUMO', 'AJUSTE', 'DESCARTE');

-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('AVISO', 'URGENTE', 'VENCIDO');

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estoque" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "descricao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estoque_usuario" (
    "id" TEXT NOT NULL,
    "estoque_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "papel" "Papel" NOT NULL DEFAULT 'MEMBRO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estoque_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_code" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_estoque" (
    "id" TEXT NOT NULL,
    "estoque_id" TEXT NOT NULL,
    "qr_code_id" TEXT,
    "nome" VARCHAR(150) NOT NULL,
    "categoria" VARCHAR(50),
    "quantidade" DECIMAL(10,2) NOT NULL,
    "unidade" VARCHAR(10),
    "data_compra" DATE,
    "data_validade" DATE,
    "localizacao" VARCHAR(50),
    "status" "StatusItem" NOT NULL DEFAULT 'ATIVO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "item_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacao_item" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "quantidade" DECIMAL(10,2) NOT NULL,
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacao_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacao" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "estoque_usuario_estoque_id_usuario_id_key" ON "estoque_usuario"("estoque_id", "usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "qr_code_codigo_key" ON "qr_code"("codigo");

-- CreateIndex
CREATE INDEX "qr_code_codigo_idx" ON "qr_code"("codigo");

-- CreateIndex
CREATE INDEX "item_estoque_data_validade_idx" ON "item_estoque"("data_validade");

-- CreateIndex
CREATE INDEX "item_estoque_status_idx" ON "item_estoque"("status");

-- CreateIndex
CREATE INDEX "movimentacao_item_item_id_idx" ON "movimentacao_item"("item_id");

-- AddForeignKey
ALTER TABLE "estoque_usuario" ADD CONSTRAINT "estoque_usuario_estoque_id_fkey" FOREIGN KEY ("estoque_id") REFERENCES "estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque_usuario" ADD CONSTRAINT "estoque_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_estoque" ADD CONSTRAINT "item_estoque_estoque_id_fkey" FOREIGN KEY ("estoque_id") REFERENCES "estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_estoque" ADD CONSTRAINT "item_estoque_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "qr_code"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_item" ADD CONSTRAINT "movimentacao_item_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item_estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item_estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
