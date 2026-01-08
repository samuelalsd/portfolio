/**
 * Capitalizes the first letter of each word in a given string.
 *
 * @param string - The input string to be capitalized.
 * @returns The capitalized string where the first letter of each word is in uppercase.
 */
export function capitalize(string: string) {
	return string
		.split(' ')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}
