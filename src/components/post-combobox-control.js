/**
 * WordPress dependencies
 */
import { useState } from "react";
import { ComboboxControl } from "@wordpress/components";
import { useSelect } from "@wordpress/data";

const usePostOptions = (type, search = "", currentId = false) => {
	return useSelect(
		(select) => {
			const { getEntityRecords } = select("core");

			// Query args
			const query = {
				status: "publish",
				per_page: 10,
			};

			// exclude currently-selected, as we will get it separately
			if (currentId) {
				query.exclude = [currentId];
			}

			if (search) {
				query.search = search;
				query.search_columns = ["post_title"];
			}

			const posts = getEntityRecords("postType", type, query);

			// get currently-selected post so we always have it to display label correctly
			const currentPost = currentId
				? getEntityRecords("postType", type, {
						include: [currentId],
						per_page: 1,
				  })
				: [];

			const list = [
				...(null !== posts ? posts : []),
				...(null !== currentPost ? currentPost : []),
			];

			return list.length > 0
				? list.map((post) => ({ value: post.id, label: post.title.rendered }))
				: [{ value: 0, label: "-" }];
		},
		[type, search, currentId]
	);
};

const PostComboboxControl = ({ type = "post", value, ...props }) => {
	const [searchString, setSearchString] = useState("");

	const postOptions = usePostOptions(type, searchString, value);

	return (
		<ComboboxControl
			value={value}
			options={postOptions}
			onFilterValueChange={(inputValue) => {
				setSearchString(inputValue);
			}}
			{...props}
		/>
	);
};

export default PostComboboxControl;
