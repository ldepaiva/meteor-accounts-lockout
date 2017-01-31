/* eslint-disable no-unused-expressions */

import { Meteor } from 'meteor/meteor';
import { expect } from 'meteor/practicalmeteor:chai';

function incorrectPassword(email) {
  return new Promise((resolve) => {
    Meteor.loginWithPassword(
      email,
      'wrong password',
      (err) => {
        expect(err.reason).to.eq('Incorrect password');
        expect(JSON.parse(err.details).failedAttempts).to.be.not.undefined;
        expect(JSON.parse(err.details).maxAttemptsAllowed).to.be.not.undefined;
        expect(JSON.parse(err.details).attemptsRemaining).to.be.not.undefined;
        expect(JSON.parse(err.details).message).to.eq('Incorrect password');
        resolve();
      });
  });
}

export default incorrectPassword;
