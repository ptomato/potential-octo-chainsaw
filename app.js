/* exported AppWindow, DEFAULT_MOOD, LoginWindow */

const {Gio, GObject, Gtk} = imports.gi;

const resource = Gio.Resource.load('/app/share/testapp/app.gresource');
Gio.resources_register(resource);

const MOODS = [
    'joyous',
    'ineffable',
    'grumpy',
    'hangry',
    'zen',
];
var DEFAULT_MOOD = 'joyous';
const MOOD_DISPLAY_STRING = {
    joyous: 'Joyous',
    ineffable: 'Ineffable',
    grumpy: 'Grumpy',
    hangry: 'Hangry',
    zen: 'Zen',
    unknown: '',
};
const MOOD_DISPLAY_EMOJI = {
    joyous: '😄',
    ineffable: '😶',
    grumpy: '😾',
    hangry: '😡🍕',
    zen: '😌',
    unknown: '…',
};

var LoginWindow = GObject.registerClass({
    GTypeName: 'LoginWindow',
    Template: 'resource:///app/login.ui',
    InternalChildren: ['account-create', 'account-error-message',
        'account-error-revealer', 'account-password', 'account-username',
        'login', 'login-error-message', 'login-error-revealer',
        'login-password', 'login-username'],
    Signals: {
        login: {
            param_types: [String, String],
        },
        'create-account': {
            param_types: [String, String],
        },
    },
}, class LoginWindow extends Gtk.Window {
    _init(props = {}) {
        super._init(props);
        this._login.connect('clicked', this._onLogin.bind(this));
        this._account_create.connect('clicked', this._onAccountCreate.bind(this));
    }

    _onLogin(button) {
        button.sensitive = false;
        const username = this._login_username.text;
        const password = this._login_password.text;
        this.emit('login', username, password);
    }

    _onAccountCreate(button) {
        button.sensitive = false;
        const username = this._account_username.text;
        const password = this._account_password.text;
        this.emit('create-account', username, password);
    }

    loginFailed(description) {
        const message = description || 'Failed to log in.';
        this._login_username.text = '';
        this._login_password.text = '';
        this._login.sensitive = true;
        this._login_error_message.label = `${message} Try again.`;
        this._login_error_revealer.reveal_child = true;
    }

    loginSucceeded() {
        this.destroy();
    }

    createAccountFailed(description) {
        const message = description || 'Failed to create account.';
        this._account_username.text = '';
        this._account_password.text = '';
        this._account_create.sensitive = true;
        this._account_error_message.label = `${message} Try again.`;
        this._account_error_revealer.reveal_child = true;
    }

    createAccountSucceeded() {
        this.destroy();
    }
});


var AppWindow = GObject.registerClass({
    GTypeName: 'AppWindow',
    Template: 'resource:///app/app.ui',
    InternalChildren: ['mood-chooser', 'mood-emoji', 'mood-label',
        'mood-spinner', 'mood-stack'],
}, class AppWindow extends Gtk.ApplicationWindow {
    _init(props = {}, userManager) {
        super._init(props);
        this._busy = false;
        this._mood = 'unknown';

        MOODS.forEach(id => this._mood_chooser.append(id, MOOD_DISPLAY_STRING[id]));
        this._mood_chooser.connect('changed', () => {
            this._onMoodChooserChanged();  // discard returned Promise
        });

        this._userManager = userManager;
        this._populateUI();
    }

    get busy() {
        return this._busy;
    }

    set busy(value) {
        this._mood_stack.visible_child_name = value ? 'spinner' : 'emoji';
        this._mood_spinner.active = value;
        this._mood_chooser.sensitive = !value;
        this._busy = value;
    }

    get mood() {
        return this._mood;
    }

    set mood(value) {
        this._mood_emoji.label = MOOD_DISPLAY_EMOJI[value];
        this._mood_label.label = `Your mood is: <b>${MOOD_DISPLAY_STRING[value]}</b>`;
        this._mood_chooser.active = MOODS.indexOf(value);
        this._mood = value;
    }

    async _populateUI() {
        this.busy = true;
        try {
            let userData = await this._userManager.getUserData();

            if (!userData || !('mood' in userData) || !MOODS.includes(userData.mood)) {
                userData = {mood: DEFAULT_MOOD};
                await this._userManager.setUserData(userData);
            }

            const {mood} = userData;
            this.mood = mood;
        } catch (e) {
            logError(e);
        } finally {
            this.busy = false;
        }
    }

    async _onMoodChooserChanged() {
        const newMood = MOODS[this._mood_chooser.active];
        if (this.mood === newMood)
            return;

        this.busy = true;
        try {
            await this._userManager.setUserData({mood: newMood});
            this.mood = newMood;
        } catch (e) {
            logError(e);
        } finally {
            this.busy = false;
        }
    }
});
