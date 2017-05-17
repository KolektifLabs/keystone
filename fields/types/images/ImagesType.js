var _ = require('lodash');
var assign = require('object-assign');
var async = require('async');
var FieldType = require('../Type');
var keystone = require('../../../');
var util = require('util');
var storage;

function getEmptyValue () {
	return {
		filename: '',
		url: '',
		mimetype: '',
		size: 0,
	};
}

function truthy (value) {
	return value;
}

/**
 * CloudinaryImages FieldType Constructor
 */
function images (list, path, options) {
	this._underscoreMethods = ['format'];
	this._fixedSize = 'full';
	this._properties = ['select', 'selectPrefix', 'autoCleanup',];

	if (!options.storage) {
		throw new Error('Invalid Configuration\n\n'
			+ 'File fields (' + list.key + '.' + path + ') require storage to be provided.');
	}
	if (!options.storage.schema.url) {
		throw new Error('Invalid Configuration\n\n'
			+ 'File fields (' + list.key + '.' + path + ') require url to be set true in storage schema.');
	}
	storage = options.storage;
	images.super_.call(this, list, path, options);
}
images.properName = 'Images';
util.inherits(images, FieldType);


/**
 * Registers the field on the List's Mongoose Schema.
 */
images.prototype.addToSchema = function (schema) {

	var mongoose = keystone.mongoose;

	this.paths = {
		upload: this.path + '_upload',
		uploads: this.path + '_uploads',
		action: this.path + '_action',
	};

	var ImageSchema = new mongoose.Schema({
		filename: String,
		url: String,
		mimetype: String,
		size: Number,
	});

	schema.add(this._path.addTo({}, [ImageSchema]));
	this.bindUnderscoreMethods();
};

/**
 * Formats the field value
 */
images.prototype.format = function (item) {
	return _.map(item.get(this.path), function (img) {
		return img.src();
	}).join(', ');
};


/**
 * Gets the field's data from an Item, as used by the React components
 */
images.prototype.getData = function (item) {
	var value = item.get(this.path);
	return Array.isArray(value) ? value : [];
};

/**
 * Validates that a value for this field has been provided in a data object
 *
 * Deprecated
 */
images.prototype.inputIsValid = function (data) { // eslint-disable-line no-unused-vars
	// TODO - how should image field input be validated?
	return true;
};

/**
 * Updates the value for this field in the item from a data object
 */
images.prototype.updateItem = function (item, data, files, callback) {
	if (typeof files === 'function') {
		callback = files;
		files = {};
	} else if (!files) {
		files = {};
	}

	var field = this;
	var values = this.getValueFromData(data);

	// Early exit path: reset value when falsy, or bail if no value was provided
	if (!values) {
		if (values !== undefined) {
			item.set(field.path, []);
		}
		return process.nextTick(callback);
	}

	// When the value exists, but isn't an array, turn it into one (this just
	// means a single field was submitted in the formdata)
	if (!Array.isArray(values)) {
		values = [values];
	}


	// Preprocess values to deserialise JSON, detect mappings to uploaded files
	// and flatten out arrays
	values = values.map(function (value) {
		// When the value is a string, it may be JSON serialised data.
		if (typeof value === 'string'
			&& value.charAt(0) === '{'
			&& value.charAt(value.length - 1) === '}'
		) {
			try {
				return JSON.parse(value);
			} catch (e) { /* value isn't JSON */ }
		}
		if (typeof value === 'string') {
			// detect file upload (field value must be a reference to a field in the
			// uploaded files object provided by multer)
			if (value.substr(0, 7) === 'upload:') {
				var uploadFieldPath = value.substr(7);
				return files[uploadFieldPath];
			}
			// detect a URL or Base64 Data
			else if (/^(data:[a-z\/]+;base64)|(https?\:\/\/)/.test(value)) {
				return { path: value };
			}
		}
		return value;
	});
	values = _.flatten(values);
	async.map(values, function (value, next) {
		// if it is already uploaded
		if (typeof value === 'object' && 'filename' in value) {
			// Image data provided
			if (value.filename) {
				// Default the object with empty values
				var v = assign(getEmptyValue(), value);
				return next(null, v);
			} else {
				// file name is falsy, remove it
				return next();
			}
		} else if (typeof value === 'object' && value.path) {
			// File provided - upload it

			storage.uploadFile(value, function (err, result) {
				if (err) {
					next(err);
				} else {
					// console.log('[%s.%s] Uploaded file for item %s with result:', field.list.key, field.path, item.id, result);
					next(null, result);
				}
			});
		} else {
			return next();
		}
	}, function (err, result) {
		if (err) return callback(err);
		result = result.filter(truthy);
		item.set(field.path, result);
		return callback();
	});
};

module.exports = images;
