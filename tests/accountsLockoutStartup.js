/* eslint-disable no-unused-expressions, no-underscore-dangle */

import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';

import AccountsLockout from '../src/accountsLockout';

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
