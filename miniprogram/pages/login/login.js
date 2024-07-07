Page({
  data: {
    username: '',
    password: ''
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
  handleLogin() {
    const { username, password } = this.data;
    // 模拟登录验证
    const user = wx.getStorageSync('user');
    if (user && user.username === username && user.password === password) {
      wx.setStorageSync('currentUser', user); // 存储当前登录的用户信息
      wx.navigateBack();
    } else {
      wx.showToast({
        title: '用户名或密码错误',
        icon: 'none'
      });
    }
  }
});