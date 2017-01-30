import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import AccountsLockoutCollection from './accountsLockoutCollection';

class UnknowUser {
  constructor(settings) {
    this.settings = settings;
  }

  startup() {
    this.updateSettings();
    this.scheduleUnlocksForLockedAccounts();
    this.hookIntoAccounts();
  }

  updateSettings() {
    const settings = UnknowUser.unknowUsers();
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
    const lockedAccountsCursor = AccountsLockoutCollection.find(
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
    lockedAccountsCursor.forEach((connection) => {
      let lockDuration = UnknowUser.unlockTime(connection) - currentTime;
      if (lockDuration >= this.settings.lockoutPeriod) {
        lockDuration = this.settings.lockoutPeriod * 1000;
      }
      if (lockDuration <= 1) {
        lockDuration = 1;
      }
      Meteor.setTimeout(
        UnknowUser.unlockAccount.bind(null, connection.clientAddress),
        lockDuration,
      );
    });
  }

  hookIntoAccounts() {
    Accounts.validateLoginAttempt(UnknowUser.validateLoginAttempt.bind(this));
    Accounts.onLogin(UnknowUser.onLogin.bind(this));
    Accounts.onLoginFailure(this.onLoginFailure.bind(this));
  }

  static validateLoginAttempt(loginInfo) {
    // don't interrupt non-password logins
    if (loginInfo.type !== 'password') {
      return loginInfo.allowed;
    }
    if (loginInfo.user) {
      return loginInfo.allowed;
    }
    const currentTime = Number(new Date());
    const unlockTime = UnknowUser.unlockTime(loginInfo.connection);
    if (unlockTime <= currentTime) {
      UnknowUser.unlockAccount(loginInfo.connection.clientAddress);
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
    const clientAddress = loginInfo.connection.clientAddress;
    const query = { clientAddress };
    const data = {
      $unset: {
        'services.accounts-lockout.unlockTime': 0,
        'services.accounts-lockout.failedAttempts': 0,
      },
    };
    AccountsLockoutCollection.update(query, data);
  }


  onLoginFailure(loginInfo) {
    // connection.clientAddress
    if (loginInfo.error.reason === 'Incorrect password') {
      return;
    }
    if (loginInfo.user) {
      return;
    }
    const clientAddress = loginInfo.connection.clientAddress;
    if (this.settings instanceof Function) {
      this.settings = this.settings(loginInfo.connection);
    }
    const unlockTime = UnknowUser.unlockTime(loginInfo.connection);
    if (unlockTime) {
      return;
    }
    let failedAttempts = 1 + UnknowUser.failedAttempts(loginInfo.connection);
    const lastFailedAttempt = UnknowUser.lastFailedAttempt(loginInfo.connection);
    const currentTime = Number(new Date());
    if ((currentTime - lastFailedAttempt) > (1000 * this.settings.failureWindow)) {
      failedAttempts = 1;
    }
    if (failedAttempts < this.settings.failuresBeforeLockout) {
      const query = { clientAddress };
      const data = {
        $set: {
          'services.accounts-lockout.failedAttempts': failedAttempts,
          'services.accounts-lockout.lastFailedAttempt': currentTime,
        },
      };
      AccountsLockoutCollection.upsert(query, data);
      return;
    }
    const newUnlockTime = (1000 * this.settings.lockoutPeriod) + currentTime;
    const query = { clientAddress };
    const data = {
      $set: {
        'services.accounts-lockout.failedAttempts': failedAttempts,
        'services.accounts-lockout.lastFailedAttempt': currentTime,
        'services.accounts-lockout.unlockTime': newUnlockTime,
      },
    };
    AccountsLockoutCollection.upsert(query, data);
    Meteor.setTimeout(
      UnknowUser.unlockAccount.bind(null, clientAddress),
      this.settings.lockoutPeriod * 1000,
    );
  }

  static unknowUsers() {
    let unknowUsers;
    try {
      unknowUsers = Meteor.settings['accounts-lockout'].unknowUsers;
    } catch (e) {
      unknowUsers = false;
    }
    return unknowUsers;
  }

  static findOneByConnection(connection) {
    return AccountsLockoutCollection.findOne({
      clientAddress: connection.clientAddress,
    });
  }

  static unlockTime(connection) {
    connection = UnknowUser.findOneByConnection(connection);
    let unlockTime;
    try {
      unlockTime = connection.services['accounts-lockout'].unlockTime;
    } catch (e) {
      unlockTime = 0;
    }
    return unlockTime;
  }

  static failedAttempts(connection) {
    connection = UnknowUser.findOneByConnection(connection);
    let failedAttempts;
    try {
      failedAttempts = connection.services['accounts-lockout'].failedAttempts;
    } catch (e) {
      failedAttempts = 0;
    }
    return failedAttempts;
  }

  static lastFailedAttempt(connection) {
    connection = UnknowUser.findOneByConnection(connection);
    let lastFailedAttempt;
    try {
      lastFailedAttempt = connection.services['accounts-lockout'].lastFailedAttempt;
    } catch (e) {
      lastFailedAttempt = 0;
    }
    return lastFailedAttempt;
  }

  static unlockAccount(clientAddress) {
    const query = { clientAddress };
    const data = {
      $unset: {
        'services.accounts-lockout.unlockTime': 0,
        'services.accounts-lockout.failedAttempts': 0,
      },
    };
    AccountsLockoutCollection.update(query, data);
  }
}

export default UnknowUser;
