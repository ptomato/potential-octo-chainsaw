#!/usr/bin/env gjs

const System = imports.system;
const {Cog, Gtk} = imports.gi;

Cog.init_default();

imports.searchPath.unshift('/app/share/testapp');
const {AppWindow, DEFAULT_MOOD, LoginWindow} = imports.app;

const REGION = 'us-east-1';
const IDP_ENDPOINT = `https://cognito-idp.${REGION}.amazonaws.com`;
const CLIENT_ID = '(fill in client ID here)';

class Client {
    constructor() {
        this._client = new Cog.Client();
        this._token = null;
    }

    login() {
        return new Promise((resolve, reject) => {
            const dialog = new LoginWindow();
            dialog.connect('login', (dialog_, user, pass) => {
                this._onLogin(dialog_, user, pass);  // discard returned Promise
            });
            dialog.connect('create-account', (dialog_, user, pass) => {
                this._onCreateAccount(dialog_, user, pass);
            });
            dialog.connect('destroy', () => resolve());
            dialog.present();
            void reject;  // never rejects, just keeps asking for login
        });
    }

    async _onLogin(dialog, username, password) {
        try {
            await this._authenticate(username, password);
            dialog.loginSucceeded();
        } catch (err) {
            dialog.loginFailed(`${err.message}.`);
        }
    }

    async _onCreateAccount(dialog, username, password) {
        try {
            await this.createAccount(username, password);
            await this._authenticate(username, password);
            dialog.createAccountSucceeded();
        } catch (err) {
            dialog.createAccountFailed(`${err.message}.`);
        }
    }

    async _authenticate(username, password) {
        const [, result] = await this._client.initiate_auth_async(
            Cog.AuthFlow.USER_PASSWORD_AUTH, {
                [Cog.PARAMETER_USERNAME]: username,
                [Cog.PARAMETER_PASSWORD]: password,
            }, CLIENT_ID, null, null, null, null);
        this._token = result.access_token;
    }

    createAccount(username, password) {
        return this._client.sign_up_async(CLIENT_ID, null, username, password, {
            'custom:mood': DEFAULT_MOOD,
        }, null, null, null, null);
    }

    async getUserData() {
        const [, , attributes] =
            await this._client.get_user_async(this._token, null);
        if ('custom:mood' in attributes) {
            attributes.mood = attributes['custom:mood'];
            delete attributes['custom:mood'];
        }
        return attributes;
    }

    async setUserData(data) {
        const attributes = Object.assign({}, data);
        if ('mood' in attributes) {
            attributes['custom:mood'] = attributes.mood;
            delete attributes.mood;
        }
        await this._client.update_user_attributes_async(this._token, attributes,
            null);
    }
}

const theApp = new Gtk.Application();
theApp.connect('activate', async application => {
    const client = new Client();
    application.hold();
    await client.login();
    const win = new AppWindow({application}, client);
    application.release();
    win.present();
});
theApp.run([System.programInvocationName].concat(ARGV));
Cog.shutdown();
