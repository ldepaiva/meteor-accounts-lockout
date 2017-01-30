import KnowUser from './knowUser';
import UnknowUser from './unknowUser';

class AccountsLockout {
  constructor({
    knowUsers = {
      failuresBeforeLockout: 3,
      lockoutPeriod: 60,
      failureWindow: 15,
    },
    unknowUsers = {
      failuresBeforeLockout: 3,
      lockoutPeriod: 60,
      failureWindow: 15,
    },
  }) {
    this.settings = {
      knowUsers,
      unknowUsers,
    };
  }

  startup() {
    (new KnowUser(this.settings.knowUsers)).startup();
    (new UnknowUser(this.settings.unknowUsers)).startup();
  }
}

export default AccountsLockout;
