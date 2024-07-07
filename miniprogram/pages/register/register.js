Page({
  data: {
    username: '',
    password: '',
    confirmPassword: ''
  },
  handleUsernameInput(e) {
    this.setData({
      username: e.detail.value
    });
  },
  handlePasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },
  handleConfirmPasswordInput(e) {
    this.setData({
      confirmPassword: e.detail.value
    });
  },
  handleRegister() {
    const { username, password, confirmPassword } = this.data;
    if (password !== confirmPassword) {
      wx.showToast({
        title: '密码不一致',
        icon: 'none'
      });
      return;
    }
    // 存储用户信息
    wx.setStorageSync('user', { username, password }); // 存储注册的用户信息
    wx.setStorageSync('currentUser', { username, password }); // 设置为当前登录的用户
    wx.showToast({
      title: '注册成功',
      icon: 'success'
    });
    wx.navigateBack();
  }
});