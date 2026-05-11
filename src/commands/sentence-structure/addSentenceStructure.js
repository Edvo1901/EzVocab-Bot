const {
	SlashCommandBuilder,
	ModalBuilder,
	ActionRowBuilder,
	TextInputBuilder,
	TextInputStyle,
} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-sentence-structure')
		.setDescription('Add a sentence structure pattern using a modal form.'),

	async execute(interaction) {
		const modal = new ModalBuilder()
			.setCustomId('sentence-structure:add')
			.setTitle('Add Sentence Structure');

		const nameInput = new TextInputBuilder()
			.setCustomId('name')
			.setLabel('Pattern name')
			.setStyle(TextInputStyle.Short)
			.setRequired(true)
			.setMaxLength(255);

		const structureInput = new TextInputBuilder()
			.setCustomId('structure')
			.setLabel('Sentence structure formula')
			.setStyle(TextInputStyle.Short)
			.setRequired(true)
			.setMaxLength(500);

		const meaningInput = new TextInputBuilder()
			.setCustomId('meaning_note')
			.setLabel('Meaning / notes')
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
			new ActionRowBuilder().addComponents(meaningInput),
			new ActionRowBuilder().addComponents(examplesInput),
		);

		return interaction.showModal(modal);
	},
};
