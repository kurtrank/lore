<?php

namespace Lore;

use function plugin_dir_path;
use function trailingslashit;
use function plugins_url;

/**
 * Returns absolute path to plugin file.
 *
 * @since 1.0.0
 *
 * @param string $path File relative to main plugin directory.
 * @return string
 */
function plugin_dir( $path = '' ) {
	return plugin_dir_path( __DIR__ ) . $path;
}

/**
 * Returns URL to plugin file.
 *
 * @since 1.0.0
 *
 * @param string $path File relative to main plugin directory.
 * @return string
 */
function plugin_url( $path = '' ) {
	return trailingslashit( plugins_url( '', __DIR__ ) ) . $path;
}

// returns array of slugs pulled from folders or files
function get_file_list( $directory, $extension = null, $remove_extension = false ) {
	$files = false;

	if ( is_dir( $directory ) ) {
		$files = scandir( $directory );
	}

	if ( ! $files ) {
		return false;
	}

	// remove current and parent directory
	$files = array_filter(
		$files,
		function ( $v ) {
			return ( '.' !== $v && '..' !== $v );
		}
	);

	if ( null === $extension ) {
		// return everything
	} elseif ( false === $extension ) {
		// return folders only
		$files = array_filter(
			$files,
			function ( $item ) {
				return ( ! strstr( $item, '.' ) );
			}
		);
	} elseif ( $extension ) {
		// filter out everything but folders and .extension files
		$files = array_filter(
			$files,
			function ( $item ) use ( $extension ) {
				return ( strstr( $item, ".{$extension}" ) || ! strstr( $item, '.' ) );
			}
		);
	}

	if ( $remove_extension ) {
		$files = array_map(
			function ( $filename ) use ( $extension ) {
				return str_replace( ".{$extension}", '', $filename );
			},
			$files
		);
	}

	return $files;
}

function get_registered_meta_field( $object_type, $key, $object_subtype = '' ) {
	$meta = get_registered_meta_keys( $object_type, $object_subtype );

	return $meta[ $key ] ?? false;
}


function get_meta_options( $object_type, $key, $object_subtype = '' ) {
	$field = get_registered_meta_field( $object_type, $key, $object_subtype );

	if ( $field && isset( $field['show_in_rest']['schema']['field'] ) ) {
		return $field['show_in_rest']['schema']['field']['options'] ?? false;
	} else {
		return false;
	}
}
