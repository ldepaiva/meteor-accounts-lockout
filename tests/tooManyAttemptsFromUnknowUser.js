/* eslint-disable no-unused-expressions */

import { Meteor } from 'meteor/meteor';
import { expect } from 'meteor/practicalmeteor:chai';

function tooManyAttemptsFromUnknowUser() {
  return new Promise((resolve) => {
    Meteor.loginWithPassword(
      'not-exists@example.com',
      'wrong password',
      (err) => {
        expect(err.reason).to.eq('Too many attempts');
        expect(JSON.parse(err.details).duration).to.be.not.undefined;
        resolve();
      });
  });
}

export default tooManyAttemptsFromUnknowUser;
