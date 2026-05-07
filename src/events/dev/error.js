const { Events } = require('discord.js');

module.exports = {
	name: Events.Error,
	once: false,
	execute(info) {
		console.error(info);
	},
};
