import { authentication, createDirectus, rest } from '@directus/sdk';
import { joinURL } from 'ufo';
import type { Schema } from '~/types/schema';

import { defineNuxtPlugin, useRoute, useRuntimeConfig } from '#imports';

export default defineNuxtPlugin((nuxtApp) => {
	const route = useRoute();
	const config = useRuntimeConfig();

	// During SSR (Cloudflare Worker), call Directus directly to avoid self-referential
	// subrequests that fail silently. On the client, use the proxy to avoid CORS issues.
	const baseUrl = import.meta.server
		? config.public.directus.rest.baseUrl // e.g. https://os.puraluce.studio
		: joinURL(config.public.siteUrl, '/api/proxy');

	const directus = createDirectus<Schema>(baseUrl, { globals: { fetch: $fetch } })
		.with(authentication('session'))
		.with(rest());

	// During SSR, authenticate with the server token so Directus returns data
	// that may require authentication (e.g. draft content, restricted collections).
	if (import.meta.server) {
		const serverToken = (config as any).directusServerToken;
		if (serverToken) {
			directus.setToken(serverToken);
		}
	}

	// ** Live Preview Bits **
	// Check if we are in preview mode
	const preview = route.query.preview && route.query.preview === 'true';
	const token = route.query.token as string | undefined;

	// If we are in preview mode, we need to use the token from the query string
	if (preview && token) {
		directus.setToken(token);

		nuxtApp.hook('page:finish', () => {
			refreshNuxtData();
		});
	}

	return {
		provide: {
			directus,
		},
	};
});
