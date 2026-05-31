-- Обновление схемы: Speciality, Defense.chairGekId
-- Запуск в SSMS или sqlcmd против базы приложения.

IF OBJECT_ID(N'dbo.Speciality', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Speciality (
    id        NVARCHAR(1000) NOT NULL CONSTRAINT Speciality_pkey PRIMARY KEY,
    name      NVARCHAR(1000) NOT NULL CONSTRAINT Speciality_name_key UNIQUE,
    isActive  BIT NOT NULL CONSTRAINT DF_Speciality_isActive DEFAULT 1,
    sortOrder INT NOT NULL CONSTRAINT DF_Speciality_sortOrder DEFAULT 0,
    createdAt DATETIME2 NOT NULL CONSTRAINT DF_Speciality_createdAt DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME2 NOT NULL
  );
END;

IF COL_LENGTH('dbo.Defense', 'chairGekId') IS NULL
BEGIN
  ALTER TABLE dbo.Defense ADD chairGekId NVARCHAR(1000) NULL;
  ALTER TABLE dbo.Defense ADD CONSTRAINT Defense_chairGekId_fkey
    FOREIGN KEY (chairGekId) REFERENCES dbo.GekChair(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION;
END;
