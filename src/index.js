/**
 * Internal dependencies
 */
import { useMetaData } from "./hooks";
import Field from "./components/field";
import "./index.scss";

/**
 * WordPress dependencies
 */
import {
	ComboboxControl,
	Panel,
	PanelBody,
	PanelRow,
} from "@wordpress/components";
import { PluginDocumentSettingPanel } from "@wordpress/editor";
import { registerPlugin } from "@wordpress/plugins";
import { cleanForSlug } from "@wordpress/url";
import { createRoot } from "react-dom/client";

function useLocationFieldGroups(location = "side") {
	const { postMetaFields } = useMetaData();
	const fieldGroups = postMetaFields
		? Object.entries(postMetaFields)
				.filter(([key, schema]) => {
					// only include meta fields with defined "field" ui
					const fieldLocation = schema?.field?.location
						? schema?.field?.location
						: "side";
					return Object.hasOwn(schema, "field") && fieldLocation === location;
				})
				.reduce(
					(groups, [key, schema]) => {
						if (schema.field.group) {
							if (Object.hasOwn(groups, schema.field.group)) {
								groups[schema.field.group].push({ key, schema });
							} else {
								groups[schema.field.group] = [{ key, schema }];
							}
						} else {
							groups["__main"].push({ key, schema });
						}

						return groups;
					},
					{ __main: [] }
				)
		: false;

	return fieldGroups;
}

const PluginDocumentSettingPanelCentralHub = () => {
	// const metaData = useSelect(function (select) {
	// 	return select("core/editor").getEditedPostAttribute("meta");
	// }, []);

	const fieldGroups = useLocationFieldGroups();

	const panels = fieldGroups ? (
		<>
			{Object.entries(fieldGroups).map(([title, fields]) => {
				return fields.length > 0 ? (
					<PluginDocumentSettingPanel
						name={`lore-post-meta-${
							title === "__main" ? "general" : cleanForSlug(title)
						}`}
						title={`Post Meta: ${title === "__main" ? "General" : title}`}
					>
						<div className="lore-field-group">
							{fields.map(({ key, schema }) => {
								return <Field selector={key} schema={schema} />;
							})}
						</div>
					</PluginDocumentSettingPanel>
				) : null;
			})}
		</>
	) : null;

	return panels;
};

registerPlugin("risepoint-central-hub-data", {
	render: PluginDocumentSettingPanelCentralHub,
});

const LowerMetaBox = () => {
	// post data
	const fieldGroups = useLocationFieldGroups("bottom");
	console.log(fieldGroups);
	const panels = fieldGroups ? (
		<div>
			{Object.entries(fieldGroups).map(([title, fields]) => {
				return fields.length > 0 ? (
					<details class="lore-field-panel">
						<summary>{title}</summary>
						<div className="lore-field-group">
							{fields.map(({ key, schema }) => {
								return <Field selector={key} schema={schema} />;
							})}
						</div>
					</details>
				) : null;
			})}
		</div>
	) : null;

	return panels;
};

document.addEventListener("DOMContentLoaded", () => {
	const metaBox = document.getElementById("lore-edit-meta-bottom");
	if (metaBox) {
		createRoot(metaBox).render(<LowerMetaBox />);
	}
});
