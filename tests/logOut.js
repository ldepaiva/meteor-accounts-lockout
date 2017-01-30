/* eslint-disable no-unused-expressions */

import { Meteor } from 'meteor/meteor';
import { expect } from 'meteor/practicalmeteor:chai';

function logOut() {
  return new Promise((resolve) => {
    Meteor.logout(() => {
      const user = Meteor.user();
      expect(user).to.be.null;
      resolve();
    });
  });
}

export default logOut;
