import React from 'react';
import ImageSummary from '../../components/columns/ImageSummary';
import ItemsTableCell from '../../components/ItemsTableCell';
import ItemsTableValue from '../../components/ItemsTableValue';

const ImageColumn = React.createClass({
	displayName: 'ImageColumn',
	propTypes: {
		col: React.PropTypes.object,
		data: React.PropTypes.object,
	},
	renderValue: function () {
		// get the data of the image  { filename: 'xx', url: 'tt' }
		const value = this.props.data.fields[this.props.col.path];
		if (!value || !Object.keys(value).length) return;

		return (
			<ItemsTableValue field={this.props.col.type}>
				<ImageSummary label="summary" image={value} />
			</ItemsTableValue>
		);

	},
	render () {
		return (
			<ItemsTableCell>
				{this.renderValue()}
			</ItemsTableCell>
		);
	},
});

module.exports = ImageColumn;
