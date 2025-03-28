import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { vitePluginSvebcomponentsSsr } from '@svebcomponents/ssr';

export default defineConfig({
	plugins: [vitePluginSvebcomponentsSsr(), sveltekit()]
});
