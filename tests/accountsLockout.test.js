/* eslint-env mocha */
/* eslint-disable func-names, no-underscore-dangle, no-unresolved */
/* eslint-disable no-unused-expressions */

import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { Accounts } from 'meteor/accounts-base';

import wait from './accountsLockout/wait';
import spawn from './accountsLockout/spawn';
import logOut from './accountsLockout/logOut';
import testDone from './accountsLockout/testDone';
import createUser from './accountsLockout/createUser';
import AccountsLockout from '../../user/accountsLockout';
import incorrectEmail from './accountsLockout/incorrectEmail';
import tooManyAttempts from './accountsLockout/tooManyAttempts';
import incorrectPassword from './accountsLockout/incorrectPassword';
import tooManyAttemptsFromUnknowUser from './accountsLockout/tooManyAttemptsFromUnknowUser';

Accounts._noConnectionCloseDelayForTest = true;

if (Meteor.isServer) {
  Accounts.removeDefaultRateLimit();
}

if (Meteor.isClient) {
  Accounts._isolateLoginTokenForTest();
}

if (Meteor.isServer) {
  const rulesToLockout = () => ({
    failuresBeforeLockout: 2,
    lockoutPeriod: 1,
    failureWindow: 2,
  });

  (new AccountsLockout({
    knowUsers: rulesToLockout,
    unknowUsers: rulesToLockout,
  })).startup();
}

describe('AccountsLockout', () => {
  describe('unknowUsers', () => {
    it('should lock/unlock the user correctly', function (done) {
      this.timeout(7000);

      spawn(function* () {
        yield incorrectEmail();
        yield incorrectEmail();
        yield wait(2000);
        yield incorrectEmail();
        yield incorrectEmail();
        yield tooManyAttemptsFromUnknowUser();
        yield wait(3000);
        yield incorrectEmail();
        yield incorrectEmail();
        yield tooManyAttemptsFromUnknowUser();
        yield tooManyAttemptsFromUnknowUser();
        yield testDone(done);
      });
    });
  });

  describe('knowUsers', () => {
    it('should lock/unlock the user correctly', function (done) {
      this.timeout(7000);

      spawn(function* () {
        const username = Random.id();
        const email = `${Random.id()}-intercept@example.com`;
        const password = 'password';

        yield createUser(username, email, password);
        yield logOut();
        yield incorrectPassword(email);
        yield wait(2000);
        yield incorrectPassword(email);
        yield incorrectPassword(email);
        yield tooManyAttempts(email);
        yield wait(3000);
        yield incorrectPassword(email);
        yield incorrectPassword(email);
        yield tooManyAttempts(email);
        yield tooManyAttempts(email);
        yield testDone(done);
      });
    });
  });
});
