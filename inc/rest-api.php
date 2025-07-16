<?php

namespace Lore;

function register_filters() {
	foreach ( get_post_types( array( 'show_in_rest' => true ), 'objects' ) as $post_type ) {
		add_filter( 'rest_' . $post_type->name . '_collection_params', __NAMESPACE__ . '\register_params' );
		add_filter( 'rest_' . $post_type->name . '_query', __NAMESPACE__ . '\add_query_params', 10, 2 );
	}
}
add_action( 'rest_api_init', __NAMESPACE__ . '\register_filters' );

function register_params( $query_params ) {
	$query_params['meta_query'] = array(
		'description' => __( 'Limit result set to posts that match the provided meta query.' ),
		'type'        => 'string',
	);

	return $query_params;
}

function add_query_params( $args, $request ) {
	$supported_operators = array(
		':'          => '=',
		'!:'         => '!=',
		'>:'         => '>=',
		'<:'         => '<=',
		'>'          => '>',
		'<'          => '<',
		':like:'     => 'LIKE',
		'!:like:'    => 'NOT LIKE',
		':in:'       => 'IN',
		'!:in:'      => 'NOT IN',
		':between:'  => 'BETWEEN',
		'!:between:' => 'NOT BETWEEN',
		'!:exists:'  => 'NOT EXISTS',
	);

	$array_operators = array(
		'IN',
		'NOT IN',
		'BETWEEN',
		'NOT BETWEEN',
	);

	$meta_query_str = $request->get_param( 'meta_query' );

	if ( ! $meta_query_str ) {
		return $args;
	}
	$meta_query_parts = explode( ';', $meta_query_str );

	$meta_query = array();

	foreach ( $meta_query_parts as $k => $part ) {

		if ( 0 === $k && in_array( $part, array( 'AND', 'OR' ), true ) ) {
			$meta_query['relation'] = $part;
		} else {
			$matches = array();
			$res     = preg_match( '/([a-zA-Z0-9_-]+)([!<>]?:?(?:like|between|in|exists)?:?)(.+)/', $part, $matches );

			if ( $res ) {
				$_key = sanitize_key( $matches[1] );
				$_op  = $matches[2];
				$_val = $matches[3];

				if ( in_array( $_op, array_keys( $supported_operators ), true ) ) {
					$op  = $supported_operators[ $_op ];
					$val = in_array( $op, $array_operators, true ) ? explode( ',', $_val ) : $_val;

					$post_type = is_array( $args['post_type'] ) ? $args['post_type'][0] : $args['post_type'];

					$registered_fields = get_registered_meta_keys( 'post', $post_type );

					$field = $registered_fields[ $_key ] ?? false;

					if ( $field ) {
						$key = $_key;

						$clause = array(
							'key'     => $key,
							'value'   => $val,
							'compare' => $op,
						);

						$is_numeric = isset( $field['type'] ) && in_array( $field['type'], array( 'number', 'integer' ), true );

						if ( $is_numeric ) {
							$clause['type'] = 'NUMERIC';
						}

						$meta_query[] = $clause;
					}
				}
			}
		}
	}

	if ( $meta_query ) {
		$args['meta_query'] = $meta_query;
	}

	return $args;
}
