# EzVocabBot

EzVocabBot is a personal Discord vocabulary assistant focused on English (or any language of your choice) improvement, daily practice, and quiz repetition.

The bot is built with:
- JavaScript (`CommonJS`)
- `discord.js`
- Microsoft SQL Server (`mssql`)

## What this bot does

- Daily vocabulary delivery to a configured channel
- Persistent quiz flow with:
  - multiple-choice questions
  - type-matching distractors (noun with noun, sentence with sentence, etc.)
  - typing repetition (3 correct submits per question)
- Vocabulary management via slash commands + modals
- Tense/grammar management via slash commands + modals
- **Sentence structure patterns** (e.g. IF conditionals): separate bank from tenses; daily embed at a configurable time (default `18:00`) to a dedicated channel; **no quiz**
- **Tense quiz** (separate from vocab quiz): sentence + four tense labels + explanation; JSON bank; scheduled MCQ-only flow in a dedicated channel
- Case-insensitive duplicate protection by `(text, type)`

## Current features

### Vocabulary commands

- `/add-word` - open modal and add one word/sentence
- `/update-word id:<id>` - update an existing entry
- `/delete-word id:<id>` - hard delete by ID
- `/search-word text:<query>` - search entries by text
- `/word-by-id id:<id>` - get full detail for one entry
- `/import-json file:<attachment>` - bulk import from JSON array

### Quiz and scheduler commands

- `/quiz-now` - start a quiz immediately in **current** channel
- `/daily-now` - trigger a daily word immediately (configured daily word channel)
- `/schedule-status` - view scheduler settings

Developer-only (`developerid` in config):

- `/test-vocab` - same as scheduled daily word post (uses `daily_word_channel_id`)
- `/test-tense` - same as scheduled daily tense post (uses `daily_tense_channel_id`)
- `/test-vocab-quiz` - same as scheduled daily quiz (uses `quiz_channel_id`; skips if a quiz is already active)
- `/test-tense-quiz` - same as scheduled tense quiz (uses `tense_quiz_channel_id`; skips if a tense quiz is already active there)
- `/test-sentence-structure` - same as scheduled daily sentence structure post (uses `daily_sentence_structure_channel_id`)

### Sentence structure commands

Patterns are stored separately from verb tenses. There is **no quiz** for this category.

- `/add-sentence-structure` - open modal and add one pattern
- `/update-sentence-structure id:<id>` - update an existing pattern
- `/delete-sentence-structure id:<id>` - hard delete by ID
- `/search-sentence-structure text:<query>` - search patterns by name
- `/sentence-structure-by-id id:<id>` - full detail for one pattern
- `/import-sentence-structure-json file:<attachment>` - bulk import from JSON array

### Tense commands

- `/add-tense` - open modal and add one tense item
- `/update-tense id:<id>` - update an existing tense entry
- `/delete-tense id:<id>` - hard delete tense by ID
- `/search-tense text:<query>` - search tenses by name
- `/tense-by-id id:<id>` - get full detail for one tense
- `/import-tense-json file:<attachment>` - bulk tense import from JSON array
- `/import-tense-quiz-json file:<attachment>` - bulk import tense **quiz** questions (see format below)

### Scheduling behavior

- Timezone: `Australia/Adelaide`
- Daily words at `09:00`, `12:00`, `16:00`
- Daily tense at configured `daily_tense_time` (default `09:00`)
- Daily sentence structure at configured `daily_sentence_structure_time` (default `18:00`, channel `daily_sentence_structure_channel_id`)
- Vocabulary quiz at configured `daily_quiz_time` (channel `quiz_channel_id`)
- Tense quiz at configured `daily_tense_quiz_time` (channel `tense_quiz_channel_id`; keep separate from vocab quiz channel so both can run)
- Missed tasks while bot is offline are skipped (no backfill)

## Setup

### 1) Install requirements

- Node.js 20+
- SQL Server (Express is fine)
- A Discord bot application/token

Install dependencies:

```bash
npm install
```

