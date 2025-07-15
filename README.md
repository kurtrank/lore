# Lore

Declarative custom post types and post meta for WordPress.

## Registering Custom Post Types and Taxonomies

This plugin is inspired by how WordPress handles server-side block registration, primarily through JSON files. It works similarly here; the only PHP required is to tell the plugin which directory your JSON files are. This is does via two main filters:

```php
add_filter(
	'lore/taxonomy_locations',
	function ( $paths ) {
		$paths[] = get_stylesheet_directory() . '/post-taxonomies';

		return $paths;
	}
);

add_filter(
	'lore/post_type_locations',
	function ( $paths ) {
		$paths[] = get_stylesheet_directory() . '/post-types';

		return $paths;
	}
);
```

Lore will look in the provided directories for JSON files, and will register a post or taxonomy for each one it finds.

## Custom Meta Fields

_Note: Currently only supported for post types, not taxonomies._

A `meta` key may be added to a post type JSON file to officially register post meta fields. This will do two main things:

1. Register each meta field, which makes them available in the REST API with their associated post type endpoint responses
2. Generate a UI in the Post settings sidebar in the editor for each field

Each key/value pair in the `meta` object represents a meta field:

- The "key" is the actual key used to store the meta in the database
- The "value" is all of the information about the field that WordPress expects when registering the field, as well as extra bits of data such as which UI control to render in the admin for the field

For example we can register a `color` field:

```json
{
	"meta": {
		"color": {
			"type": "string",
			"description": "Main color to use for the design",
			"sanitize_callback": "sanitize_text_field",
			"single": true,
			"show_in_rest": {
				"schema": {
					"enum": ["red", "green", "blue"],
					"field": {
						"label": "Status",
						"type": "select",
						"options": [
							{ "value": "red", "label": "Red" },
							{ "value": "green", "label": "Green" }
							{ "value": "blue", "label": "Blue" }
						]
					}
				}
			}
		}
	}
}
```

## Querying Meta Fields in the REST API

An additional feature of this plugin is that it adds a new meta_query parameter to all post endpoints (including custom post types) that have enabled REST API.

`meta_query` parameter is a string, with a simple syntax to allow for complex single-level meta queries. It maps directly to the meta_query argument of WP_Query. There are a couple requirements for each clause to be applied:

- It must use a supported operator
- The chosen field key must be a registered meta field using register_meta (which will happen automatically with the previously-mentioned JSON files)

### String Details

- Each clause in a query is split with `;`
- The first clause may be a special keyword `OR` or `AND`. This maps to the relation key in the meta query. If not provided, uses the default WP_Meta_Query value `AND`
- Operators use `:` instead of `=` to better differentiate between other parameter values in the query string, as well as support special keywords
- `value` may support a single value, or a comma-separated array of values if the operator supports multiple values.
- The value `type` can not be set manually, instead it will be determined automatically based on the registered meta type. Currently only `NUMERIC` types are handled differently than strings

### Supported Operators

These are the same operators that are available in meta query clauses in WP_Query.

| Operator     | Maps to       | Notes                    |
| ------------ | ------------- | ------------------------ |
| `:`          | `=`           |                          |
| `!:`         | `!=`          |                          |
| `>:`         | `>=`          |                          |
| `>`          | `>`           |                          |
| `<:`         | `<=`          |                          |
| `<`          | `<`           |                          |
| `:like:`     | `LIKE`        |                          |
| `!:like:`    | `NOT LIKE`    |                          |
| `:in:`       | `IN`          | Supports multiple values |
| `!:in:`      | `NOT IN`      | Supports multiple values |
| `:between:`  | `BETWEEN`     | Supports multiple values |
| `!:between:` | `NOT BETWEEN` | Supports multiple values |
| `!:exists:`  | `NOT EXISTS`  |                          |

### Example Query

#### Example 1

```
?meta_query=star_value>:4;location:earth
```

This query has 2 clauses:

1. `star_value>:4` - simple key/value pair. Matches any `star_value` greater than or equal to 4
2. `location:earth` - simple key/value pair. Using `:` is analogous to `=`

#### Example 2

```
?meta_query=OR;color:red;size:in:md,lg
```

This query has 3 clauses:

1. `OR` - special keyword indicating we want to match any of the clauses
2. `color:red` - simple key/value pair. Using `:` is analogous to `=`
3. `size:in:md,lg` - example of using an operator that supports multiple values. `:in:` lets us provide an array of values as a comma-separated list of values to match
