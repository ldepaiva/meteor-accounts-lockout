/* eslint-env mocha */
/* eslint-disable func-names, no-underscore-dangle, no-unresolved */
/* eslint-disable no-unused-expressions */

import { Random } from 'meteor/random';

import wait from './wait';
import spawn from './spawn';
import logOut from './logOut';
import testDone from './testDone';
import createUser from './createUser';
import incorrectEmail from './incorrectEmail';
import tooManyAttempts from './tooManyAttempts';
import incorrectPassword from './incorrectPassword';
import tooManyAttemptsFromUnknowUser from './tooManyAttemptsFromUnknowUser';

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
      this.timeout(8000);

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