### 2) Configure bot settings

Create `config/config.json` from `config/config.EXAMPLE.json` and fill all required values.

Important keys:
- Discord:
  - `token`
  - `daily_word_channel_id`
  - `daily_tense_channel_id`
  - `daily_sentence_structure_channel_id`
  - `quiz_channel_id`
  - `tense_quiz_channel_id`
  - `botlogs_channel`
- Scheduler:
  - `timezone`
  - `daily_word_times`
  - `daily_tense_time`
  - `daily_sentence_structure_time`
  - `daily_quiz_time`
  - `daily_tense_quiz_time`
  - `tense_quiz_question_count`
- SQL:
  - `db.server`
  - `db.database`
  - `db.user`
  - `db.password`
  - `db.port`
  - `db.encrypt`
  - `db.trustServerCertificate`

> `config/config.json` is gitignored. Do not commit secrets.

### 3) Discord application permissions

When generating the invite URL, use scopes:
- `bot`
- `applications.commands`

Minimum bot permissions:
- View Channels
- Send Messages
- Embed Links
- Read Message History

### 4) SQL connection notes (Windows / named instance)

If you use a named instance and get connection timeouts:
- Prefer host + explicit port in config:
  - `server: "localhost"`
  - `port: <instance_tcp_port>`
- Ensure TCP/IP is enabled for the SQL instance and SQL service was restarted.

### 5) Start bot

```bash
npm start
```

Expected startup logs include:
- bot login success
- command registration success
- database schema initialization
- scheduler armed message

## JSON import format

Use an array of objects:

```json
[
  {
    "text": "feature",
    "type": "noun",
    "vi_definition": "tinh nang; dac diem",
    "examples": [
      "This app has a useful feature."
    ]
  },
  {
    "text": "light the mood up",
    "type": "sentence",
    "vi_definition": "lam khong khi vui len",
    "examples": [
      "A joke can light the mood up."
    ]
  }
]
```

## Sentence structure JSON import format

Use an array of objects. You may use **`meaning`** instead of **`meaning_note`** if you prefer.

```json
[
  {
    "name": "First conditional (IF Type 1)",
    "structure": "If + S + present simple, S + will + V",
    "meaning_note": "Real or very likely situations in the future.",
    "examples": [
      "If it rains, we will stay home.",
      "If you study hard, you will pass."
    ]
  },
  {
    "name": "Second conditional",
    "structure": "If + S + past simple, S + would + V",
    "meaning": "Unreal or hypothetical present/future.",
    "examples": ["If I won the lottery, I would travel the world."]
  }
]
```

## Tense JSON import format

Use an array of objects:

```json
[
  {
    "name": "Simple Past",
    "structure": "S + V2/ed",
    "usage_note": "Used for completed actions in the past.",
    "examples": [
      "I visited my friend yesterday.",
      "She finished her homework last night."
    ]
  },
  {
    "name": "Past Continuous",
    "structure": "S + was/were + V-ing",
    "usage_note": "Used for an action in progress at a specific time in the past.",
    "examples": [
      "I was studying at 8 PM.",
      "They were playing football when it started to rain."
    ]
  }
]
```

## Tense quiz JSON import format

Use an **array** of objects. Each question has exactly four options in order A–D; `correct_index` is `0`–`3`.

```json
[
  {
    "sentence": "By this time tomorrow, I will have finished the report.",
    "options": [
      "Future Perfect",
      "Future Continuous",
      "Present Perfect",
      "Simple Future"
    ],
    "correct_index": 0,
    "explanation": "Future Perfect describes an action that will be completed before a specific future time ('by this time tomorrow')."
  }
]
```

After each answer, the bot replies privately (ephemeral) with feedback, the explanation, and a **Next** button. The final score is posted to the channel when you finish.

## Notes

- IDs are first-class: displayed as `Text (ID: n)` for update/delete workflows.
- `sentence` is supported as a normal type.
- Type aliases are supported in forms (for example: `adv` -> `adverb`, `adj` -> `adjective`).
