import { Meteor } from 'meteor/meteor';
import { expect } from 'meteor/practicalmeteor:chai';

function incorrectEmail() {
  return new Promise((resolve) => {
    Meteor.loginWithPassword(
      'not-exists@example.com',
      'wrong password',
      (err) => {
        expect(err.reason).to.not.eq('Too many attempts');
        resolve();
      });
  });
}

export default incorrectEmail;
