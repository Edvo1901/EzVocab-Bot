const { SlashCommandBuilder } = require('discord.js');
const config = require('../../../config/config.json');
const { listEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('schedule-status')
		.setDescription('Show scheduler settings and next-run policy.'),

	async execute(interaction) {
		const lines = [
			`Timezone: ${config.timezone || 'Australia/Adelaide'}`,
			`Daily word runs: ${(config.daily_word_times || ['09:00', '12:00', '16:00']).join(', ')}`,
			`Daily quiz run: ${config.daily_quiz_time || '20:00'}`,
			`Policy: Skip missed runs when bot is offline.`,
		];

		return interaction.reply({
			embeds: [listEmbed('Scheduler Status', lines)],
			flags: 64,
		});
	},
};
