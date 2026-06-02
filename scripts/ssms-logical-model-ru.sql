/*
  Логическая модель «Электронная зачётка» для SQL Server Management Studio.
  Ключевые таблицы, названия и столбцы на русском (кроме id).
  Запустите в SSMS → затем: База данных → Схема базы данных → Создать диаграмму.

  При повторном запуске скрипт пересоздаёт таблицы (данные будут удалены).
*/

IF DB_ID(N'ЭлектроннаяЗачетка') IS NULL
  CREATE DATABASE [ЭлектроннаяЗачетка];
GO

USE [ЭлектроннаяЗачетка];
GO

-- Удаление в порядке зависимостей
IF OBJECT_ID(N'[dbo].[ГосЭкзамен]', N'U') IS NOT NULL DROP TABLE [dbo].[ГосЭкзамен];
IF OBJECT_ID(N'[dbo].[Защита]', N'U') IS NOT NULL DROP TABLE [dbo].[Защита];
IF OBJECT_ID(N'[dbo].[ВКР]', N'U') IS NOT NULL DROP TABLE [dbo].[ВКР];
IF OBJECT_ID(N'[dbo].[Практика]', N'U') IS NOT NULL DROP TABLE [dbo].[Практика];
IF OBJECT_ID(N'[dbo].[КурсоваяРабота]', N'U') IS NOT NULL DROP TABLE [dbo].[КурсоваяРабота];
IF OBJECT_ID(N'[dbo].[Аттестация]', N'U') IS NOT NULL DROP TABLE [dbo].[Аттестация];
IF OBJECT_ID(N'[dbo].[НазначениеПлана]', N'U') IS NOT NULL DROP TABLE [dbo].[НазначениеПлана];
IF OBJECT_ID(N'[dbo].[Студент]', N'U') IS NOT NULL DROP TABLE [dbo].[Студент];
IF OBJECT_ID(N'[dbo].[ПредседательГЭК]', N'U') IS NOT NULL DROP TABLE [dbo].[ПредседательГЭК];
IF OBJECT_ID(N'[dbo].[Дисциплина]', N'U') IS NOT NULL DROP TABLE [dbo].[Дисциплина];
IF OBJECT_ID(N'[dbo].[Семестр]', N'U') IS NOT NULL DROP TABLE [dbo].[Семестр];
IF OBJECT_ID(N'[dbo].[Группа]', N'U') IS NOT NULL DROP TABLE [dbo].[Группа];
IF OBJECT_ID(N'[dbo].[Пользователь]', N'U') IS NOT NULL DROP TABLE [dbo].[Пользователь];
GO

/* ===================== Справочники и пользователи ===================== */

CREATE TABLE [dbo].[Пользователь] (
  [id]            NVARCHAR(450) NOT NULL,
  [ЭлектроннаяПочта] NVARCHAR(450) NOT NULL,
  [ХешПароля]     NVARCHAR(MAX) NOT NULL,
  [Роль]          NVARCHAR(50)  NOT NULL,  -- STUDENT | TEACHER | HEAD
  [ФИО]           NVARCHAR(500) NOT NULL,
  [Должность]     NVARCHAR(500) NULL,
  [Активен]       BIT           NOT NULL CONSTRAINT [DF_Пользователь_Активен] DEFAULT (1),
  [ДатаСоздания]  DATETIME2     NOT NULL CONSTRAINT [DF_Пользователь_ДатаСоздания] DEFAULT (SYSUTCDATETIME()),
  [ДатаИзменения] DATETIME2     NOT NULL CONSTRAINT [DF_Пользователь_ДатаИзменения] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_Пользователь] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [UQ_Пользователь_ЭлектроннаяПочта] UNIQUE ([ЭлектроннаяПочта])
);
GO

CREATE TABLE [dbo].[Группа] (
  [id]            NVARCHAR(450) NOT NULL,
  [Название]      NVARCHAR(200) NOT NULL,
  [Специальность] NVARCHAR(500) NULL,
  [ГодНабора]     INT           NOT NULL,
  CONSTRAINT [PK_Группа] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [UQ_Группа_Название] UNIQUE ([Название])
);
GO

