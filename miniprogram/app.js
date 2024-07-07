App({
  globalData: {
    mqttClient: null,
    userInfo: null,
    lockPassword: '1234',
    mqttClientConnecting: null
  }
});
const password = app.globalData.lockPassword;