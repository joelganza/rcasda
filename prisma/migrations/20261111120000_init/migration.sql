-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "license" TEXT NOT NULL,
    "licenseUrl" TEXT,
    "permissionNotes" TEXT,
    "verificationStatus" TEXT NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Translation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "year" TEXT,
    "copyright" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "sourceId" TEXT,
    "verificationStatus" TEXT NOT NULL,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "verseCount" INTEGER NOT NULL DEFAULT 0,
    "chapterCount" INTEGER NOT NULL DEFAULT 0,
    "bookCount" INTEGER NOT NULL DEFAULT 0,
    "availabilityNote" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "testament" TEXT NOT NULL,
    "chapterCount" INTEGER NOT NULL,
    "versesPerChapter" TEXT NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookName" (
    "id" SERIAL NOT NULL,
    "bookId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,

    CONSTRAINT "BookName_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verse" (
    "id" SERIAL NOT NULL,
    "translationId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "Verse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HymnCollection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "copyright" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceId" TEXT,
    "verificationStatus" TEXT NOT NULL,
    "availabilityNote" TEXT,
    "numberingNote" TEXT,
    "isOfficialSda" BOOLEAN NOT NULL DEFAULT false,
    "hymnCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HymnCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hymn" (
    "id" SERIAL NOT NULL,
    "collectionId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "firstLine" TEXT NOT NULL,
    "author" TEXT,
    "translator" TEXT,
    "composer" TEXT,
    "meter" TEXT,
    "category" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
    "sourceUrl" TEXT,

    CONSTRAINT "Hymn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HymnStanza" (
    "id" SERIAL NOT NULL,
    "hymnId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'verse',
    "text" TEXT NOT NULL,

    CONSTRAINT "HymnStanza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quarter" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "humanDate" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "introduction" TEXT,
    "sourceId" TEXT,
    "officialUrl" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL,
    "contentPermission" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "Quarter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "quarterId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "memoryVerseRef" TEXT,
    "officialUrl" TEXT NOT NULL,
    "contentPermission" TEXT NOT NULL DEFAULT 'LINK_ONLY',
    "verificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED',

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonDay" (
    "id" SERIAL NOT NULL,
    "lessonId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "day" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "referenceRefs" TEXT,
    "officialUrl" TEXT NOT NULL,

    CONSTRAINT "LessonDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingPlan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "languageCode" TEXT NOT NULL DEFAULT 'en',

    CONSTRAINT "ReadingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingPlanDay" (
    "id" SERIAL NOT NULL,
    "planId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "passages" TEXT NOT NULL,

    CONSTRAINT "ReadingPlanDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedItem" (
    "id" SERIAL NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refJson" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "body" TEXT,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingHistory" (
    "id" SERIAL NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "href" TEXT NOT NULL,
    "refJson" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanProgress" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preference" (
    "userId" TEXT NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "Preference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Book_order_key" ON "Book"("order");

-- CreateIndex
CREATE UNIQUE INDEX "BookName_bookId_languageCode_key" ON "BookName"("bookId", "languageCode");

-- CreateIndex
CREATE INDEX "Verse_translationId_bookId_chapter_idx" ON "Verse"("translationId", "bookId", "chapter");

-- CreateIndex
CREATE INDEX "Verse_text_idx" ON "Verse"("text");

-- CreateIndex
CREATE UNIQUE INDEX "Verse_translationId_bookId_chapter_number_key" ON "Verse"("translationId", "bookId", "chapter", "number");

-- CreateIndex
CREATE INDEX "Hymn_title_idx" ON "Hymn"("title");

-- CreateIndex
CREATE INDEX "Hymn_firstLine_idx" ON "Hymn"("firstLine");

-- CreateIndex
CREATE UNIQUE INDEX "Hymn_collectionId_number_key" ON "Hymn"("collectionId", "number");

-- CreateIndex
CREATE INDEX "HymnStanza_hymnId_idx" ON "HymnStanza"("hymnId");

-- CreateIndex
CREATE UNIQUE INDEX "Quarter_year_quarter_key" ON "Quarter"("year", "quarter");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_quarterId_number_key" ON "Lesson"("quarterId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "LessonDay_lessonId_index_key" ON "LessonDay"("lessonId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingPlan_slug_key" ON "ReadingPlan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingPlanDay_planId_day_key" ON "ReadingPlanDay"("planId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "SavedItem_userId_type_idx" ON "SavedItem"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "SavedItem_userId_clientId_key" ON "SavedItem"("userId", "clientId");

-- CreateIndex
CREATE INDEX "ReadingHistory_userId_updatedAt_idx" ON "ReadingHistory"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingHistory_userId_clientId_key" ON "ReadingHistory"("userId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_userId_lessonId_dayIndex_key" ON "LessonProgress"("userId", "lessonId", "dayIndex");

-- CreateIndex
CREATE UNIQUE INDEX "PlanProgress_userId_planId_day_key" ON "PlanProgress"("userId", "planId", "day");

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookName" ADD CONSTRAINT "BookName_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verse" ADD CONSTRAINT "Verse_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "Translation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verse" ADD CONSTRAINT "Verse_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HymnCollection" ADD CONSTRAINT "HymnCollection_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hymn" ADD CONSTRAINT "Hymn_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "HymnCollection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HymnStanza" ADD CONSTRAINT "HymnStanza_hymnId_fkey" FOREIGN KEY ("hymnId") REFERENCES "Hymn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quarter" ADD CONSTRAINT "Quarter_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_quarterId_fkey" FOREIGN KEY ("quarterId") REFERENCES "Quarter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonDay" ADD CONSTRAINT "LessonDay_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingPlanDay" ADD CONSTRAINT "ReadingPlanDay_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ReadingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedItem" ADD CONSTRAINT "SavedItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingHistory" ADD CONSTRAINT "ReadingHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanProgress" ADD CONSTRAINT "PlanProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

