// add web comoponent shims
import '@svebcomponents/example-component/ssr';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	return await resolve(event);
};
