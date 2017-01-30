/* eslint-disable no-underscore-dangle */

import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';

class KnowUser {
  constructor(settings) {
    this.settings = settings;
  }

  startup() {
    this.updateSettings();
    this.scheduleUnlocksForLockedAccounts();
    this.hookIntoAccounts();
  }

  updateSettings() {
    const settings = KnowUser.knowUsers();
    if (settings) {
      settings.forEach(function ({ key, value }) {
        this.settings[key] = value;
      });
    }
    if (this.settings.failuresBeforeLockout < 0) {
      throw new Error('"failuresBeforeLockout" is not positive integer');
    }
    if (this.settings.lockoutPeriod < 0) {
      throw new Error('"lockoutPeriod" is not positive integer');
    }
    if (this.settings.failureWindow < 0) {
      throw new Error('"failureWindow" is not positive integer');
    }
  }

  scheduleUnlocksForLockedAccounts() {
    const lockedAccountsCursor = Meteor.users.find(
      {
        'services.accounts-lockout.unlockTime': {
          $gt: Number(new Date()),
        },
      },
      {
        fields: {
          'services.accounts-lockout.unlockTime': 1,
        },
      },
    );
    const currentTime = Number(new Date());
    lockedAccountsCursor.forEach((user) => {
      let lockDuration = KnowUser.unlockTime(user) - currentTime;
      if (lockDuration >= this.settings.lockoutPeriod) {
        lockDuration = this.settings.lockoutPeriod * 1000;
      }
      if (lockDuration <= 1) {
        lockDuration = 1;
      }
      Meteor.setTimeout(
        KnowUser.unlockAccount.bind(null, user._id),
        lockDuration,
      );
    });
  }

  hookIntoAccounts() {
    Accounts.validateLoginAttempt(KnowUser.validateLoginAttempt);
    Accounts.onLogin(KnowUser.onLogin);
    Accounts.onLoginFailure(this.onLoginFailure.bind(this));
  }

  static validateLoginAttempt(loginInfo) {
    // don't interrupt non-password logins
    if (loginInfo.type !== 'password') {
      return loginInfo.allowed;
    }
    if (!loginInfo.user) {
      return loginInfo.allowed;
    }
    const currentTime = Number(new Date());
    const unlockTime = KnowUser.unlockTime(loginInfo.user);
    if (unlockTime <= currentTime) {
      KnowUser.unlockAccount(loginInfo.user._id);
      return loginInfo.allowed;
    }
    if (unlockTime > currentTime) {
      let duration = unlockTime - currentTime;
      duration = Math.ceil(duration / 1000);
      duration = duration > 1 ? duration : 1;
      throw new Meteor.Error(
        403,
        'Too many attempts',
        JSON.stringify({
          message: 'Wrong passwords were submitted too many times. Account is locked for a while.',
          duration,
        }),
      );
    }
    return loginInfo.allowed;
  }

  static onLogin(loginInfo) {
    if (loginInfo.type !== 'password') {
      return;
    }
    const userId = loginInfo.user._id;
    const query = { _id: userId };
    const data = {
      $unset: {
        'services.accounts-lockout.unlockTime': 0,
        'services.accounts-lockout.failedAttempts': 0,
      },
    };
    Meteor.users.update(query, data);
  }


  onLoginFailure(loginInfo) {
    if (loginInfo.error.reason !== 'Incorrect password') {
      return;
    }
    if (!loginInfo.user) {
      return;
    }
    const userId = loginInfo.user._id;
    if (this.settings instanceof Function) {
      this.settings = this.settings(loginInfo.user);
    }
    const unlockTime = KnowUser.unlockTime(loginInfo.user);
    if (unlockTime) {
      return;
    }
    let failedAttempts = 1 + KnowUser.failedAttempts(loginInfo.user);
    const lastFailedAttempt = KnowUser.lastFailedAttempt(loginInfo.user);
    const currentTime = Number(new Date());
    if ((currentTime - lastFailedAttempt) > (1000 * this.settings.failureWindow)) {
      failedAttempts = 1;
    }
    if (failedAttempts < this.settings.failuresBeforeLockout) {
      const query = { _id: userId };
      const data = {
        $set: {
          'services.accounts-lockout.failedAttempts': failedAttempts,
          'services.accounts-lockout.lastFailedAttempt': currentTime,
        },
      };
      Meteor.users.update(query, data);
      return;
    }
    const newUnlockTime = (1000 * this.settings.lockoutPeriod) + currentTime;
    const query = { _id: userId };
    const data = {
      $set: {
        'services.accounts-lockout.failedAttempts': failedAttempts,
        'services.accounts-lockout.lastFailedAttempt': currentTime,
        'services.accounts-lockout.unlockTime': newUnlockTime,
      },
    };
    Meteor.users.update(query, data);
    Meteor.setTimeout(
      KnowUser.unlockAccount.bind(null, loginInfo.user._id),
      this.settings.lockoutPeriod * 1000,
    );
  }

  static knowUsers() {
    let knowUsers;
    try {
      knowUsers = Meteor.settings['accounts-lockout'].knowUsers;
    } catch (e) {
      knowUsers = false;
    }
    return knowUsers;
  }

  static unlockTime(user) {
    let unlockTime;
    try {
      unlockTime = user.services['accounts-lockout'].unlockTime;
    } catch (e) {
      unlockTime = 0;
    }
    return unlockTime;
  }

  static failedAttempts(user) {
    let failedAttempts;
    try {
      failedAttempts = user.services['accounts-lockout'].failedAttempts;
    } catch (e) {
      failedAttempts = 0;
    }
    return failedAttempts;
  }

  static lastFailedAttempt(user) {
    let lastFailedAttempt;
    try {
      lastFailedAttempt = user.services['accounts-lockout'].lastFailedAttempt;
    } catch (e) {
      lastFailedAttempt = 0;
    }
    return lastFailedAttempt;
  }

  static unlockAccount(userId) {
    const query = { _id: userId };
    const data = {
      $unset: {
        'services.accounts-lockout.unlockTime': 0,
        'services.accounts-lockout.failedAttempts': 0,
      },
    };
    Meteor.users.update(query, data);
  }
}

export default KnowUser;
