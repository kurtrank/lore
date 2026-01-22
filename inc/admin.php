<?php

namespace Lore;

use function wp_enqueue_script;
use function add_action;
use function get_current_screen;
use function get_post_meta;
use function get_registered_meta_keys;
use function get_the_title;

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

		$field_type = $current_field['show_in_rest']['schema']['field']['type'] ?? null;
		if ( $field_type && 'post-combobox' === $field_type ) {
			$value = get_the_title( $value ) . " (ID: $value)";
		}

		echo $value;
	}
}

function admin_posts_filter() {
	$post_type = $_GET['post_type'] ?? false;

	$meta_fields = get_registered_meta_keys( 'post', $post_type );
	foreach ( $meta_fields as $key => $field ) {
		$show_filter = $field['show_in_rest']['schema']['field']['admin_filter'] ?? false;
		$field_type  = $field['show_in_rest']['schema']['field']['type'] ?? false;
		if ( $show_filter && in_array( $field_type, array( 'select', 'toggle', 'post-combobox' ), true ) ) {
			$get_arg = "m__{$key}";
			$label   = $field['show_in_rest']['schema']['field']['label'] ?? $key;

			$values = array();

			switch ( $field_type ) {
				case 'select':
					$values = $field['show_in_rest']['schema']['field']['options'];
					break;

				case 'toggle':
					$values = array(
						array(
							'value' => '1',
							'label' => 'True',
						),
						array(
							'value' => '0',
							'label' => 'False',
						),
					);
					break;

				case 'post-combobox':
					global $wpdb;

					$data = $wpdb->get_results( $wpdb->prepare( "SELECT DISTINCT m.meta_value, p.post_title FROM $wpdb->postmeta m INNER JOIN $wpdb->posts p on m.meta_value = p.ID WHERE meta_key = %s", $key ), ARRAY_N );

					$result = array();

					foreach ( $data as $array ) {
						$result[] = array(
							'value' => $array[0],
							'label' => $array[1],
						);
					}

					$values = $result;
					break;
				default:
					break;
			}
			?>
			<label class="screen-reader-text" for="filter-by-<?php echo $key; ?>">Filter by <?php echo $label; ?></label>
			<select id="filter-by-<?php echo $key; ?>" name="<?php echo $get_arg; ?>">
				<option value="">All <?php echo $label; ?></option>
				<?php
					$current_v = isset( $_GET[ $get_arg ] ) ? $_GET[ $get_arg ] : '';
				foreach ( $values as $option ) {
					printf(
						'<option value="%s"%s>%s</option>',
						$option['value'],
						$option['value'] === $current_v ? ' selected="selected"' : '',
						$option['label']
					);
				}
				?>
			</select>
			<?php
		}
	}
}

add_action( 'restrict_manage_posts', __NAMESPACE__ . '\admin_posts_filter' );


function posts_filter( $query ) {
	global $pagenow;

	$post_type = $_GET['post_type'] ?? false;

	$meta_fields = get_registered_meta_keys( 'post', $post_type );
	foreach ( $meta_fields as $key => $field ) {
		$show_filter = $field['show_in_rest']['schema']['field']['admin_filter'] ?? false;

		$field_type = $field['type'] ?? null;

		$arg_key = "m__{$key}";

		if ( $show_filter && is_admin() && 'edit.php' === $pagenow && isset( $_GET[ $arg_key ] ) && '' !== $_GET[ $arg_key ] ) {
			$value = 'boolean' === $field_type && '0' === $_GET[ $arg_key ] ? '' : $_GET[ $arg_key ];

			$query->query_vars['meta_key']   = $key;
			$query->query_vars['meta_value'] = $value;
		}
	}
}

add_filter( 'parse_query', __NAMESPACE__ . '\posts_filter' );