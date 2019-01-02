/* eslint-env mocha */
/* eslint-disable func-names, no-underscore-dangle, no-unresolved */
/* eslint-disable no-unused-expressions */

import { Mongo } from 'meteor/mongo';
import { expect } from 'meteor/practicalmeteor:chai';

import UnknownUser from '../src/unknownUser';

const settings = {
  failuresBeforeLockout: 4,
  lockoutPeriod: 60,
  failureWindow: 15,
};

describe('unknownUser', () => {
  beforeEach(() => {
    this.AccountsLockoutCollection = new Mongo.Collection(null);
    this.dependencies = {
      AccountsLockoutCollection: this.AccountsLockoutCollection,
    };
  });
  describe('validateLoginAttempt', () => {
    it('has some attempts remaining', () => {
      const fakeConnection = {
        clientAddress: 'fakeAddress',
        services: {
          'accounts-lockout': {
            // account is locked until some time in the future
            unlockTime: 0,
            // maximum attempts not exceeded
            failedAttempts: 2,
            // it's in the failure window
            lastFailedAttempt: new Date().getTime(),
            firstFailedAttempt: new Date().getTime() - 1000,
          },
        },
      };
      const fakeLoginInfo = {
        type: 'password',
        // valid login attempt
        allowed: true,
        methodName: 'login',
        error: { reason: 'User not found' },
        connection: fakeConnection,
      };
      this.AccountsLockoutCollection.insert(fakeLoginInfo);

      const unknownUser = new UnknownUser(settings, this.dependencies);

      expect(() => unknownUser.validateLoginAttempt(fakeLoginInfo))
        .to.throw('User not found');
    });
    it('attempts too many times', () => {
      const fakeConnection = {
        clientAddress: 'fakeAddress',
        services: {
          'accounts-lockout': {
            // account is locked until some time in the future
            unlockTime: new Date().getTime() + 50000,
            // maximum attempts exceeded
            failedAttempts: 6,
            // it's in the failure window
            lastFailedAttempt: new Date().getTime(),
            firstFailedAttempt: new Date().getTime() - 1000,
          },
        },
      };
      const fakeLoginInfo = {
        type: 'password',
        // valid login attempt
        allowed: true,
        methodName: 'login',
        error: { reason: 'User not found' },
        connection: fakeConnection,
      };
      this.AccountsLockoutCollection.insert(fakeConnection);

      const unknownUser = new UnknownUser(settings, this.dependencies);

      expect(() => unknownUser.validateLoginAttempt(fakeLoginInfo))
        .to.throw('Too many attempts');
    });
  });
});
