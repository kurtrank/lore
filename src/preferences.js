import { dispatch, useSelect } from "@wordpress/data";
import {
	store as preferencesStore,
	PreferenceToggleMenuItem,
} from "@wordpress/preferences";
import { registerPlugin } from "@wordpress/plugins";
import { PluginMoreMenuItem } from "@wordpress/editor";
import { check } from "@wordpress/icons";

dispatch(preferencesStore).setDefaults("kurtrank/lore", {
	showFieldMetaKeys: false,
});

const PluginSidebarMoreMenuItemToggle = () => {
	const keysShown = useSelect((select) => {
		return select("core/preferences").get("kurtrank/lore", "showFieldMetaKeys");
	});

	return (
		<PluginMoreMenuItem
			icon={keysShown ? check : false}
			onClick={() => {
				dispatch("core/preferences").toggle(
					"kurtrank/lore",
					"showFieldMetaKeys",
				);
			}}
		>
			Show meta key names
		</PluginMoreMenuItem>
	);
};

registerPlugin("kr-lore-more-menu-toggle", {
	render: PluginSidebarMoreMenuItemToggle,
});
