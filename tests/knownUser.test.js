/* eslint-env mocha */
/* eslint-disable func-names, no-underscore-dangle, no-unresolved */
/* eslint-disable no-unused-expressions */

import { expect } from 'meteor/practicalmeteor:chai';
import KnownUser from '../src/knownUser';

const settings = {
  failuresBeforeLockout: 3,
  lockoutPeriod: 60,
  failureWindow: 15,
};

describe('knownUser', () => {
  describe('validateLoginAttempt', () => {
    it('does not allow login while account is locked', () => {
      const fakeLoginInfo = {
        type: 'password',
        // valid login attempt
        allowed: true,
        methodName: 'login',
        user: {
          services: {
            'accounts-lockout': {
              // account is locked until some time in the future
              unlockTime: new Date().getTime() + 50000,
              // maximum attempts exceeded
              failedAttempts: 6,
            },
          },
        },
      };
      const knownUser = new KnownUser(settings);

      expect(() => knownUser.validateLoginAttempt(fakeLoginInfo))
        .to.throw('Too many attempts');
    });
    it('allows login when account is not locked', () => {
      const fakeLoginInfo = {
        type: 'password',
        // valid login attempt
        allowed: true,
        methodName: 'login',
        user: {
          services: {
            'accounts-lockout': {
              // account is locked until some time in the future
              unlockTime: 0,
              // maximum attempts exceeded
              failedAttempts: 6,
            },
          },
        },
      };
      const knownUser = new KnownUser(settings);

      const result = knownUser.validateLoginAttempt(fakeLoginInfo);
      expect(result).to.equal(fakeLoginInfo.allowed);
    });
  });
});
