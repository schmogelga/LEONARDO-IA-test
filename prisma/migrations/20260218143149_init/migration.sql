-- CreateTable
CREATE TABLE "generation_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "generationId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "generation_images_generationId_idx" ON "generation_images"("generationId");

-- AddForeignKey
ALTER TABLE "generation_images" ADD CONSTRAINT "generation_images_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
