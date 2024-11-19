/**
 * WordPress dependencies
 */
import { __ } from "@wordpress/i18n";
import apiFetch from "@wordpress/api-fetch";
import { useEffect, useState } from "@wordpress/element";
import { useSelect, useDispatch } from "@wordpress/data";

const useMetaData = () => {
	const [postMetaFields, setPostMetaFields] = useState([]);
	const restRoute = useSelect((select) => {
		const type = select("core/editor").getCurrentPostType();
		const details = select("core").getPostType(type);
		return `/${details?.rest_namespace || "wp/v2"}/${
			details?.rest_base || type
		}`;
	});

	useEffect(() => {
		apiFetch({ path: restRoute, method: "OPTIONS" }).then((items) => {
			const fields = items?.schema?.properties.meta.properties;
			setPostMetaFields(fields);
		});
	}, [restRoute]);

	return {
		postMetaFields,
	};
};

export { useMetaData };
