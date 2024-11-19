/**
 * WordPress dependencies
 */
import { SelectControl, TextControl } from "@wordpress/components";
import { useSelect, useDispatch } from "@wordpress/data";
import { group } from "@wordpress/icons";

function getNestedValue(obj, selector) {
	let path = Array.isArray(selector) ? selector : [selector];
	let current = obj;
	path.forEach((item) => {
		if (typeof current === "object") {
			current = current[item];
		}
	});
	return current;
}

function setNestedValue(obj, selector, value) {
	if (typeof obj !== "object") {
		return;
	}

	const [current, ...rest] = selector;

	if (0 === rest.length) {
		obj[`${current}`] = value;
	} else {
		setNestedValue(obj[current], rest, value);
	}

	return obj;
}

function testConditionals(conditionalGroups) {
	if (!Array.isArray(conditionalGroups)) {
		return true;
	}

	const results = [...Array(conditionalGroups.length)].map((v) => {
		return new Array(0);
	});

	for (
		let groupIndex = 0;
		groupIndex < conditionalGroups.length;
		groupIndex++
	) {
		const group = conditionalGroups[groupIndex];
		for (let index = 0; index < group.length; index++) {
			results[groupIndex].push(testConditional(group[index]));
		}
	}

	return (
		results.filter((groupResult) => !groupResult.includes(false)).length > 0
	);
}

function testConditional(conditional) {
	const {
		source = null,
		value = null,
		operator = "==",
		type = "meta",
	} = conditional;

	if (source === null || value === null) {
		return true;
	}

	let passes = true;

	// get value based on type
	const sourceVal = useSelect(function (select) {
		switch (type) {
			case "meta":
				const meta = select("core/editor").getEditedPostAttribute("meta");

				// get value from meta object
				return getNestedValue(meta, source);

			default:
				break;
		}
	}, []);

	// compare with operators based on type
	switch (type) {
		case "meta":
			switch (operator) {
				case "==":
					passes = sourceVal === value;
					break;

				default:
					break;
			}

			break;

		default:
			break;
	}

	return passes;
}

const Field = ({ selector, schema, rootSchema = null }) => {
	selector = Array.isArray(selector) ? selector : [selector];

	const root = selector[0];

	// get current value
	const [value, rootValue] = useSelect(function (select) {
		const meta = select("core/editor").getEditedPostAttribute("meta");

		// get value from meta object
		let rootVal = Object.hasOwn(meta, root) ? meta[root] : null;
		// bug where meta returns an unset meta field as an empty array,
		// even though it is defined as an object
		rootVal =
			rootSchema?.type === "object" && Array.isArray(rootVal) ? {} : rootVal;
		const val = getNestedValue(meta, selector);
		return [val, rootVal];
	}, []);

	// save new value
	const { editPost } = useDispatch("core/editor");

	const update = (newValue) => {
		if (Array.isArray(selector) && selector.length > 1) {
			// object or array
			const newMetaVals = setNestedValue(
				{ [`${root}`]: structuredClone(rootValue) },
				selector,
				newValue
			);
			editPost({
				meta: newMetaVals,
			});
		} else {
			// simple value
			editPost({
				meta: { [`${root}`]: newValue },
			});
		}
	};

	// TODO: pass in entire meta object and/or taxonomies??
	// then we wouldn't need to have hooks in every test
	const conditionals = schema?.field?.conditional;

	if (!testConditionals(conditionals)) {
		return null;
	}

	// prepare ui details
	const ui = schema?.field ?? null;

	const fieldType = schema.type === "object" ? "object" : ui?.type ?? "text";

	const fieldLabel = ui?.label ?? selector[selector.length - 1];

	let field = (
		<TextControl
			label={fieldLabel}
			value={value}
			onChange={(newVal) => update(newVal)}
		/>
	);

	// render field
	switch (fieldType) {
		case "text":
			field = (
				<TextControl
					label={fieldLabel}
					value={value}
					onChange={(newVal) => update(newVal)}
					type="url"
				/>
			);
			break;

		case "object":
			// render subfields
			field = (
				<>
					<p>{fieldLabel}</p>
					{Object.entries(schema.properties).map(([k, s]) => (
						<Field
							selector={[...selector, k]}
							schema={s}
							rootSchema={selector.length === 1 ? schema : rootSchema}
						/>
					))}
				</>
			);
			break;

		case "select":
			if (ui?.options) {
				const skipEmptyEntry = ui.allowNull === false;
				field = (
					<SelectControl
						label={fieldLabel}
						value={value}
						options={
							skipEmptyEntry
								? ui.options
								: [{ value: "", label: "-" }, ...ui.options]
						}
						onChange={(newVal) => update(newVal)}
					/>
				);
			}
			break;

		default:
			break;
	}
	return field;
};

export default Field;
