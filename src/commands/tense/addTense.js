const {
	SlashCommandBuilder,
	ModalBuilder,
	ActionRowBuilder,
	TextInputBuilder,
	TextInputStyle,
} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-tense')
		.setDescription('Add a new tense item using a modal form.'),

	async execute(interaction) {
		const modal = new ModalBuilder().setCustomId('tense:add').setTitle('Add Tense');

		const nameInput = new TextInputBuilder()
			.setCustomId('name')
			.setLabel('Tense name')
			.setStyle(TextInputStyle.Short)
			.setRequired(true)
			.setMaxLength(255);

		const structureInput = new TextInputBuilder()
			.setCustomId('structure')
			.setLabel('Sentence structure')
			.setStyle(TextInputStyle.Short)
			.setRequired(true)
			.setMaxLength(500);

		const usageInput = new TextInputBuilder()
			.setCustomId('usage_note')
			.setLabel('When to use')
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(true)
			.setMaxLength(2000);

		const examplesInput = new TextInputBuilder()
			.setCustomId('examples')
			.setLabel('Examples (one per line)')
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(false)
			.setMaxLength(2000);

		modal.addComponents(
			new ActionRowBuilder().addComponents(nameInput),
			new ActionRowBuilder().addComponents(structureInput),
			new ActionRowBuilder().addComponents(usageInput),
			new ActionRowBuilder().addComponents(examplesInput),
		);

		return interaction.showModal(modal);
	},
};