CREATE TABLE [dbo].[Студент] (
  [id]                   NVARCHAR(450) NOT NULL,
  [idПользователя]       NVARCHAR(450) NOT NULL,
  [idГруппы]             NVARCHAR(450) NOT NULL,
  [НомерЗачетнойКнижки]  NVARCHAR(100) NOT NULL,
  [ДатаРождения]         DATETIME2     NULL,
  [ДатаЗачисления]       DATETIME2     NOT NULL,
  [ТекущийКурс]          INT           NOT NULL CONSTRAINT [DF_Студент_ТекущийКурс] DEFAULT (1),
  [ПричинаАрхива]        NVARCHAR(50)  NULL,  -- EXPULSION | ACADEMIC_LEAVE
  CONSTRAINT [PK_Студент] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [UQ_Студент_idПользователя] UNIQUE ([idПользователя]),
  CONSTRAINT [UQ_Студент_НомерЗачетнойКнижки] UNIQUE ([НомерЗачетнойКнижки]),
  CONSTRAINT [FK_Студент_Пользователь] FOREIGN KEY ([idПользователя])
    REFERENCES [dbo].[Пользователь] ([id]) ON DELETE CASCADE,
  CONSTRAINT [FK_Студент_Группа] FOREIGN KEY ([idГруппы])
    REFERENCES [dbo].[Группа] ([id])
);
GO

CREATE TABLE [dbo].[Семестр] (
  [id]           NVARCHAR(450) NOT NULL,
  [Курс]         INT           NOT NULL,
  [Номер]        INT           NOT NULL,
  [УчебныйГод]   NVARCHAR(20)  NOT NULL,
  [ДатаНачала]   DATETIME2     NOT NULL,
  [ДатаОкончания] DATETIME2    NOT NULL,
  CONSTRAINT [PK_Семестр] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [UQ_Семестр_Курс_Номер_Год] UNIQUE ([Курс], [Номер], [УчебныйГод])
);
GO

CREATE TABLE [dbo].[Дисциплина] (
  [id]              NVARCHAR(450) NOT NULL,
  [Название]        NVARCHAR(500) NOT NULL,
  [ВсегоЧасов]      INT           NULL,
  [ЗачетныеЕдиницы] FLOAT         NULL,
  CONSTRAINT [PK_Дисциплина] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [UQ_Дисциплина_Название] UNIQUE ([Название])
);
GO

CREATE TABLE [dbo].[ПредседательГЭК] (
  [id]        NVARCHAR(450) NOT NULL,
  [ФИО]       NVARCHAR(500) NOT NULL,
  [Должность] NVARCHAR(500) NULL,
  [Год]       INT           NULL,
  [Активен]   BIT           NOT NULL CONSTRAINT [DF_ПредседательГЭК_Активен] DEFAULT (1),
  CONSTRAINT [PK_ПредседательГЭК] PRIMARY KEY CLUSTERED ([id])
);
GO

/* ===================== План преподавателя ===================== */

CREATE TABLE [dbo].[НазначениеПлана] (
  [id]              NVARCHAR(450) NOT NULL,
  [idПреподавателя] NVARCHAR(450) NOT NULL,
  [ТипНазначения]   NVARCHAR(50)  NOT NULL,  -- ASSESSMENT | COURSEWORK | PRACTICE | VKR
  [idСеместра]      NVARCHAR(450) NULL,
  [idДисциплины]    NVARCHAR(450) NULL,
  [idГруппы]        NVARCHAR(450) NULL,
  [idСтудента]      NVARCHAR(450) NULL,
  [Часы]            INT           NULL,
  CONSTRAINT [PK_НазначениеПлана] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [FK_НазначениеПлана_Преподаватель] FOREIGN KEY ([idПреподавателя])
    REFERENCES [dbo].[Пользователь] ([id]),
  CONSTRAINT [FK_НазначениеПлана_Семестр] FOREIGN KEY ([idСеместра])
    REFERENCES [dbo].[Семестр] ([id]),
  CONSTRAINT [FK_НазначениеПлана_Дисциплина] FOREIGN KEY ([idДисциплины])
    REFERENCES [dbo].[Дисциплина] ([id]),
  CONSTRAINT [FK_НазначениеПлана_Группа] FOREIGN KEY ([idГруппы])
    REFERENCES [dbo].[Группа] ([id]),
  CONSTRAINT [FK_НазначениеПлана_Студент] FOREIGN KEY ([idСтудента])
    REFERENCES [dbo].[Студент] ([id])
);
GO

