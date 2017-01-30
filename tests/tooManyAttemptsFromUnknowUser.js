import { Meteor } from 'meteor/meteor';
import { expect } from 'meteor/practicalmeteor:chai';

function tooManyAttemptsFromUnknowUser() {
  return new Promise((resolve) => {
    Meteor.loginWithPassword(
      'not-exists@example.com',
      'wrong password',
      (err) => {
        expect(err.reason).to.eq('Too many attempts');
        resolve();
      });
  });
}

export default tooManyAttemptsFromUnknowUser;
