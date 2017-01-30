import { Meteor } from 'meteor/meteor';
import { expect } from 'meteor/practicalmeteor:chai';

function tooManyAttempts(email) {
  return new Promise((resolve) => {
    Meteor.loginWithPassword(
      email,
      'wrong password',
      (err) => {
        expect(err.reason).to.eq('Too many attempts');
        resolve();
      });
  });
}

export default tooManyAttempts;
