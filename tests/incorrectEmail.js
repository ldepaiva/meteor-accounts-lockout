/* eslint-disable no-unused-expressions */

import { Meteor } from 'meteor/meteor';
import { expect } from 'meteor/practicalmeteor:chai';

function incorrectEmail() {
  return new Promise((resolve) => {
    Meteor.loginWithPassword(
      'not-exists@example.com',
      'wrong password',
      (err) => {
        expect(err.reason).to.eq('User not found');
        expect(JSON.parse(err.details).failedAttempts).to.be.not.undefined;
        expect(JSON.parse(err.details).maxAttemptsAllowed).to.be.not.undefined;
        expect(JSON.parse(err.details).attemptsRemaining).to.be.not.undefined;
        expect(JSON.parse(err.details).message).to.eq('User not found');
        resolve();
      });
  });
}

export default incorrectEmail;
