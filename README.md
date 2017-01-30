# Meteor - Accounts - Lockout

## What it is

Seamless Meteor apps accounts protection from password brute-force attacks.
Users won't notice it. Hackers shall not pass.

## Installation

```
meteor add lucasantoniassi:accounts-lockout
```

## Usage via ES6 import

```javascript
// server
import { AccountsLockout } from 'meteor/lucasantoniassi:accounts-lockout';
```

## How to use?

Default settings:

```javascript
  "knowUsers": {
    "failuresBeforeLockout": 3,
    "lockoutPeriod": 60,
    "failureWindow": 10
  },
  "unknowUsers": {
    "failuresBeforeLockout": 3,
    "lockoutPeriod": 60,
    "failureWindow": 10
  }
```

`knowUsers` are users where already belongs to your `Meteor.users` collections,
these rules are applied if they attempt to login with an incorrect password but a know email.

`unknowUsers` are users where not belongs to your `Meteor.users` collections,
these rules are applied if they attempt to login with a unknow email.


If the `default` is nice to you, you can do that.

```javascript
(new AccountsLockout()).startup();
```

You can overwrite passing an `object` as argument.

```javascript
(new AccountsLockout({
  knowUsers: {
    failuresBeforeLockout: 3,
    lockoutPeriod: 60,
    failureWindow: 15,
  },
  unknowUsers: {
    failuresBeforeLockout: 3,
    lockoutPeriod: 60,
    failureWindow: 15,
  },
})).startup();
```

If you prefer, you can pass a `function` as argument.

```javascript
const knowUsersRules = (user) => {
  // apply some logic with this user
  return {
    failuresBeforeLockout,
    lockoutPeriod,
    failureWindow,
  };
};

const unknowUsersRules = (connection) => {
  // apply some logic with this connection
  return {
    failuresBeforeLockout,
    lockoutPeriod,
    failureWindow,
  };
};

(new AccountsLockout({
  knowUsers: knowUsersRules,
  unknowUsers: unknowUsersRules,
})).startup();
```

If you prefer, you can use `Meteor.settings`.
It will overwrite any previous case.

```javascript
"accounts-lockout": {
  "knowUsers": {
    "failuresBeforeLockout": 3,
    "lockoutPeriod": 60,
    "failureWindow": 10
  },
  "unknowUsers": {
    "failuresBeforeLockout": 3,
    "lockoutPeriod": 60,
    "failureWindow": 10
  }
}
```

