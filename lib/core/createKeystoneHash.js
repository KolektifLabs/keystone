var crypto = require('crypto');
var forEach = require('lodash/forEach');

function createKeystoneHash () {
	var hash = crypto.createHash('md5');
	hash.update(this.version);
	forEach(this.lists, function (list, key) {
		try {
			hash.update(JSON.stringify(list.getOptions()));
		} catch (e) {
			console.log(key + ' is mis configured!');
			throw e;
		}

	});

	return hash.digest('hex').slice(0, 6);
}

module.exports = createKeystoneHash;
