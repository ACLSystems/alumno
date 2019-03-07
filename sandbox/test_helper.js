const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// Configuration & options
let uri = 'mongodb://localhost/alumno_test';
let options = {
  useMongoClient: true,
  poolSize: 10
};

before((done) => {
  mongoose.connect(uri, options);
  mongoose.connection
    .once('open', () => { done(); })
    .on('error', (error) => {
      console.warn('Error: No pudimos conectarnos :( !', error);
    }
  );
});

beforeEach((done) => {
  const { users, orgs, orgunits } = mongoose.connection.collections;
  // console.log(users);
  // console.log(orgs);
  // console.log(orgunits);

  users.drop(() => {
    orgs.drop(() => {
      orgunits.drop(() => {
        done();
      });
    });
  });

  // listo para correr la siguiente prueba
});
