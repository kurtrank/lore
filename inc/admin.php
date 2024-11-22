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

function register_admin_columns( $defaults ) {
	$page = get_current_screen();

	$post_type = $page->post_type ?? false;

	$meta_fields = get_registered_meta_keys( 'post', $post_type );

	foreach ( $meta_fields as $key => $field ) {
		$show_column = $field['show_in_rest']['schema']['field']['admin_column'] ?? false;
		if ( $show_column ) {
			$label            = $field['show_in_rest']['schema']['field']['label'] ?? $key;
			$defaults[ $key ] = $label;
		}
	}

	return $defaults;
}

function populate_admin_column_value( $column_name, $post_id ) {
	$page = get_current_screen();

	$post_type = $page->post_type ?? false;

	$meta_fields = get_registered_meta_keys( 'post', $post_type );

	$current_field = $meta_fields[ $column_name ];

	if ( $current_field ) {
		$value = get_post_meta( $post_id, $column_name, $current_field['single'] );

		echo $value;
	}
}