/* ===================== Учебные результаты ===================== */

CREATE TABLE [dbo].[Аттестация] (
  [id]              NVARCHAR(450) NOT NULL,
  [idСтудента]      NVARCHAR(450) NOT NULL,
  [idСеместра]      NVARCHAR(450) NOT NULL,
  [idДисциплины]    NVARCHAR(450) NOT NULL,
  [idПреподавателя] NVARCHAR(450) NOT NULL,
  [ТипКонтроля]     NVARCHAR(50)  NOT NULL,  -- EXAM | CREDIT | GRADED_CREDIT
  [Оценка]          NVARCHAR(50)  NOT NULL,
  [Часы]            INT           NULL,
  [Дата]            DATETIME2     NOT NULL,
  CONSTRAINT [PK_Аттестация] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [FK_Аттестация_Студент] FOREIGN KEY ([idСтудента])
    REFERENCES [dbo].[Студент] ([id]) ON DELETE CASCADE,
  CONSTRAINT [FK_Аттестация_Семестр] FOREIGN KEY ([idСеместра])
    REFERENCES [dbo].[Семестр] ([id]),
  CONSTRAINT [FK_Аттестация_Дисциплина] FOREIGN KEY ([idДисциплины])
    REFERENCES [dbo].[Дисциплина] ([id]),
  CONSTRAINT [FK_Аттестация_Преподаватель] FOREIGN KEY ([idПреподавателя])
    REFERENCES [dbo].[Пользователь] ([id])
);
GO

CREATE TABLE [dbo].[КурсоваяРабота] (
  [id]              NVARCHAR(450) NOT NULL,
  [idСтудента]      NVARCHAR(450) NOT NULL,
  [idСеместра]      NVARCHAR(450) NOT NULL,
  [idДисциплины]    NVARCHAR(450) NOT NULL,
  [idПреподавателя] NVARCHAR(450) NOT NULL,
  [Тема]            NVARCHAR(MAX) NOT NULL,
  [Оценка]          NVARCHAR(50)  NULL,
  [Дата]            DATETIME2     NULL,
  CONSTRAINT [PK_КурсоваяРабота] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [FK_КурсоваяРабота_Студент] FOREIGN KEY ([idСтудента])
    REFERENCES [dbo].[Студент] ([id]) ON DELETE CASCADE,
  CONSTRAINT [FK_КурсоваяРабота_Семестр] FOREIGN KEY ([idСеместра])
    REFERENCES [dbo].[Семестр] ([id]),
  CONSTRAINT [FK_КурсоваяРабота_Дисциплина] FOREIGN KEY ([idДисциплины])
    REFERENCES [dbo].[Дисциплина] ([id]),
  CONSTRAINT [FK_КурсоваяРабота_Преподаватель] FOREIGN KEY ([idПреподавателя])
    REFERENCES [dbo].[Пользователь] ([id])
);
GO

