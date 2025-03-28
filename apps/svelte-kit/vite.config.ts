import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import vitePluginSvelteWebComponentWrapper from '@svebcomponents/ssr/vite-plugin';

export default defineConfig({
	plugins: [vitePluginSvelteWebComponentWrapper(), sveltekit()]
});
