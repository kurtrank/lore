/**
 * Internal dependencies
 */
import PostComboboxControl from "./post-combobox-control";

/**
 * WordPress dependencies
 */
import {
	SelectControl,
	TextControl,
	Button,
	ToggleControl,
} from "@wordpress/components";
import { useSelect, useDispatch } from "@wordpress/data";
import { trash, arrowUp, arrowDown } from "@wordpress/icons";

/**
 * External dependencies
 */
import { PostPickerButton } from "@humanmade/block-editor-components";

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
		if (null === value) {
			// remove item
			if (Array.isArray(obj)) {
				obj.splice(current, 1);
			} else {
				delete obj[`${current}`];
			}
		} else {
			obj[`${current}`] = value;
		}
		console.log(obj);
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

			case "taxonomy":
				const terms = select("core/editor").getEditedPostAttribute("platform");
				const termNames = select("core").getEntityRecords(
					"taxonomy",
					"platform",
					{ include: terms }
				);

				return termNames?.map((term) => term.slug);

			// get value from meta object
			// return getNestedValue(meta, source);

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

		case "taxonomy":
			switch (operator) {
				case "contains":
					passes = sourceVal?.includes(value);
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
			help={schema?.description}
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
					help={schema?.description}
					value={value}
					onChange={(newVal) => update(newVal)}
				/>
			);
			break;

		case "date":
			field = (
				<TextControl
					label={fieldLabel}
					help={schema?.description}
					value={value}
					onChange={(newVal) => update(newVal)}
					type="date"
				/>
			);
			break;

		case "object":
			// render subfields
			field = (
				<div className="lore-complex-field">
					<p className="lore-label">{fieldLabel}</p>
					<div className="lore-field-group">
						{Object.entries(schema.properties).map(([k, s]) => (
							<Field
								selector={[...selector, k]}
								schema={s}
								rootSchema={selector.length === 1 ? schema : rootSchema}
							/>
						))}
					</div>
					{schema?.description ? (
						<p className="lore-help">{schema.description}</p>
					) : null}
				</div>
			);
			break;

		case "post-combobox":
			field = (
				<PostComboboxControl
					value={value}
					onChange={(newValue) => {
						update(newValue);
					}}
					help={schema?.description}
					label={fieldLabel}
					type={ui?.post_type ?? "post"}
					placeholder={`select ${ui?.post_type ?? "post"}`}
				/>
			);
			break;

		case "post-picker-modal":
			field = (
				<div className="lore-post-select-field">
					<p className="lore-label">{fieldLabel}</p>
					<p className="lore-post-select-field__value">postId: {value}</p>
					<PostPickerButton
						title={"Select Post"}
						onChange={(newValue) =>
							update(newValue.length > 0 ? newValue[0] : 0)
						}
						values={value ? [value] : []}
					/>
				</div>
			);
			break;

		case "repeater":
			field =
				schema?.type === "array" ? (
					<div className="lore-complex-field" data-type="repeater">
						<p className="lore-label">{fieldLabel}</p>
						<div className="lore-field-group">
							{value.map((v, index) => (
								<div className="lore-field-group-item">
									<Field
										selector={[...selector, index]}
										schema={schema.items}
										rootSchema={selector.length === 1 ? schema : rootSchema}
									/>
									<div className="lore-actions">
										<Button
											size="compact"
											label="Move up"
											icon={arrowUp}
											disabled={index < 1}
											onClick={() => {
												const copiedMetaObj = {
													[`${root}`]: structuredClone(rootValue),
												};
												const arr = getNestedValue(copiedMetaObj, selector);
												let element = arr[index];
												arr.splice(index, 1);
												arr.splice(index - 1, 0, element);
												const newMetaVals = setNestedValue(
													copiedMetaObj,
													selector,
													arr
												);
												editPost({
													meta: newMetaVals,
												});
											}}
										/>
										<Button
											size="compact"
											label="Move down"
											icon={arrowDown}
											disabled={index >= value.length - 1}
											onClick={() => {
												const copiedMetaObj = {
													[`${root}`]: structuredClone(rootValue),
												};
												const arr = getNestedValue(copiedMetaObj, selector);
												let element = arr[index];
												arr.splice(index, 1);
												arr.splice(index + 1, 0, element);
												const newMetaVals = setNestedValue(
													copiedMetaObj,
													selector,
													arr
												);
												editPost({
													meta: newMetaVals,
												});
											}}
										/>
										<Button
											className="lore-remove"
											size="compact"
											label="Remove"
											icon={trash}
											onClick={() => {
												const newMetaVals = setNestedValue(
													{ [`${root}`]: structuredClone(rootValue) },
													[...selector, index],
													null
												);
												editPost({
													meta: newMetaVals,
												});
											}}
										/>
									</div>
								</div>
							))}
							<button
								onClick={() => {
									let newValue = false;
									switch (schema?.items?.type) {
										case "object":
											newValue = {};
											break;

										case "array":
											newValue = [];
											break;

										case "string":
											newValue = "";
											break;

										case "number":
										case "integer":
											newValue = 0;
											break;

										default:
											break;
									}
									const newMetaVals = setNestedValue(
										{ [`${root}`]: structuredClone(rootValue) },
										[...selector, value.length],
										newValue
									);
									editPost({
										meta: newMetaVals,
									});
								}}
							>
								Add
							</button>
						</div>
						{schema?.description ? (
							<p class="lore-help">{schema.description}</p>
						) : null}
					</div>
				) : null;
			break;

		case "select":
			if (ui?.options) {
				const skipEmptyEntry = ui.allowNull === false;
				field = (
					<SelectControl
						label={fieldLabel}
						help={schema?.description}
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

		case "toggle":
			field = (
				<ToggleControl
					label={fieldLabel}
					help={schema?.description}
					checked={value}
					onChange={(newVal) => {
						update(newVal);
					}}
				/>
			);
			break;

		default:
			break;
	}
	return field;
};

export default Field;