CREATE TABLE [dbo].[Практика] (
  [id]              NVARCHAR(450) NOT NULL,
  [idСтудента]      NVARCHAR(450) NOT NULL,
  [idСеместра]      NVARCHAR(450) NOT NULL,
  [idПреподавателя] NVARCHAR(450) NOT NULL,
  [Курс]            INT           NOT NULL,
  [ВидПрактики]     NVARCHAR(50)  NOT NULL,  -- EDUCATIONAL | PRODUCTION | PREDIPLOMA
  [Место]           NVARCHAR(500) NOT NULL,
  [ДатаНачала]      DATETIME2     NOT NULL,
  [ДатаОкончания]   DATETIME2     NOT NULL,
  [Оценка]          NVARCHAR(50)  NULL,
  CONSTRAINT [PK_Практика] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [FK_Практика_Студент] FOREIGN KEY ([idСтудента])
    REFERENCES [dbo].[Студент] ([id]) ON DELETE CASCADE,
  CONSTRAINT [FK_Практика_Семестр] FOREIGN KEY ([idСеместра])
    REFERENCES [dbo].[Семестр] ([id]),
  CONSTRAINT [FK_Практика_Преподаватель] FOREIGN KEY ([idПреподавателя])
    REFERENCES [dbo].[Пользователь] ([id])
);
GO

/* ===================== ВКР и выпуск ===================== */

CREATE TABLE [dbo].[ВКР] (
  [id]              NVARCHAR(450) NOT NULL,
  [idСтудента]      NVARCHAR(450) NOT NULL,
  [idРуководителя]  NVARCHAR(450) NOT NULL,
  [Тема]            NVARCHAR(MAX) NOT NULL,
  [Вид]             NVARCHAR(200) NULL,
  [ДатаУтверждения] DATETIME2     NULL,
  CONSTRAINT [PK_ВКР] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [UQ_ВКР_idСтудента] UNIQUE ([idСтудента]),
  CONSTRAINT [FK_ВКР_Студент] FOREIGN KEY ([idСтудента])
    REFERENCES [dbo].[Студент] ([id]) ON DELETE CASCADE,
  CONSTRAINT [FK_ВКР_Руководитель] FOREIGN KEY ([idРуководителя])
    REFERENCES [dbo].[Пользователь] ([id])
);
GO

CREATE TABLE [dbo].[Защита] (
  [id]               NVARCHAR(450) NOT NULL,
  [idВКР]            NVARCHAR(450) NOT NULL,
  [Допуск]           NVARCHAR(50)  NOT NULL,  -- ADMITTED | NOT_ADMITTED
  [ДатаДопуска]      DATETIME2     NULL,
  [ДатаЗащиты]       DATETIME2     NULL,
  [Оценка]           NVARCHAR(50)  NULL,
  [idПредседателя]   NVARCHAR(450) NULL,
  CONSTRAINT [PK_Защита] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [UQ_Защита_idВКР] UNIQUE ([idВКР]),
  CONSTRAINT [FK_Защита_ВКР] FOREIGN KEY ([idВКР])
    REFERENCES [dbo].[ВКР] ([id]) ON DELETE CASCADE,
  CONSTRAINT [FK_Защита_Председатель] FOREIGN KEY ([idПредседателя])
    REFERENCES [dbo].[Пользователь] ([id])
);
GO

CREATE TABLE [dbo].[ГосЭкзамен] (
  [id]                  NVARCHAR(450) NOT NULL,
  [idСтудента]          NVARCHAR(450) NOT NULL,
  [Название]            NVARCHAR(500) NOT NULL,
  [Допуск]              NVARCHAR(50)  NOT NULL,
  [ДатаЭкзамена]        DATETIME2     NULL,
  [Оценка]              NVARCHAR(50)  NULL,
  [idПредседателя]      NVARCHAR(450) NULL,
  [idПредседателяГЭК]  NVARCHAR(450) NULL,
  CONSTRAINT [PK_ГосЭкзамен] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [FK_ГосЭкзамен_Студент] FOREIGN KEY ([idСтудента])
    REFERENCES [dbo].[Студент] ([id]),
  CONSTRAINT [FK_ГосЭкзамен_Председатель] FOREIGN KEY ([idПредседателя])
    REFERENCES [dbo].[Пользователь] ([id]),
  CONSTRAINT [FK_ГосЭкзамен_ПредседательГЭК] FOREIGN KEY ([idПредседателяГЭК])
    REFERENCES [dbo].[ПредседательГЭК] ([id])
);
GO

PRINT N'База [ЭлектроннаяЗачетка] создана. Для диаграммы: ПКМ по «Диаграммы базы данных» → Создать новую диаграмму.';
GO
