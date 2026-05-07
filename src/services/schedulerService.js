const cron = require('node-cron');
const config = require('../../config/config.json');
const vocabRepository = require('./db/vocabRepository');
const tenseRepository = require('./db/tenseRepository');
const { dailyWordEmbed, dailyTenseEmbed, errorEmbed } = require('./embedTemplates');
const quizService = require('./quizService');
const tenseQuizService = require('./tenseQuizService');

const scheduledTasks = [];

function parseTime(time) {
	const [hour, minute] = String(time).split(':').map(Number);
	return { hour, minute };
}

function scheduleAtTime(time, timezone, callback) {
	const { hour, minute } = parseTime(time);
	const expression = `${minute} ${hour} * * *`;
	const task = cron.schedule(
		expression,
		async () => {
			try {
				await callback();
			} catch (error) {
				console.error(`Scheduler task failed for ${time}:`, error);
			}
		},
		{
			scheduled: true,
			timezone,
		},
	);
	scheduledTasks.push(task);
}

async function postDailyWord(client) {
	const channelId = config.daily_word_channel_id;
	const channel = await client.channels.fetch(channelId).catch(() => null);
	if (!channel) {
		console.warn(`Daily word channel ${channelId} not found.`);
		return;
	}

	const item = await vocabRepository.getRandomVocabItem();
	if (!item) {
		await channel.send({
			embeds: [errorEmbed('No vocabulary found', 'Add vocabulary before running daily words.')],
		});
		return;
	}

	await channel.send({ embeds: [dailyWordEmbed(item)] });
	await vocabRepository.markAsShowed(item.id);
}

async function postDailyQuiz(client) {
	const channelId = config.quiz_channel_id;
	const channel = await client.channels.fetch(channelId).catch(() => null);
	if (!channel) {
		console.warn(`Quiz channel ${channelId} not found.`);
		return;
	}

	const sessionResult = await quizService.createQuizSessionForChannel(channelId);
	if (sessionResult.error) {
		await channel.send({ embeds: [errorEmbed('Quiz setup failed', sessionResult.error)] });
		return;
	}
	if (sessionResult.alreadyActive) {
		return;
	}

	await quizService.postCurrentQuestion(channel, sessionResult.sessionId);
}

async function postDailyTenseQuiz(client) {
	const channelId = config.tense_quiz_channel_id;
	const channel = await client.channels.fetch(channelId).catch(() => null);
	if (!channel) {
		console.warn(`Tense quiz channel ${channelId} not found.`);
		return;
	}

	const sessionResult = await tenseQuizService.createTenseQuizSessionForChannel(channelId);
	if (sessionResult.error) {
		await channel.send({
			embeds: [errorEmbed('Tense quiz setup failed', sessionResult.error)],
		});
		return;
	}
	if (sessionResult.alreadyActive) {
		return;
	}

	await tenseQuizService.postCurrentTenseQuestion(channel, sessionResult.sessionId);
}

async function postDailyTense(client) {
	const channelId = config.daily_tense_channel_id;
	const channel = await client.channels.fetch(channelId).catch(() => null);
	if (!channel) {
		console.warn(`Daily tense channel ${channelId} not found.`);
		return;
	}

	const item = await tenseRepository.getRandomTenseItem();
	if (!item) {
		await channel.send({
			embeds: [errorEmbed('No tense found', 'Add tense records before running daily tense.')],
		});
		return;
	}

	await channel.send({ embeds: [dailyTenseEmbed(item)] });
	await tenseRepository.markAsShowed(item.id);
}

async function initialize(client) {
	const timezone = config.timezone || 'Australia/Adelaide';
	const times = config.daily_word_times || ['09:00', '12:00', '16:00'];
	const tenseTime = config.daily_tense_time || '09:00';
	const quizTime = config.daily_quiz_time || '20:00';
	const tenseQuizTime = config.daily_tense_quiz_time || '20:30';

	for (const task of scheduledTasks) {
		task.stop();
	}
	scheduledTasks.length = 0;

	times.forEach((time) => {
		scheduleAtTime(time, timezone, () => postDailyWord(client));
	});
	scheduleAtTime(tenseTime, timezone, () => postDailyTense(client));
	scheduleAtTime(quizTime, timezone, () => postDailyQuiz(client));
	scheduleAtTime(tenseQuizTime, timezone, () => postDailyTenseQuiz(client));

	console.log(
		`Scheduler armed (${timezone}) | daily words: ${times.join(', ')} | daily tense: ${tenseTime} | vocab quiz: ${quizTime} | tense quiz: ${tenseQuizTime}`,
	);
}

module.exports = {
	initialize,
	postDailyWord,
	postDailyTense,
	postDailyQuiz,
	postDailyTenseQuiz,
};
