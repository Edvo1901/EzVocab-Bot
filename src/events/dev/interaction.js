const { Events } = require('discord.js');
const { createEmbed } = require('../../utils/embedBuilder');
const config = require('../../../config/config.json');

module.exports = {
	name: Events.InteractionCreate,
	once: false,
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
			await logCommandInteraction(interaction);
		} else if (interaction.isButton()) {
			await logButtonInteraction(interaction);
		}
	},
};

async function logCommandInteraction(interaction) {
	const userId = interaction.user.id;
	const args = interaction.options ? interaction.options.data : [];

	const argsString =
		args.length > 0
			? args
					.map((arg) => {
						return `- *${arg.name}*: \`${arg.value}\``;
					})
					.join('\n')
			: '`null`';

	const embedOptions = {
		fields: [
			{
				name: 'Channel',
				value: `<#${interaction.channel.id}>`,
				inline: true,
			},
			{
				name: 'User',
				value: `<@${userId}> (${userId})`,
				inline: false,
			},
			{
				name: 'Command',
				value: `\`${interaction.commandName}\``,
				inline: false,
			},
			{
				name: 'Arguments',
				value: argsString,
				inline: false,
			},
		],
		titleText: '**Command Used**',
	};

	const embedLog = createEmbed(embedOptions);

	const logChannel = interaction.client.channels.cache.get(
		config.botlogs_channel,
	);
	if (logChannel) {
		await logChannel.send({ embeds: [embedLog] });
	}
}

async function logButtonInteraction(interaction) {
	const userId = interaction.user.id;

	const embedOptions = {
		fields: [
			{
				name: 'Channel',
				value: `<#${interaction.channel.id}>`,
				inline: true,
			},
			{
				name: 'User',
				value: `<@${userId}> (${userId})`,
				inline: false,
			},
			{
				name: 'Button',
				value: `\`${interaction.customId}\``,
				inline: false,
			},
		],
		titleText: '**Button Used**',
	};

	const embedLog = createEmbed(embedOptions);

	const logChannel = interaction.client.channels.cache.get(
		config.botlogs_channel,
	);
	if (logChannel) {
		await logChannel.send({ embeds: [embedLog] });
	}
}
