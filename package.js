/* global Package */

Package.describe({
  name: 'lucasantoniassi:accounts-lockout',
  version: '0.0.1',
  summary: 'Meteor package for locking user accounts and stopping brute force attacks',
  git: 'https://github.com/lucasantoniassi/meteor-accounts-lockout.git',
  documentation: 'README.md',
});

Package.onUse((api) => {
  api.versionsFrom('1.4.2.3');
  api.use([
    'accounts-base',
    'accounts-password',
    'ecmascript',
  ]);
  api.mainModule('accounts-lockout.js');
});

Package.onTest((api) => {
  api.use([
    'accounts-base',
    'accounts-password',
    'ecmascript',
    'lmieulet:meteor-coverage@1.1.4',
    'practicalmeteor:chai',
    'practicalmeteor:mocha',
    'random',
  ]);

  api.use('lucasantoniassi:meteor-accounts');

  api.addFiles([
    './tests/accountsLockout.test.js',
    './tests/createUser.js.test.js',
    './tests/incorrectEmail.js.test.js',
    './tests/incorrectPassword.js.test.js',
    './tests/logOut.js.test.js',
    './tests/spawn.js.test.js',
    './tests/testDone.js.test.js',
    './tests/tooManyAttempts.js.test.js',
    './tests/tooManyAttemptsFromUnknowUser.js.test.js',
    './tests/wait.js.test.js',
  ]);
});
