-- Categorias de varejo + foto tirada no celular.
-- Converte a coluna category (texto livre, nunca usada pela interface) para enum SEM dropar,
-- e já categoriza os produtos existentes pelo nome para nada ficar em "Outros" à toa.

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('FOOD', 'DRINKS', 'CLEANING', 'PETS', 'OTHER');

-- Backfill pelo nome (sem acento, minúsculo). A ordem importa: pet antes de limpeza
-- ("shampoo pet") e limpeza antes de bebida ("água sanitária" NUNCA é bebida).
ALTER TABLE "products" ADD COLUMN "category_new" "ProductCategory" NOT NULL DEFAULT 'OTHER';

UPDATE "products" p
SET "category_new" = CASE
  WHEN n ~ '(racao|petisco|areia (sanitaria|higienica)|coleira|\mpet\M|caes|gatos|whiskas|pedigree)' THEN 'PETS'
  WHEN n ~ '(shampoo|condicionador|sabonete|detergente|sabao|desinfetante|amaciante|alvejante|agua sanitaria|limpador|esponja|creme dental|desodorante)' THEN 'CLEANING'
  WHEN n ~ '(refrigerante|suco|cerveja|\magua\M|energetico|vinho|\mcha\M|isotonico|nectar|guarana|refri)' THEN 'DRINKS'
  WHEN n ~ '(leite|iogurte|queijo|requeijao|manteiga|\mpao\M|paes|bolo|biscoito|bolacha|arroz|feijao|cafe|acucar|farinha|macarrao|oleo|molho|carne|frango|linguica|presunto|banana|maca|tomate|batata|cebola|fruta|ovo|chocolate|bala|salgadinho|enlatado|sardinha|atum|milho|ervilha|tempero|sal\M)' THEN 'FOOD'
  ELSE 'OTHER'
END::"ProductCategory"
FROM (
  SELECT id, translate(lower(name), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn') AS n FROM "products"
) src
WHERE src.id = p.id;

ALTER TABLE "products" DROP COLUMN "category";
ALTER TABLE "products" RENAME COLUMN "category_new" TO "category";

-- AlterTable
ALTER TABLE "products" ADD COLUMN "photo_updated_at" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "product_photos" (
    "product_id" UUID NOT NULL,
    "mime_type" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_photos_pkey" PRIMARY KEY ("product_id")
);

-- AddForeignKey
ALTER TABLE "product_photos" ADD CONSTRAINT "product_photos_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
