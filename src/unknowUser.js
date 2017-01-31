import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import AccountsLockoutCollection from './accountsLockoutCollection';

class UnknowUser {
  constructor(settings) {
    this.settings = settings;
  }

  startup() {
    if (!(this.settings instanceof Function)) {
      this.updateSettings();
    }
    this.scheduleUnlocksForLockedAccounts();
    UnknowUser.unlockAccountsIfLockoutAlreadyExpired();
    this.hookIntoAccounts();
  }

  updateSettings() {
    const settings = UnknowUser.unknowUsers();
    if (settings) {
      settings.forEach(function ({ key, value }) {
        this.settings[key] = value;
      });
    }
    this.validateSettings();
  }

  validateSettings() {
    if (
      !this.settings.failuresBeforeLockout ||
      this.settings.failuresBeforeLockout < 0
    ) {
      throw new Error('"failuresBeforeLockout" is not positive integer');
    }
    if (
      !this.settings.lockoutPeriod ||
      this.settings.lockoutPeriod < 0
    ) {
      throw new Error('"lockoutPeriod" is not positive integer');
    }
    if (
      !this.settings.failureWindow ||
      this.settings.failureWindow < 0
    ) {
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

  static unlockAccountsIfLockoutAlreadyExpired() {
    const currentTime = Number(new Date());
    const query = {
      'services.accounts-lockout.unlockTime': {
        $lt: currentTime,
      },
    };
    const data = {
      $unset: {
        'services.accounts-lockout.unlockTime': 0,
        'services.accounts-lockout.failedAttempts': 0,
      },
    };
    AccountsLockoutCollection.update(query, data);
  }

  hookIntoAccounts() {
    Accounts.validateLoginAttempt(this.validateLoginAttempt.bind(this));
    Accounts.onLogin(UnknowUser.onLogin);
  }

  validateLoginAttempt(loginInfo) {
    // don't interrupt non-password logins
    if (
      loginInfo.type !== 'password' ||
      loginInfo.user !== undefined ||
      loginInfo.error === undefined ||
      loginInfo.error.reason !== 'User not found'
    ) {
      return loginInfo.allowed;
    }

    if (this.settings instanceof Function) {
      this.settings = this.settings(loginInfo.connection);
      this.validateSettings();
    }

    const clientAddress = loginInfo.connection.clientAddress;
    const unlockTime = UnknowUser.unlockTime(loginInfo.connection);
    let failedAttempts = 1 + UnknowUser.failedAttempts(loginInfo.connection);
    const firstFailedAttempt = UnknowUser.firstFailedAttempt(loginInfo.connection);
    const currentTime = Number(new Date());

    const canReset = (currentTime - firstFailedAttempt) > (1000 * this.settings.failureWindow);
    if (canReset) {
      failedAttempts = 1;
      UnknowUser.resetAttempts(failedAttempts, clientAddress);
    }

    const canIncrement = failedAttempts < this.settings.failuresBeforeLockout;
    if (canIncrement) {
      UnknowUser.incrementAttempts(failedAttempts, clientAddress);
    }

    const maxAttemptsAllowed = this.settings.failuresBeforeLockout;
    const attemptsRemaining = maxAttemptsAllowed - failedAttempts;
    if (unlockTime > currentTime) {
      let duration = unlockTime - currentTime;
      duration = Math.ceil(duration / 1000);
      duration = duration > 1 ? duration : 1;
      UnknowUser.tooManyAttempts(duration);
    }
    if (failedAttempts === maxAttemptsAllowed) {
      this.setNewUnlockTime(failedAttempts, clientAddress);

      let duration = this.settings.lockoutPeriod;
      duration = Math.ceil(duration);
      duration = duration > 1 ? duration : 1;
      return UnknowUser.tooManyAttempts(duration);
    }
    return UnknowUser.userNotFound(
      failedAttempts,
      maxAttemptsAllowed,
      attemptsRemaining,
    );
  }

  static resetAttempts(
    failedAttempts,
    clientAddress,
  ) {
    const currentTime = Number(new Date());
    const query = { clientAddress };
    const data = {
      $set: {
        'services.accounts-lockout.failedAttempts': failedAttempts,
        'services.accounts-lockout.lastFailedAttempt': currentTime,
        'services.accounts-lockout.firstFailedAttempt': currentTime,
      },
    };
    AccountsLockoutCollection.upsert(query, data);
  }

  static incrementAttempts(
    failedAttempts,
    clientAddress,
  ) {
    const currentTime = Number(new Date());
    const query = { clientAddress };
    const data = {
      $set: {
        'services.accounts-lockout.failedAttempts': failedAttempts,
        'services.accounts-lockout.lastFailedAttempt': currentTime,
      },
    };
    AccountsLockoutCollection.upsert(query, data);
  }

  setNewUnlockTime(
    failedAttempts,
    clientAddress,
  ) {
    const currentTime = Number(new Date());
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

  static userNotFound(
    failedAttempts,
    maxAttemptsAllowed,
    attemptsRemaining,
  ) {
    throw new Meteor.Error(
      403,
      'User not found',
      JSON.stringify({
        message: 'User not found',
        failedAttempts,
        maxAttemptsAllowed,
        attemptsRemaining,
      }),
    );
  }

  static tooManyAttempts(duration) {
    throw new Meteor.Error(
      403,
      'Too many attempts',
      JSON.stringify({
        message: 'Wrong emails were submitted too many times. Account is locked for a while.',
        duration,
      }),
    );
  }

  static unknowUsers() {
    let unknowUsers;
    try {
      unknowUsers = Meteor.settings['accounts-lockout'].unknowUsers;
    } catch (e) {
      unknowUsers = false;
    }
    return unknowUsers || false;
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
    return unlockTime || 0;
  }

  static failedAttempts(connection) {
    connection = UnknowUser.findOneByConnection(connection);
    let failedAttempts;
    try {
      failedAttempts = connection.services['accounts-lockout'].failedAttempts;
    } catch (e) {
      failedAttempts = 0;
    }
    return failedAttempts || 0;
  }

  static lastFailedAttempt(connection) {
    connection = UnknowUser.findOneByConnection(connection);
    let lastFailedAttempt;
    try {
      lastFailedAttempt = connection.services['accounts-lockout'].lastFailedAttempt;
    } catch (e) {
      lastFailedAttempt = 0;
    }
    return lastFailedAttempt || 0;
  }

  static firstFailedAttempt(connection) {
    connection = UnknowUser.findOneByConnection(connection);
    let firstFailedAttempt;
    try {
      firstFailedAttempt = connection.services['accounts-lockout'].firstFailedAttempt;
    } catch (e) {
      firstFailedAttempt = 0;
    }
    return firstFailedAttempt || 0;
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

