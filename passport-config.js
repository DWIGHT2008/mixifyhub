const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/User'); // Adjust to your user model

module.exports = function (passport) {
  passport.use(new GoogleStrategy({
    clientID: '272010631111-7a165f1i9vsdbfpm099d1b18keekb9sf.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: 'http://localhost:5000/auth/google/callback',
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
        });
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};