<?php

namespace Lore;

use function add_action;
use function register_post_meta;
use function register_taxonomy;
use function register_post_type;
use function flush_rewrite_rules;
use function apply_filters;

$lore_in_view_context = true;

// Flush rewrite rules for custom post types
function flush_rewrite() {
	flush_rewrite_rules();
}
add_action( 'after_switch_theme', __NAMESPACE__ . '\flush_rewrite_rules' );

// Register taxonomies
function register_taxonomies() {

	$directories = apply_filters( 'lore/taxonomy_locations', array() );

	if ( is_array( $directories ) ) {
		foreach ( $directories as $directory ) {
			if ( is_dir( $directory ) ) {
				$post_taxonomies = get_file_list( $directory, 'json', true );

				foreach ( $post_taxonomies as $taxonomy ) {
					$taxonomy_args = json_decode( file_get_contents( "{$directory}/{$taxonomy}.json" ), true );

					register_taxonomy( $taxonomy, false, $taxonomy_args );
				}
			}
		}
	}
}
add_action( 'init', __NAMESPACE__ . '\register_taxonomies', 5 );

// Register custom post types
function register_post_types() {

	$directories = apply_filters( 'lore/post_type_locations', array() );

	if ( is_array( $directories ) ) {
		foreach ( $directories as $directory ) {
			if ( is_dir( $directory ) ) {
				$post_types = get_file_list( $directory, 'json', true );

				foreach ( $post_types as $post_type ) {
					$post_type_args = json_decode( file_get_contents( "{$directory}/{$post_type}.json" ), true );
					// $icon_file                   = get_template_directory() . '/inc/fa-icons/solid/' . $post_type_args['menu_icon'] . '.svg';
					// $icon_markup                 = str_replace( '<path', '<path fill="#9EA3A8"', file_get_contents( $icon_file ) );
					// $post_type_args['menu_icon'] = 'data:image/svg+xml;base64,' . base64_encode( $icon_markup );

					$fields = $post_type_args['meta'] ?? false;

					if ( $fields ) {
						foreach ( $fields as $name => $options ) {
							register_post_meta(
								$post_type,
								$name,
								$options
							);
						}
					}

					unset( $post_type_args['meta'] );

					register_post_type( $post_type, $post_type_args );
				}
			}
		}
	}
}
add_action( 'init', __NAMESPACE__ . '\register_post_types', 5 );

add_filter( 'rest_pre_dispatch', __NAMESPACE__ . '\maybe_skip_format', 10, 3 );
function maybe_skip_format( $result, $server, $request ) {
	global $lore_in_view_context;

	$context = $request->get_param( 'context' );

	if ( ! in_array( $context, array( 'view', null ), true ) || 'GET' !== $request->get_method() ) {
		$lore_in_view_context = false;
	}
	return $result;
}

function format_value( $value, $object_id, $meta_key, $single, $object_type ) {
	global $lore_in_view_context;

	if ( ! $lore_in_view_context ) {
		// skip doing anything, as we just want the raw value stored in db
		return $value;
	}

	// Here is the catch, add additional controls if needed (post_type, etc)
	$meta = \get_registered_meta_keys( 'post', 'site' );

	$meta_field = $meta[ $meta_key ] ?? false;

	$maybe_format = $meta_field['show_in_rest']['schema']['field'] ?? false;

	if ( $maybe_format ) {

		remove_filter( 'get_post_metadata', __NAMESPACE__ . '\format_value', 100 );
		$current_meta = get_metadata( $object_type, $object_id, $meta_key, $single );
		add_filter( 'get_post_metadata', __NAMESPACE__ . '\format_value', 100, 5 );

		if ( isset( $meta_field['show_in_rest']['schema']['return_format_cb'] ) ) {
			if ( $single ) {
				$current_meta = call_user_func(
					$meta_field['show_in_rest']['schema']['return_format_cb'],
					$current_meta,
					$meta_key,
					$meta_field
				);
			} else {
				$value = array();
				if ( is_array( $current_meta ) ) {
					foreach ( $current_meta as $row ) {
						$value[] = call_user_func(
							$meta_field['show_in_rest']['schema']['return_format_cb'],
							$row,
							$meta_key,
							$meta_field
						);
					}
				}
				$current_meta = $value;
			}
		}

		if ( true === $single && in_array( $meta_field['type'], array( 'array', 'object' ), true ) ) {
			// core WP tries to return first item only if `$single` is true, so
			// we need to wrap complex values in an extra array which will be
			// discarded by WP
			return array( $current_meta );
		}

		return $current_meta;
	}

	// Return original if the check does not pass
	return $value;
}

add_filter( 'get_post_metadata', __NAMESPACE__ . '\format_value', 100, 5 );


add_action( 'platform_edit_form', __NAMESPACE__ . '\myprefix_edit_form_after_editor' );
function myprefix_edit_form_after_editor( $tax ) {
	echo '<h2>Term Meta</h2>';
}
