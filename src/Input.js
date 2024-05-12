import { isStarted } from './main';

const Input = function () {};

Input.prototype.setUserExit = function (userExit) {
  // inputSetUserExit(userExit);
};

Input.prototype.isUserExit = function () {
  if (isStarted() === false) {
    return true;
  }

  return false; // inputIsUserExit();
};

Input.prototype.pollEvents = function () {
  return false; // inputPollEvents();
};

Input.prototype.getPressedKeyMap = function () {
  return null; // inputGetPressedKeyMap();
};

export { Input };
