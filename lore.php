<?php
/*
 * Plugin name: Lore
 * Description: Simple declarative custom types and fields
 * Version: 1.1.0
 * Author: Kurt Rank
 * Author URI: https://kurtrank.me
 * License: GPL
 */

namespace Lore;

use function get_file_data;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly
}

if ( ! defined( 'LORE_FILE' ) ) {
	define( 'LORE_FILE', __FILE__ );
}

if ( ! defined( 'LORE_VERSION' ) ) {
	define( 'LORE_VERSION', get_file_data( __FILE__, array( 'Version' => 'Version' ), 'plugin' )['Version'] );
}

require_once 'inc/utilities.php';
require_once 'inc/admin.php';
require_once 'inc/custom-types.php';
