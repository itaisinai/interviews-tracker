-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "linkedinUrl" TEXT,
    "title" TEXT,
    "company" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonResearch" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "about" TEXT,
    "experience" JSONB,
    "education" JSONB,
    "skills" JSONB,
    "sources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonResearch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_email_key" ON "Person"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Person_linkedinUrl_key" ON "Person"("linkedinUrl");

-- CreateIndex
CREATE INDEX "Person_name_company_idx" ON "Person"("name", "company");

-- CreateIndex
CREATE UNIQUE INDEX "PersonResearch_personId_key" ON "PersonResearch"("personId");

-- AddForeignKey
ALTER TABLE "PersonResearch" ADD CONSTRAINT "PersonResearch_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
