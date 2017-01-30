/* eslint-disable no-use-before-define */

function spawn(generatorFunc) {
  function continuer(verb, arg) {
    let result;
    try {
      result = generator[verb](arg);
    } catch (err) {
      return Promise.reject(err);
    }
    if (result.done) {
      return result.value;
    }
    return Promise.resolve(result.value).then(onFulfilled, onRejected);
  }
  const generator = generatorFunc();
  const onFulfilled = continuer.bind(continuer, 'next');
  const onRejected = continuer.bind(continuer, 'throw');
  return onFulfilled();
}

export default spawn;
