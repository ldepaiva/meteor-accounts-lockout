import { meteor } from 'meteor/meteor';
import { accounts } from 'meteor/accounts-base';
import { expect } from 'meteor/practicalmeteor:chai';

function createUser(
  username,
  email,
  password,
) {
  return new Promise((resolve) => {
    Accounts.createUser({
      username,
      email,
      password,
    }, () => {
      const user = Meteor.user();
      expect(user.username).to.eq(username);
      resolve();
    });
  });
}

export default createUser;
