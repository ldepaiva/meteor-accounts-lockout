function testDone(done) {
  return new Promise((resolve) => {
    resolve(done());
  });
}

export default testDone;
