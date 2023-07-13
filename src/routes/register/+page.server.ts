import type { PageServerLoad, Actions } from './$types';
import { regschema } from '$lib/validation';
import { fail, redirect } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms/server'
import { ClientResponseError } from 'pocketbase';
import { hasBadWord } from '$lib/utils';

export const load = (async (event) => {
    await event.parent()
    if (event.locals.pb?.authStore.isValid) {
        throw redirect(303, '/')
    }
    const form = await superValidate(event, regschema)
    return {
        form
    };
}) satisfies PageServerLoad;

export const actions = {
    default: async (event) => {
        const form = await superValidate(event, regschema)
        if (!form.valid) {
            return fail(400, { form })
        }
        else {
            if(await hasBadWord(form.data.username)){
                return setError(form, 'username', 'this username is inappropriate')
            }
            try {
                await event.locals.pb?.collection('users').create(form.data)
                await event.locals.pb?.collection('users').authWithPassword(form.data.email, form.data.password)
            }
            catch (error) {
                if (error instanceof ClientResponseError) {
                    return message(form, error.response.data, {
                        status: 401
                    });
                }
            }
            throw redirect(303, '/')
        }
    }
} satisfies Actions