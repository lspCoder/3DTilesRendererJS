// I3DM File Format
// https://github.com/CesiumGS/3d-tiles/blob/master/specification/TileFormats/Instanced3DModel/README.md

import { FeatureTable, BatchTable } from '../utilities/FeatureTable.js';
import { arrayToString } from '../utilities/arrayToString.js';

export class I3DMLoaderBase {

	constructor() {

		this.fetchOptions = {};

	}

	load( url ) {

		return fetch( url, this.fetchOptions )
			.then( res => {

				if ( ! res.ok ) {

					throw new Error( `Failed to load file "${ url }" with status ${ res.status } : ${ res.statusText }` );

				}
				return res.arrayBuffer();

			} )
			.then( buffer => this.parse( buffer ) );

	}

	parse( buffer ) {

		const dataView = new DataView( buffer );

		// 32-byte header

		// 4 bytes
		const magic =
			String.fromCharCode( dataView.getUint8( 0 ) ) +
			String.fromCharCode( dataView.getUint8( 1 ) ) +
			String.fromCharCode( dataView.getUint8( 2 ) ) +
			String.fromCharCode( dataView.getUint8( 3 ) );

		console.assert( magic === 'i3dm' );

		// 4 bytes
		const version = dataView.getUint32( 4, true );

		console.assert( version === 1 );

		// 4 bytes
		const byteLength = dataView.getUint32( 8, true );

		console.assert( byteLength === buffer.byteLength );

		// 4 bytes
		const featureTableJSONByteLength = dataView.getUint32( 12, true );

		// 4 bytes
		const featureTableBinaryByteLength = dataView.getUint32( 16, true );

		// 4 bytes
		const batchTableJSONByteLength = dataView.getUint32( 20, true );

		// 4 bytes
		const batchTableBinaryByteLength = dataView.getUint32( 24, true );

		// 4 bytes
		const gltfFormat = dataView.getUint32( 28, true );

		// Feature Table
		const featureTableStart = 32;
		const featureTable = new FeatureTable( buffer, featureTableStart, featureTableJSONByteLength, featureTableBinaryByteLength );

		// Batch Table
		const batchLength = featureTable.getData( 'INSTANCES_LENGTH' );
		const batchTableStart = featureTableStart + featureTableJSONByteLength + featureTableBinaryByteLength;
		const batchTable = new BatchTable( buffer, batchLength, batchTableStart, batchTableJSONByteLength, batchTableBinaryByteLength );

		const glbStart = batchTableStart + batchTableJSONByteLength + batchTableBinaryByteLength;
		const bodyBytes = new Uint8Array( buffer, glbStart, byteLength - glbStart );

		let glbBytes = null;
		let promise = null;
		if ( gltfFormat ) {

			glbBytes = bodyBytes;
			promise = Promise.resolve();

		} else {

			const externalUri = arrayToString( bodyBytes );
			promise = fetch( externalUri, this.fetchOptions )
				.then( res => res.buffer )
				.then( buffer => {

					glbBytes = new Uint8Array( buffer );

				} );

		}

		return promise.then( () => {

			return {
				version,
				featureTable,
				batchTable,
				glbBytes,
			};

		} );

	}

}

