<?php

namespace Lore;

use function wp_enqueue_script;
use function add_action;

function enqueue_block_editor_assets() {
	$asset_path = plugin_dir( '/build/index.asset.php' );

	if ( file_exists( $asset_path ) ) {
		$asset_file = include plugin_dir( '/build/index.asset.php' );
		wp_enqueue_script(
			'lore-edit-sidebar',
			plugin_url( '/build/index.js' ),
			$asset_file['dependencies'],
			$asset_file['version']
		);
	}

	$asset_path = plugin_dir( '/build/index.asset.php' );

	wp_enqueue_style(
		'lore-edit-sidebar',
		plugin_url( 'build/index.css' ),
		array(),
		LORE_VERSION,
	);
}

add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\enqueue_block_editor_assets', 100 );
