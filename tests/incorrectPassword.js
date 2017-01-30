import { Meteor } from 'meteor/meteor';
import { expect } from 'meteor/practicalmeteor:chai';

function incorrectPassword(email) {
  return new Promise((resolve) => {
    Meteor.loginWithPassword(
      email,
      'wrong password',
      (err) => {
        expect(err.reason).to.not.eq('Too many attempts');
        resolve();
      });
  });
}

export default incorrectPassword;
