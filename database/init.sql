IF OBJECT_ID('dbo.vocab_items', 'U') IS NULL
BEGIN
	CREATE TABLE dbo.vocab_items (
		id INT IDENTITY(1,1) PRIMARY KEY,
		[text] NVARCHAR(255) NOT NULL,
		[type] NVARCHAR(50) NOT NULL,
		vi_definition NVARCHAR(2000) NOT NULL,
		examples_json NVARCHAR(MAX) NOT NULL DEFAULT '[]',
		is_showed BIT NOT NULL DEFAULT 0,
		created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
		updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
	);
END;

IF COL_LENGTH('dbo.vocab_items', 'normalized_text') IS NULL
BEGIN
	ALTER TABLE dbo.vocab_items
	ADD normalized_text AS LOWER(LTRIM(RTRIM([text]))) PERSISTED;
END;

IF COL_LENGTH('dbo.vocab_items', 'normalized_type') IS NULL
BEGIN
	ALTER TABLE dbo.vocab_items
	ADD normalized_type AS LOWER(LTRIM(RTRIM([type]))) PERSISTED;
END;

IF NOT EXISTS (
	SELECT 1
	FROM sys.indexes
	WHERE name = 'UX_vocab_items_normalized_text_type'
		AND object_id = OBJECT_ID('dbo.vocab_items')
)
BEGIN
	CREATE UNIQUE INDEX UX_vocab_items_normalized_text_type
	ON dbo.vocab_items(normalized_text, normalized_type);
END;

IF OBJECT_ID('dbo.quiz_sessions', 'U') IS NULL
BEGIN
	CREATE TABLE dbo.quiz_sessions (
		id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
		channel_id NVARCHAR(64) NOT NULL,
		status NVARCHAR(20) NOT NULL,
		current_question_index INT NOT NULL DEFAULT 0,
		phase NVARCHAR(20) NOT NULL DEFAULT 'mcq',
		typing_progress INT NOT NULL DEFAULT 0,
		question_count INT NOT NULL DEFAULT 3,
		typing_repetitions INT NOT NULL DEFAULT 3,
		created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
		completed_at DATETIME2 NULL
	);
END;

IF OBJECT_ID('dbo.quiz_session_items', 'U') IS NULL
BEGIN
	CREATE TABLE dbo.quiz_session_items (
		id INT IDENTITY(1,1) PRIMARY KEY,
		session_id UNIQUEIDENTIFIER NOT NULL,
		question_order INT NOT NULL,
		vocab_id INT NOT NULL,
		prompt_vi NVARCHAR(2000) NOT NULL,
		option_a_id INT NOT NULL,
		option_b_id INT NOT NULL,
		option_c_id INT NOT NULL,
		option_d_id INT NOT NULL,
		correct_option CHAR(1) NOT NULL,
		mcq_answered BIT NOT NULL DEFAULT 0,
		mcq_is_correct BIT NULL,
		answered_option CHAR(1) NULL,
		created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
	);
END;

IF OBJECT_ID('dbo.quiz_attempts', 'U') IS NULL
BEGIN
	CREATE TABLE dbo.quiz_attempts (
		id INT IDENTITY(1,1) PRIMARY KEY,
		session_id UNIQUEIDENTIFIER NOT NULL,
		question_order INT NOT NULL,
		attempt_type NVARCHAR(20) NOT NULL,
		is_correct BIT NOT NULL,
		user_input NVARCHAR(500) NULL,
		created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
	);
END;
