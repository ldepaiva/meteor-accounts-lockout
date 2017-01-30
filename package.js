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

  api.use('lucasantoniassi:accounts-lockout');

  api.addFiles('./tests/accountsLockoutStartup.js');

  api.addFiles([
    './tests/accountsLockout.test.js',
    './tests/createUser.js',
    './tests/incorrectEmail.js',
    './tests/incorrectPassword.js',
    './tests/logOut.js',
    './tests/spawn.js',
    './tests/testDone.js',
    './tests/tooManyAttempts.js',
    './tests/tooManyAttemptsFromUnknowUser.js',
    './tests/wait.js',
  ], 'client');
});
