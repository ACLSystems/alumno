module.exports = {
  greeting(req, res) {
    res.status(200);
    res.json({ hi: 'greetings'});
  }
};
